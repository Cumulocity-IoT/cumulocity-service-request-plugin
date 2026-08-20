import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { AlarmService, AlarmStatus, AlarmStatusType, AuditService, IAlarm, IAuditRecord } from '@c8y/client';
import { AlertService, SplitViewAction } from '@c8y/ngx-components';
import { ALARM_DEFAULT_PROPERTIES } from '@c8y/ngx-components/alarms';
import { ServiceRequestObject } from '../../../../models/service-request.model';

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
  busy = false;
  loadingAuditLog = false;
  auditRecords: IAuditRecord[] = [];
  customData: Record<string, unknown> | null = null;

  private lastLoadedAlarmId: string | number | null = null;

  constructor(
    private alarmService: AlarmService,
    private auditService: AuditService,
    private alertService: AlertService
  ) {}

  ngOnChanges(): void {
    this.buildActions();
    this.customData = this.extractCustomData();

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
      this.alertService.warning('Could not load audit log for this alarm');
      console.error('Error loading alarm audit log', error);
    } finally {
      this.loadingAuditLog = false;
    }
  }

  private extractCustomData(): Record<string, unknown> | null {
    if (!this.alarm) {
      return null;
    }

    const defaultProperties: readonly string[] = ALARM_DEFAULT_PROPERTIES;
    const entries = Object.entries(this.alarm as unknown as Record<string, unknown>).filter(
      ([key]) => !defaultProperties.includes(key)
    );

    return entries.length ? Object.fromEntries(entries) : null;
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
