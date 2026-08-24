import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { IAlarm } from '@c8y/client';
import { AlertService, IconPanelSection, ModalService, SplitViewAction, Status } from '@c8y/ngx-components';
import {
  ServiceRequestAttachment,
  ServiceRequestObject,
  ServiceRequestPriority,
} from '../../../../models/service-request.model';
import { ServiceRequestAttachmentsService } from '../../../../service/service-request-attachments.service';
import { ServiceRequestChangeService } from '../../../../service/service-request-change.service';
import { ServiceRequestMetaService } from '../../../../service/service-request-meta.service';
import { ServiceRequestService } from '../../../../service/service-request.service';

@Component({
  selector: 'sr-detail-panel',
  templateUrl: './sr-detail-panel.component.html',
  styleUrls: ['./sr-detail-panel.component.less'],
  standalone: false,
})
export class SrDetailPanelComponent implements OnChanges {
  @Input() sr: ServiceRequestObject;
  @Input() linkedAlarms: IAlarm[] = [];

  @Output() openAlarm = new EventEmitter<IAlarm>();

  priorities: ServiceRequestPriority[] = [];
  actions: SplitViewAction[] = [];
  busy = false;
  rawJson = '';

  form = new FormGroup({
    title: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    priority: new FormControl<ServiceRequestPriority | null>(null),
  });

  attachmentControl = new FormControl<ServiceRequestAttachment | ServiceRequestAttachment[] | null>(null);

  constructor(
    private serviceRequestService: ServiceRequestService,
    private serviceRequestMetaService: ServiceRequestMetaService,
    private serviceRequestAttachmentsService: ServiceRequestAttachmentsService,
    private serviceRequestChange: ServiceRequestChangeService,
    private alertService: AlertService,
    private modalService: ModalService
  ) {}

  async ngOnChanges(): Promise<void> {
    const meta = await this.serviceRequestMetaService.fetchMeta(true);

    this.priorities = meta.priorities;
    this.resetForm();
    this.rawJson = JSON.stringify(this.sr, null, 2);
    this.buildActions();
  }

  resetForm(): void {
    this.form.reset({
      title: this.sr?.title ?? '',
      description: this.sr?.description ?? '',
      priority: this.currentPriorityOption(),
    });
    this.attachmentControl.setValue(this.sr?.attachment ?? null);

    if (this.sr?.isClosed) {
      this.form.disable();
    } else {
      this.form.enable();
    }
  }

  /**
   * The <select> matches options to the control's value by reference ([ngValue]), so the SR's own
   * priority object (fetched separately from the SR) never matches an option from `this.priorities`
   * even when its name/ordinal are equal — resolve to the array instance instead.
   */
  private currentPriorityOption(): ServiceRequestPriority | null {
    if (!this.sr?.priority) {
      return null;
    }

    return this.priorities.find((p) => p.ordinal === this.sr.priority.ordinal) ?? this.sr.priority;
  }

  async submit(): Promise<void> {
    if (this.form.pristine || this.form.invalid || this.busy) {
      return;
    }

    this.busy = true;

    try {
      const updated = await this.serviceRequestService.update(this.sr.id, {
        title: this.form.value.title,
        description: this.form.value.description,
        priority: this.form.value.priority,
      });

      if (updated) {
        this.sr = updated;
        await this.uploadStagedAttachment();
        this.resetForm();
        this.rawJson = JSON.stringify(this.sr, null, 2);
        this.serviceRequestChange.notifyChange();
      }
    } finally {
      this.busy = false;
      this.buildActions();
    }
  }

  private async uploadStagedAttachment(): Promise<void> {
    const value = this.attachmentControl.value;
    const staged = (Array.isArray(value) ? value : [value]).find((a) => a?.new && a.file);

    if (staged?.file) {
      await this.serviceRequestAttachmentsService.uploadAttachment(this.sr.id, staged.file, true);
    }
  }

  async resolve(): Promise<void> {
    const confirmed = await this.modalService.confirm(
      'Resolve service request',
      'Are you sure you want to resolve this service request?',
      Status.WARNING
    );

    if (!confirmed) {
      return;
    }

    this.busy = true;

    try {
      const updated = await this.serviceRequestService.resolve(this.sr);

      if (updated) {
        this.sr = updated;
        this.resetForm();
        this.rawJson = JSON.stringify(this.sr, null, 2);
        this.serviceRequestChange.notifyChange();
      }
    } finally {
      this.busy = false;
      this.buildActions();
    }
  }

  async copyRawJson(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.rawJson);
      this.alertService.success('Copied to clipboard');
    } catch {
      this.alertService.warning('Could not copy to clipboard');
    }
  }

  fieldServiceSections(): IconPanelSection[] {
    const sr = this.sr;

    if (!sr) {
      return [];
    }

    const schedule =
      sr.fieldScheduleStart || sr.fieldScheduleEnd
        ? `${sr.fieldScheduleStart ? new Date(sr.fieldScheduleStart).toLocaleString() : '?'} &ndash; ${
            sr.fieldScheduleEnd ? new Date(sr.fieldScheduleEnd).toLocaleString() : '?'
          }`
        : '&mdash;';
    const progress = sr.fieldProgressPercentage ?? 0;

    return [
      {
        id: 'assignee',
        label: 'Assignee',
        icon: 'c8y-user',
        visible: true,
        content: `<p>${sr.fieldAssignee ?? '&mdash;'}</p>`,
      },
      {
        id: 'schedule',
        label: 'Scheduled window',
        icon: 'calendar',
        visible: true,
        content: `<p>${schedule}</p>`,
      },
      {
        id: 'due',
        label: 'Due',
        icon: 'clock',
        visible: true,
        content: `<p>${sr.fieldScheduleDue ? new Date(sr.fieldScheduleDue).toLocaleString() : '&mdash;'}</p>`,
      },
      {
        id: 'progress',
        label: 'Progress',
        icon: 'refresh',
        visible: true,
        content: `<div class="progress m-b-0"><div class="progress-bar" role="progressbar" style="width: ${progress}%">${progress}%</div></div>`,
      },
      {
        id: 'fsm-task',
        label: 'FSM task',
        icon: 'link',
        visible: !!sr.fsmLink,
        content: `<p><a href="${sr.fsmLink}" target="_blank" rel="noopener">${sr.fsmLink}</a></p>`,
      },
      {
        id: 'external-id',
        label: 'External ID',
        icon: 'c8y-id',
        visible: !!sr.externalId,
        content: `<p><code>${sr.externalId}</code></p>`,
      },
    ];
  }

  private buildActions(): void {
    const canResolve = this.sr?.isActive && !this.sr?.isClosed;

    this.actions = [
      {
        id: 'reset',
        label: 'Reset',
        icon: 'refresh',
        class: 'btn btn-default btn-sm',
        disabled: this.form.pristine || this.busy,
        visible: true,
        action: () => this.resetForm(),
      },
      {
        id: 'resolve',
        label: 'Resolve',
        icon: 'check-circle',
        class: 'btn btn-danger btn-sm',
        disabled: this.busy,
        visible: canResolve,
        action: () => this.resolve(),
      },
      {
        id: 'update',
        label: 'Update',
        icon: 'save',
        class: 'btn btn-primary btn-sm',
        disabled: this.form.pristine || this.form.invalid || this.busy,
        visible: !this.sr?.isClosed,
        action: () => this.submit(),
      },
    ];
  }
}
