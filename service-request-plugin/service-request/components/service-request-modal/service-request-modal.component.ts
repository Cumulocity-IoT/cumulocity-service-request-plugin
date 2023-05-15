import { Component, ElementRef, ViewChild } from "@angular/core";
import { Subject } from "rxjs";
import { BsModalRef } from "ngx-bootstrap/modal";
import { IAlarm, IManagedObject } from "@c8y/client";
import { ServiceRequestDetailsComponent } from "./service-request-details/service-request-details.component";


@Component({
    template: `<c8y-modal
    [title]="'Run Summary' | translate"
    (onClose)="onClose()"
    (onDismiss)="onDismiss()"
    [customFooter]="true"
  >
  <div class="d-block p-24">
    <app-service-request-details #requestDetails
  ></app-service-request-details>
  </div>
  </c8y-modal>`
})
export class ServiceRequestModalComponent {
    closeSubject: Subject<void> = new Subject();
    @ViewChild(ServiceRequestDetailsComponent, {static: true}) requestDetails: ServiceRequestDetailsComponent;

    constructor( public modal: BsModalRef) {}

    onDismiss() {
      // called if cancel is pressed
      this.closeSubject.next(null);
    }
  
    onClose() {
      // called if save is pressed
      this.closeSubject.next();
    }

    private closeModal(): void {
        this.closeSubject.next();
        this.closeSubject.complete();
        this.modal.hide();
      }
}