import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { AlarmService, AlarmStatus, AlarmStatusType, AuditService, IAlarm, IAuditRecord } from '@c8y/client';
import { AlertService, IconPanelSection, SplitViewAction } from '@c8y/ngx-components';
import { ServiceRequestObject } from '../../../../models/service-request.model';

const ALARM_STANDARD_FRAGMENTS = [
  'severity',
  'source',
  'type',
  'time',
  'text',
  'id',
  'status',
  'count',
  'name',
  'history',
  'self',
  'creationTime',
  'firstOccurrenceTime',
  'lastUpdated',
];

const SEVERITY_ICON: Record<string, string> = {
  CRITICAL: 'exclamation-circle',
  MAJOR: 'warning',
  MINOR: 'high-priority',
  WARNING: 'circle',
};

const STATUS_ICON: Record<string, string> = {
  ACTIVE: 'bell',
  ACKNOWLEDGED: 'bell-slash',
  CLEARED: 'check-circle',
};

@Component({
  selector: 'sr-alarm-detail-panel',
  templateUrl: './alarm-detail-panel.component.html',
  styleUrls: ['./alarm-detail-panel.component.less'],
  standalone: false,
})
export class AlarmDetailPanelComponent implements OnChanges {
  @Input() alarm: IAlarm;
  @Input() linkedSr: ServiceRequestObject | null = null;

  @Output() openSr = new EventEmitter<ServiceRequestObject>();
  @Output() createRequest = new EventEmitter<IAlarm>();
  @Output() linkExisting = new EventEmitter<IAlarm>();
  @Output() alarmChanged = new EventEmitter<void>();

  actions: SplitViewAction[] = [];
  infoSections: IconPanelSection[] = [];
  busy = false;
  loadingAuditLog = false;
  auditRecords: IAuditRecord[] = [];

  private lastLoadedAlarmId: string | number | null = null;

  constructor(
    private alarmService: AlarmService,
    private auditService: AuditService,
    private alertService: AlertService
  ) {}

  ngOnChanges(): void {
    this.buildActions();
    this.buildInfoSections();

    if (this.alarm && this.alarm.id !== this.lastLoadedAlarmId) {
      this.lastLoadedAlarmId = this.alarm.id;
      void this.loadAuditLog();
    }
  }

  openLinkedSr(): void {
    if (this.linkedSr) {
      this.openSr.emit(this.linkedSr);
    }
  }

  private async loadAuditLog(): Promise<void> {
    this.loadingAuditLog = true;

    try {
      const { data } = await this.auditService.list({ source: this.alarm.id, pageSize: 30 });

      this.auditRecords = data;
    } catch (error) {
      console.error('Error loading alarm audit log', error);
    } finally {
      this.loadingAuditLog = false;
    }
  }

  private buildInfoSections(): void {
    const alarm = this.alarm;

    if (!alarm) {
      this.infoSections = [];

      return;
    }

    const severity = String(alarm.severity ?? '');
    const status = String(alarm.status ?? '');
    const customData = Object.fromEntries(
      Object.entries(alarm as unknown as Record<string, unknown>).filter(
        ([key]) => !ALARM_STANDARD_FRAGMENTS.includes(key)
      )
    );

    this.infoSections = [
      {
        id: 'status',
        label: 'Status',
        icon: STATUS_ICON[status] ?? 'bell',
        visible: true,
        content: `<p>${status}</p>`,
      },
      {
        id: 'severity',
        label: 'Severity',
        icon: SEVERITY_ICON[severity] ?? 'circle',
        iconClass: `status ${severity.toLowerCase()} stroked-icon`,
        visible: true,
        content: `<p>${severity}</p>`,
      },
      {
        id: 'source',
        label: 'Source',
        icon: 'hardware',
        visible: !!alarm.source,
        content: `<p><a href="#/device/${alarm.source?.id}">${alarm.source?.name ?? ''}</a></p>`,
      },
      {
        id: 'type',
        label: 'Type',
        icon: 'tag',
        visible: true,
        content: `<p><code>${alarm.type}</code></p>`,
      },
      {
        id: 'occurrences',
        label: 'Number of occurrences',
        icon: 'refresh',
        visible: true,
        content: `<p>${alarm.count || 1}</p>`,
      },
      {
        id: 'first-occurrence',
        label: 'First occurrence',
        icon: 'calendar',
        visible: !!alarm.firstOccurrenceTime,
        content: `<p>${alarm.firstOccurrenceTime ? new Date(alarm.firstOccurrenceTime).toLocaleString() : ''}</p>`,
      },
      {
        id: 'custom-data',
        label: 'Custom data',
        icon: 'outgoing-data',
        visible: Object.keys(customData).length > 0,
        content: `<pre><code>${JSON.stringify(customData, null, 2)}</code></pre>`,
        colClass: 'col-xs-12',
      },
    ];
  }

  private buildActions(): void {
    const isCleared = this.alarm?.status === AlarmStatus.CLEARED;
    const isAcknowledged = this.alarm?.status === AlarmStatus.ACKNOWLEDGED;

    this.actions = [
      {
        id: 'acknowledge',
        label: isAcknowledged ? 'Reactivate' : 'Acknowledge',
        icon: isAcknowledged ? 'bell' : 'bell-slash',
        class: 'btn-default',
        disabled: isCleared || this.busy,
        visible: true,
        action: () => this.toggleAcknowledge(),
      },
      {
        id: 'clear',
        label: 'Clear',
        icon: 'check-circle',
        class: 'btn-default',
        disabled: isCleared || this.busy,
        visible: true,
        action: () => this.clear(),
      },
      {
        id: 'create-request',
        label: 'Create service request',
        icon: 'plus-circle',
        class: 'btn-default',
        disabled: this.busy,
        visible: !this.linkedSr,
        action: () => this.createRequest.emit(this.alarm),
      },
      {
        id: 'link-existing',
        label: 'Add existing service request',
        icon: 'link',
        class: 'btn-default',
        disabled: this.busy,
        visible: !this.linkedSr,
        action: () => this.linkExisting.emit(this.alarm),
      },
    ];
  }

  private async toggleAcknowledge(): Promise<void> {
    const nextStatus =
      this.alarm.status === AlarmStatus.ACKNOWLEDGED ? AlarmStatus.ACTIVE : AlarmStatus.ACKNOWLEDGED;

    await this.updateStatus(nextStatus);
  }

  private async clear(): Promise<void> {
    await this.updateStatus(AlarmStatus.CLEARED);
  }

  private async updateStatus(status: AlarmStatusType): Promise<void> {
    this.busy = true;

    try {
      const { data } = await this.alarmService.update({ id: this.alarm.id, status });

      if (data) {
        this.alarm = { ...this.alarm, status: data.status };
        this.alertService.success('Alarm updated');
        this.alarmChanged.emit();
      }
    } catch (error) {
      this.alertService.danger('Alarm could not be updated', error as string);
    } finally {
      this.busy = false;
      this.buildActions();
    }
  }
}
