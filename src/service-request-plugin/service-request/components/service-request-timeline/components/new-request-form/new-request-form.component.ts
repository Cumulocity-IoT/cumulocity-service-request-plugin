import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { IAlarm } from '@c8y/client';
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
  actions: SplitViewAction[] = [];
  busy = false;
  stagedFile: File | null = null;

  form = new FormGroup({
    title: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    type: new FormControl<ServiceRequestType>('other'),
    priority: new FormControl<ServiceRequestPriority | null>(null),
    alarmRefs: new FormControl<IAlarm[]>([]),
    eventId: new FormControl(''),
  });

  constructor(
    private serviceRequestService: ServiceRequestService,
    private serviceRequestMetaService: ServiceRequestMetaService,
    private serviceRequestAttachmentsService: ServiceRequestAttachmentsService,
    private serviceRequestChange: ServiceRequestChangeService
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

  async ngOnChanges(): Promise<void> {
    const meta = await this.serviceRequestMetaService.fetchMeta(true);

    this.priorities = meta.priorities;
    this.resetForm();
    this.buildActions();
  }

  resetForm(): void {
    const alarm = this.context?.fromAlarm;

    this.form.reset({
      title: alarm?.text ?? '',
      description: '',
      type: alarm ? 'alarm' : 'other',
      priority: this.priorities[0] ?? null,
      alarmRefs: [],
      eventId: '',
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

      if (!alarm && value.eventId) {
        await this.serviceRequestService.addEventRef(created.id, { id: value.eventId });
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
