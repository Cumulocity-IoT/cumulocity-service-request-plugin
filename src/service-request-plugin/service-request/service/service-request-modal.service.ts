import { BsModalService } from 'ngx-bootstrap/modal';
import { ServiceRequestModalComponent } from '../components/service-request-modal/service-request-modal.component';
import { IAlarm, IManagedObject, InventoryService } from '@c8y/client';
import { take } from 'rxjs/operators';
import { ServiceRequestObject } from '../models/service-request.model';
import { cloneDeep } from 'lodash';
import { ServiceRequestService } from './service-request.service';
import { Injectable } from '@angular/core';
import { ServiceRequestDetailsComponent } from '../components/service-request-modal/service-request-details/service-request-details.component';
import { Subject } from 'rxjs';

@Injectable({providedIn: 'root'})
export class ServiceRequestModalService {

    changeSubject = new Subject<void>()
    change$ = this.changeSubject.asObservable();
    
    constructor(
        private bsModalService: BsModalService, 
        private inventory: InventoryService, 
        private serviceRequestService: ServiceRequestService) {}
    

    async openForAlarm(alarm: IAlarm) {
        const modalRef = this.bsModalService.show(ServiceRequestModalComponent, {
            class: "modal-lg",
        });
        
        const requestDetailsComp =  modalRef.content?.requestDetails;

        if (!requestDetailsComp) {
            return undefined;
        }

        requestDetailsComp.alarm = alarm;
        requestDetailsComp.device = (await this.inventory.detail(alarm.source.id)).data;
        requestDetailsComp.init();

        return modalRef.content?.closeSubject.pipe(take(1)).toPromise().then(didChange => {
            if (didChange) {
                this.changeSubject.next();
            }
            return didChange;
        });
    }

    openForDevice(device: IManagedObject) {
        const modalRef = this.bsModalService.show(ServiceRequestModalComponent, {
            class: "modal-lg",
        });
        
        const requestDetailsComp =  modalRef.content?.requestDetails;

        if (!requestDetailsComp) {
            return undefined;
        }

        requestDetailsComp.device = device;
        requestDetailsComp.init();
        return modalRef.content?.closeSubject.pipe(take(1)).toPromise().then(didChange => {
            if (didChange) {
                this.changeSubject.next();
            }
            return didChange;
        });
      }

    private async resolveServiceRequest(serviceRequest: ServiceRequestObject, requestDetailsComp: ServiceRequestDetailsComponent) {
        const inventory = this.inventory.detail(serviceRequest.source?.id!)
            .then(res => requestDetailsComp.device = res.data);
        await inventory;
        return serviceRequest;
    }

    async open(serviceRequest: ServiceRequestObject) {
        const modalRef = this.bsModalService.show(ServiceRequestModalComponent, {
            class: "modal-lg",
          });

        const requestDetailsComp =  modalRef.content?.requestDetails;

        if (!requestDetailsComp) {
            return undefined;
        }

        requestDetailsComp.isEdit = true;
        requestDetailsComp.serviceRequest = await this.resolveServiceRequest(cloneDeep(serviceRequest), requestDetailsComp);
        requestDetailsComp.init();

        return modalRef.content?.closeSubject.pipe(take(1)).toPromise().then(didChange => {
            if (didChange) {
                this.changeSubject.next();
            }
            return didChange;
        });
    }
}