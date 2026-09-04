import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { AlarmService, EventService, IAlarm, IEvent, IManagedObject } from '@c8y/client';
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

// Types that require an alarm reference (validateNewServiceRequest routes MAINTENANCE through
// the exact same alarm check as ALARM in the microservice).
const ALARM_REF_TYPES: ServiceRequestType[] = ['alarm', 'maintenance'];
// Types that require an event reference.
const EVENT_REF_TYPES: ServiceRequestType[] = ['note'];

function requireNonEmptyArray(control: AbstractControl): ValidationErrors | null {
  return Array.isArray(control.value) && control.value.length > 0 ? null : { required: true };
}

/** c8y-select's model value: it round-trips the {label, value} wrapper handed to [items], not the raw value. */
interface SelectableItem<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'sr-new-request-form',
  templateUrl: './new-request-form.component.html',
  styleUrls: ['./new-request-form.component.less'],
  standalone: false,
})
export class NewRequestFormComponent implements OnChanges {
  @Input() context: NewRequestContext;

  @Output() created = new EventEmitter<ServiceRequestObject>();
  @Output() cancelled = new EventEmitter<void>();

  readonly typeOptions = TYPE_OPTIONS;

  priorities: ServiceRequestPriority[] = [];
  candidateAlarms: IAlarm[] = [];
  candidateEvents: IEvent[] = [];
  actions: SplitViewAction[] = [];
  busy = false;
  stagedFile: File | null = null;

  // Computed once per candidate load rather than as a template-bound getter — c8y-select tracks
  // selection by object identity against [items], so a getter re-evaluated on every change
  // detection cycle hands it a brand-new array/objects on every tick and the dropdown can never
  // register a click as landing on one of "its" items.
  alarmRefItems: SelectableItem<IAlarm>[] = [];
  eventRefItems: SelectableItem<IEvent>[] = [];

  form = new FormGroup({
    title: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    type: new FormControl<ServiceRequestType>('other'),
    priority: new FormControl<ServiceRequestPriority | null>(null),
    alarmRefs: new FormControl<SelectableItem<IAlarm>[]>([]),
    eventRef: new FormControl<SelectableItem<IEvent> | null>(null),
  });

  constructor(
    private serviceRequestService: ServiceRequestService,
    private serviceRequestMetaService: ServiceRequestMetaService,
    private serviceRequestAttachmentsService: ServiceRequestAttachmentsService,
    private serviceRequestChange: ServiceRequestChangeService,
    private alarmService: AlarmService,
    private eventService: EventService
  ) {
    this.form.get('type').valueChanges.subscribe(() => this.updateReferenceValidators());

    // buildActions() snapshots form.invalid into a plain boolean, so it must be re-run on
    // every edit — otherwise Submit stays enabled/disabled at whatever it was on load.
    this.form.valueChanges.subscribe(() => this.buildActions());
  }

  onFiles(files: PickedFiles): void {
    const dropped = files?.droppedFiles?.shift();

    if (dropped) {
      this.stagedFile = dropped.file;
    }
  }

  get isFromAlarm(): boolean {
    return !!this.context?.fromAlarm;
  }

  /** Whether the selected type requires an alarm reference (FR: alarm/maintenance need one). */
  get requiresAlarmRef(): boolean {
    return !this.isFromAlarm && ALARM_REF_TYPES.includes(this.form.get('type').value);
  }

  /** Whether the selected type requires an event reference (FR: note needs one). */
  get requiresEventRef(): boolean {
    return !this.isFromAlarm && EVENT_REF_TYPES.includes(this.form.get('type').value);
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    // candidateAlarms gets a new array reference on every background alarm/SR poll (or "Show
    // resolved" toggle), which would otherwise re-fire this and wipe out an in-progress form —
    // only a genuinely new create session (a new context) should reset it.
    if (!changes['context']) {
      return;
    }

    const meta = await this.serviceRequestMetaService.fetchMeta(true);

    this.priorities = meta.priorities;
    this.resetForm();
    this.buildActions();
    void this.loadCandidatesFor(this.context?.device ?? null);
  }

  /** Alarm/Event reference candidates (FR-093), scoped to the request's implicit device. */
  private async loadCandidatesFor(device: IManagedObject | null): Promise<void> {
    if (!device) {
      this.candidateAlarms = [];
      this.candidateEvents = [];
      this.alarmRefItems = [];
      this.eventRefItems = [];

      return;
    }

    const [alarms, events] = await Promise.all([
      this.alarmService.list({ source: device.id, dateFrom: '1970-01-01', pageSize: 50, withTotalPages: false }),
      this.eventService.list({ source: device.id, dateFrom: '1970-01-01', pageSize: 50, withTotalPages: false }),
    ]);

    this.candidateAlarms = alarms.data;
    this.candidateEvents = events.data;
    this.alarmRefItems = this.candidateAlarms.map((alarm) => ({ label: alarm.text, value: alarm }));
    this.eventRefItems = this.candidateEvents.map((event) => ({ label: event.text, value: event }));
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

    this.updateReferenceValidators();
    this.stagedFile = null;
  }

  /**
   * Mirrors the microservice's validateNewServiceRequest rules client-side: alarm/maintenance
   * require an alarm reference, note requires an event reference, downtime/other require
   * neither — but the non-required reference stays settable for every type, since the backend
   * only rejects a *missing* required reference, never an extra optional one.
   */
  private updateReferenceValidators(): void {
    const alarmRefsCtrl = this.form.get('alarmRefs');
    const eventRefCtrl = this.form.get('eventRef');

    alarmRefsCtrl.setValidators(this.requiresAlarmRef ? [requireNonEmptyArray] : []);
    eventRefCtrl.setValidators(this.requiresEventRef ? [Validators.required] : []);

    alarmRefsCtrl.updateValueAndValidity();
    eventRefCtrl.updateValueAndValidity();
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
      const alarmRefs = (value.alarmRefs ?? []).map((item) => item.value);
      const eventRef = value.eventRef?.value ?? null;
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

      if (!alarm && eventRef) {
        await this.serviceRequestService.addEventRef(created.id, {
          id: String(eventRef.id),
          uri: eventRef.self,
        });
      }

      if (this.stagedFile) {
        // force=false — this is a brand-new request, so there's nothing to overwrite yet, and
        // the microservice's overwrite path drops the real content type otherwise, which
        // breaks image-preview detection for no reason.
        await this.serviceRequestAttachmentsService.uploadAttachment(created.id, this.stagedFile, false);
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
        disabled: this.form.invalid || this.busy,
        visible: true,
        action: () => this.submit(),
      },
    ];
  }
}
