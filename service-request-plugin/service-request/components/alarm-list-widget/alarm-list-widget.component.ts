import { Component, Input } from "@angular/core";
import { AlarmService, AlarmStatus, IAlarm, IManagedObject, IResultList } from "@c8y/client";
import { set } from "lodash";
import { ServiceRequestModalService } from "../../service/service-request-modal.service";

@Component({
    templateUrl: './alarm-list-widget.component.html'
})
export class AlarmListWidgetComponent {
  device: IManagedObject;


  @Input() set config(value: { device?: {
    id: string,
    name: string,
  }}) {
    if (value && value.device) {
      set(this.filter, 'source', value.device.id);
      this.loadAlarms();
    }
  }

    alarms: IResultList<IAlarm>;
    filterPipe;
    pattern = '';
    selected = { id: null, name: '' };
    checkAll;
  
    private filter: object = {
      withTotalPages: true,
      status: AlarmStatus.ACTIVE,
      revert: true,
      pageSize: 50
    };
  
    constructor(private alarmService: AlarmService, private serviceRequestModal: ServiceRequestModalService) {}
  
    async loadAlarms() {
      this.alarms = await this.alarmService.list(this.filter);
    }

    openServiceRequestModal(alarm: IAlarm): void {
      this.serviceRequestModal.openForAlarm(alarm);
    }
}