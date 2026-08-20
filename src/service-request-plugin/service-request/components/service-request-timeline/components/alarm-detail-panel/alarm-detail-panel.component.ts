import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { AlarmService, AlarmStatus, AlarmStatusType, IAlarm } from '@c8y/client';
import { AlertService, SplitViewAction } from '@c8y/ngx-components';
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

  constructor(private alarmService: AlarmService, private alertService: AlertService) {}

  ngOnChanges(): void {
    this.buildActions();
  }

  openLinkedSr(): void {
    if (this.linkedSr) {
      this.openSr.emit(this.linkedSr);
    }
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
