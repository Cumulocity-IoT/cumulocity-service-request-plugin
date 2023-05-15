import { Component, Input } from "@angular/core";
import { AlarmService, AlarmStatus, IAlarm, IManagedObject, IResultList, InventoryService } from "@c8y/client";
import { set } from "lodash";
import { take } from "rxjs/operators";
import { BsModalService } from "ngx-bootstrap/modal";
import { ServiceRequestModalComponent } from "../service-request-modal/service-request-modal.component";

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
     this.loadDevice(value.device);
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
  
    constructor(private alarmService: AlarmService, private bsModalService: BsModalService, private inventory: InventoryService) {
      
    }

    async loadDevice(device: {id: string}) {
      this.device = (await this.inventory.detail(device)).data;
    }
  
    async loadAlarms() {
      this.alarms = await this.alarmService.list(this.filter);
    }

    openServiceRequestModal(alarm: IAlarm): void {
      const modalRef = this.bsModalService.show(ServiceRequestModalComponent, {
        class: "modal-lg",
      });
      modalRef.content.requestDetails.alarm = alarm;
      modalRef.content.requestDetails.device = this.device;
      modalRef.content.requestDetails.init();
      modalRef.content.closeSubject.pipe(take(1)).subscribe();
    }
}