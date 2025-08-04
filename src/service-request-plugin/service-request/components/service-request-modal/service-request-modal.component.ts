import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { IAlarm, IManagedObject } from '@c8y/client';
import { ServiceRequestDetailsComponent } from './service-request-details/service-request-details.component';

@Component({
  standalone: false,
  template: `<c8y-modal
    [title]="'Service Request' | translate"
    (onClose)="onClose()"
    (onDismiss)="onDismiss()"
    [customFooter]="true"
  >
    <div class="d-block p-24">
      <app-service-request-details
        #requestDetails
      ></app-service-request-details>
    </div>
  </c8y-modal>`,
})
export class ServiceRequestModalComponent implements OnInit {
  closeSubject: Subject<boolean> = new Subject();

  @ViewChild(ServiceRequestDetailsComponent, { static: true })
  requestDetails!: ServiceRequestDetailsComponent;

  constructor(public modal: BsModalRef) {}

  ngOnInit(): void {
    this.requestDetails.close = (cause: any) => {
      this.closeModal(cause);
    };
  }

  onDismiss() {
    // called if cancel is pressed
    this.closeSubject.next(false);
  }

  onClose() {
    // called if save is pressed
    this.closeSubject.next(false);
  }

  private closeModal(cause: any): void {
    this.closeSubject.next(cause);
    this.closeSubject.complete();
    this.modal.hide();
  }
}
