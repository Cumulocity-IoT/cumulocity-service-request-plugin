import { BsModalService } from 'ngx-bootstrap/modal';
import { IAlarm, IManagedObject, InventoryService } from '@c8y/client';
import { take } from 'rxjs/operators';
import { ServiceRequestObject } from '../models/service-request.model';
import { cloneDeep } from 'lodash';
import { Injectable } from '@angular/core';
import { ServiceRequestDetailsComponent } from '../components/service-request-modal/service-request-details/service-request-details.component';
import { firstValueFrom, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ServiceRequestModalService {
  changeSubject = new Subject<void>();
  change$ = this.changeSubject.asObservable();

  constructor(
    private bsModalService: BsModalService,
    private inventory: InventoryService
  ) {}

  async openForAlarm(alarm: IAlarm) {
    if (!alarm) {
      throw new Error('Alarm is required to open service request modal');
    }

    const modalRef = this.bsModalService.show(ServiceRequestDetailsComponent, {
      class: 'modal-lg',
      initialState: {
        device: (await this.inventory.detail(alarm.source.id)).data,
        alarm,
      },
    });

    const closeSubject = modalRef.content?.closeSubject;
    if (!closeSubject) {
      return undefined;
    }

    return firstValueFrom(closeSubject.pipe(take(1))).then((didChange) => {
      if (didChange) {
        this.changeSubject.next();
      }

      modalRef.hide();

      return didChange;
    });
  }

  openForDevice(device: IManagedObject) {
    const modalRef = this.bsModalService.show(ServiceRequestDetailsComponent, {
      class: 'modal-lg',
      initialState: {
        device,
      },
    });

    const closeSubject = modalRef.content?.closeSubject;
    if (!closeSubject) {
      return undefined;
    }

    return firstValueFrom(closeSubject.pipe(take(1))).then((didChange) => {
      if (didChange) {
        this.changeSubject.next();
      }

      modalRef.hide();

      return didChange;
    });
  }

  async open(serviceRequest: ServiceRequestObject) {
    if (!serviceRequest) {
      throw new Error('Service request is required to open modal');
    }

    const modalRef = this.bsModalService.show(ServiceRequestDetailsComponent, {
      class: 'modal-lg',
      initialState: {
        serviceRequest: cloneDeep(serviceRequest),
        device: (await this.inventory.detail(serviceRequest.source?.id!)).data,
        isEdit: true,
      },
    });

    const closeSubject = modalRef.content?.closeSubject;
    if (!closeSubject) {
      return undefined;
    }

    return firstValueFrom(closeSubject.pipe(take(1))).then((didChange) => {
      if (didChange) {
        this.changeSubject.next();
      }

      modalRef.hide();

      return didChange;
    });
  }
}
