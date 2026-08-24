import { Component, Input, OnChanges } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
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
  ) {
    // Attaching a file must persist immediately rather than waiting for the (unrelated)
    // title/description/priority form to be submitted — that form's dirty-gated Update button
    // never enables from an attachment change alone, since attachmentControl isn't part of it.
    this.attachmentControl.valueChanges.subscribe((value) => void this.handleAttachmentChange(value));
  }

  async ngOnChanges(): Promise<void> {
    const meta = await this.serviceRequestMetaService.fetchMeta(true);

    this.priorities = meta.priorities;

    // The timeline's list fetch doesn't reliably carry every field (e.g. attachment) that the
    // single-request detail endpoint does, so re-fetch the authoritative record on selection
    // rather than trusting whatever projection the list happened to return.
    const detail = await this.serviceRequestService.detail(this.sr.id);

    if (detail) {
      this.sr = detail;
    }

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
        this.resetForm();
        this.rawJson = JSON.stringify(this.sr, null, 2);
        this.serviceRequestChange.notifyChange();
      }
    } finally {
      this.busy = false;
      this.buildActions();
    }
  }

  /**
   * Fires on every attachmentControl value change (including our own resetForm-driven
   * setValue calls), but only a genuinely newly-picked file has new:true, so anything else
   * is a no-op — see uploadServiceRequestAttachment:
   * https://github.com/Cumulocity-IoT/cumulocity-microservice-service-request-mgmt/blob/develop/docs/Apis/ServiceRequestControllerApi.md#uploadservicerequestattachment
   */
  private async handleAttachmentChange(
    value: ServiceRequestAttachment | ServiceRequestAttachment[] | null
  ): Promise<void> {
    const staged = (Array.isArray(value) ? value : [value]).find((a) => a?.new && a.file);

    if (!staged?.file || this.busy || !this.sr?.id) {
      return;
    }

    this.busy = true;
    this.buildActions();

    try {
      const uploaded = await this.serviceRequestAttachmentsService.uploadAttachment(
        this.sr.id,
        staged.file,
        true
      );

      if (uploaded) {
        const detail = await this.serviceRequestService.detail(this.sr.id);

        if (detail) {
          this.sr = detail;
          this.rawJson = JSON.stringify(this.sr, null, 2);
        }

        // emitEvent: false — this is a programmatic reset back to the persisted attachment,
        // not a new user pick, so it must not re-enter this same handler.
        this.attachmentControl.setValue(this.sr?.attachment ?? null, { emitEvent: false });
        this.serviceRequestChange.notifyChange();
      }
    } finally {
      this.busy = false;
      this.buildActions();
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
