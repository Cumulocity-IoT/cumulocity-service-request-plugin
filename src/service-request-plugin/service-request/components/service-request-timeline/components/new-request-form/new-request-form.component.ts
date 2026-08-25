import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { EventService, IAlarm, IEvent } from '@c8y/client';
import { PickedFiles, SplitViewAction } from '@c8y/ngx-components';
import {
  ServiceRequestObject,
  ServiceRequestPriority,
  ServiceRequestType,
} from '../../../../models/service-request.model';
import { ServiceRequestAttachmentsService } from '../../../../service/service-request-attachments.service';
import { ServiceRequestChangeService } from '../../../../service/service-request-change.service';
import { ServiceRequestMetaService } from '../../../../service/service-request-meta.service';
import { ServiceRequestService } from '../../../../service/service-request.service';
import { NewRequestContext } from '../../models/service-request-timeline.model';

const TYPE_OPTIONS: ServiceRequestType[] = ['alarm', 'note', 'maintenance', 'downtime', 'other'];

@Component({
  selector: 'sr-new-request-form',
  templateUrl: './new-request-form.component.html',
  styleUrls: ['./new-request-form.component.less'],
  standalone: false,
})
export class NewRequestFormComponent implements OnChanges {
  @Input() context: NewRequestContext;
  @Input() candidateAlarms: IAlarm[] = [];

  @Output() created = new EventEmitter<ServiceRequestObject>();
  @Output() cancelled = new EventEmitter<void>();

  readonly typeOptions = TYPE_OPTIONS;

  priorities: ServiceRequestPriority[] = [];
  candidateEvents: IEvent[] = [];
  actions: SplitViewAction[] = [];
  busy = false;
  stagedFile: File | null = null;

  form = new FormGroup({
    title: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    type: new FormControl<ServiceRequestType>('other'),
    priority: new FormControl<ServiceRequestPriority | null>(null),
    alarmRefs: new FormControl<IAlarm[]>([]),
    eventRef: new FormControl<IEvent | null>(null),
  });

  constructor(
    private serviceRequestService: ServiceRequestService,
    private serviceRequestMetaService: ServiceRequestMetaService,
    private serviceRequestAttachmentsService: ServiceRequestAttachmentsService,
    private serviceRequestChange: ServiceRequestChangeService,
    private eventService: EventService
  ) {}

  onFiles(files: PickedFiles): void {
    const dropped = files?.droppedFiles?.shift();

    if (dropped) {
      this.stagedFile = dropped.file;
    }
  }

  get isFromAlarm(): boolean {
    return !!this.context?.fromAlarm;
  }

  get alarmRefItems(): { label: string; value: IAlarm }[] {
    return this.candidateAlarms.map((alarm) => ({ label: alarm.text, value: alarm }));
  }

  get eventRefItems(): { label: string; value: IEvent }[] {
    return this.candidateEvents.map((event) => ({ label: event.text, value: event }));
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    // candidateAlarms gets a new array reference on every background alarm/SR poll (or "Show
    // resolved" toggle), which would otherwise re-fire this and wipe out an in-progress form —
    // only a genuinely new create session (a new context) should reset it.
    if (!changes['context']) {
      return;
    }

    const [meta] = await Promise.all([
      this.serviceRequestMetaService.fetchMeta(true),
      this.loadCandidateEvents(),
    ]);

    this.priorities = meta.priorities;
    this.resetForm();
    this.buildActions();
  }

  private async loadCandidateEvents(): Promise<void> {
    const device = this.context?.device;

    if (!device) {
      this.candidateEvents = [];

      return;
    }

    const { data } = await this.eventService.list({
      source: device.id,
      dateFrom: '1970-01-01',
      pageSize: 50,
      withTotalPages: false,
    });

    this.candidateEvents = data;
  }

  resetForm(): void {
    const alarm = this.context?.fromAlarm;

    this.form.reset({
      title: alarm?.text ?? '',
      description: '',
      type: alarm ? 'alarm' : 'other',
      priority: this.priorities[0] ?? null,
      alarmRefs: [],
      eventRef: null,
    });

    if (alarm) {
      this.form.get('type').disable();
    } else {
      this.form.get('type').enable();
    }

    this.stagedFile = null;
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.busy) {
      return;
    }

    this.busy = true;
    this.buildActions();

    try {
      const value = this.form.getRawValue();
      const alarm = this.context.fromAlarm;
      const device = this.context.device;
      const alarmRefs = value.alarmRefs ?? [];
      const firstAlarmRef = alarm
        ? { id: String(alarm.id), uri: alarm.self }
        : alarmRefs[0]
        ? { id: String(alarmRefs[0].id), uri: alarmRefs[0].self }
        : undefined;

      const created = await this.serviceRequestService.create({
        type: value.type,
        title: value.title,
        description: value.description || undefined,
        priority: value.priority ?? undefined,
        source: { id: String(device.id), self: device.self, name: device['name'] },
        alarmRef: firstAlarmRef,
      });

      if (!created) {
        return;
      }

      const remainingAlarmRefs = alarm ? [] : alarmRefs.slice(1);

      for (const ref of remainingAlarmRefs) {
        await this.serviceRequestService.addAlarmRef(created.id, { id: String(ref.id), uri: ref.self });
      }

      if (!alarm && value.eventRef) {
        await this.serviceRequestService.addEventRef(created.id, {
          id: String(value.eventRef.id),
          uri: value.eventRef.self,
        });
      }

      if (this.stagedFile) {
        await this.serviceRequestAttachmentsService.uploadAttachment(created.id, this.stagedFile, true);
      }

      this.serviceRequestChange.notifyChange();
      this.created.emit(created);
    } finally {
      this.busy = false;
      this.buildActions();
    }
  }

  private buildActions(): void {
    this.actions = [
      {
        id: 'cancel',
        label: 'Cancel',
        icon: 'close',
        class: 'btn btn-default btn-sm',
        disabled: this.busy,
        visible: true,
        action: () => this.cancelled.emit(),
      },
      {
        id: 'submit',
        label: 'Submit',
        icon: 'plus-circle',
        class: 'btn btn-primary btn-sm',
        disabled: this.busy,
        visible: true,
        action: () => this.submit(),
      },
    ];
  }
}
