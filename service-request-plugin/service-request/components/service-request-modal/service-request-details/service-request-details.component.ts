import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { IAlarm, IManagedObject } from '@c8y/client';
import { gettext, ModalService, Status } from '@c8y/ngx-components';
import {
  ServiceRequestAttachment,
  ServiceRequestObject,
  ServiceRequestPriority,
  ServiceRequestStatus,
} from '../../../models/service-request.model';
import { ServiceRequestMetaService } from '../../../service/service-request-meta.service';
import { ServiceRequestService } from '../../../service/service-request.service';
import { ServiceRequestAttachmentsService } from '../../../service/service-request-attachments.service';

interface Tab {
  id: string;
  label: string;
  icon?: string;
  active?: boolean;
  disabled?: boolean;
}

@Component({
  selector: 'app-service-request-details',
  templateUrl: './service-request-details.component.html',
  styleUrls: ['./service-request-details.component.less'],
})
export class ServiceRequestDetailsComponent {

  device: IManagedObject;
  alarm?: IAlarm;
  serviceRequest: ServiceRequestObject;
  isEdit = false;

  status: ServiceRequestStatus[] = [{name: 'Default', id: ''}];
  priorities: ServiceRequestPriority[] = [];

  loadingRequest = true;
  loadingComments = false;
  requestFormInAction = false;

  canResolve = false;

  serviceRequestForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    type: new FormControl(''),
    status: new FormControl<ServiceRequestStatus>({ value: null, disabled: true }),
    priority: new FormControl<ServiceRequestPriority>(null),
    attachment: new FormControl<ServiceRequestAttachment | ServiceRequestAttachment[]>(null),

  });

  tabs: Tab[] = [
    {
      id: 'measurements',
      label: 'Measurements',
      icon: 'dlt-c8y-icon-line-chart',
      disabled: true,
    },
    {
      id: 'events',
      label: 'Events',
      icon: 'c8y-icon c8y-icon-events',
      disabled: true,
    },
    {
      id: 'alarms',
      label: 'Alarms',
      icon: 'dlt-c8y-icon-bell',
      active: true,
    },
  ];

  currentTab: Tab['id'] = this.tabs.find((t) => t.active).id;
  close: (cause: any) => void;

  constructor(
    private serviceRequestService: ServiceRequestService,
    private serviceRequestMetaSerivce: ServiceRequestMetaService,
    private modalService: ModalService,
    private serviceRequestAttachmentsService: ServiceRequestAttachmentsService,
  ) {}
 
   async init() {
    this.loadingRequest = true;

    await this.fetchMeta();

    if (!this.isEdit) {
      await this.reset();

      this.serviceRequest.source = {
        id: this.device.id,
        self: this.device.self,
        name: this.device.name,
      };
  
      if (this.alarm) {
        this.serviceRequest.title = this.alarm.text;
        this.serviceRequest.alarmRef = {
          uri: this.alarm.self,
          id: this.alarm.id as string,
        };
      }
  
      this.serviceRequest.status = this.status[0];
      this.serviceRequest.priority = this.priorities[0];
    }

   
    this.setFormValue(this.serviceRequest);
    this.loadingRequest = false;
  }

  private async reset() {    
    this.serviceRequest = this.serviceRequestService.createEmptyServiceRequest();
    this.setFormValue(this.serviceRequest);
  }

  private async fetchMeta(): Promise<void> {
    try {
      const { status, priorities } = await this.serviceRequestMetaSerivce.fetchMeta();
      this.status = status;
      this.priorities = priorities;
    } catch(e) {

    }
  }

  private setFormValue(request: ServiceRequestObject): void {
    if (request) {
      request.priority = this.priorities?.find((p) => p.ordinal == request.priority?.ordinal);
      request.priority ??= this.priorities[0];

      request.status = this.status?.find((p) => p.id == request.status?.id);
      request.status ??= this.status[0];
    }

    this.serviceRequestForm.reset({
      title: request?.title,
      description: request?.description,
      type: request?.type,
      status: request?.status,
      priority: request?.priority,
      attachment: request?.attachment
    });

    if (!this.isEdit) {
      this.serviceRequestForm.get('status').enable();
    } else {
      this.serviceRequestForm.get('status').disable();
    }

    if (this.serviceRequest.status.name !== 'closed') {
      this.canResolve = true;
    }

    if (!request.isActive) {
      this.serviceRequestForm.disable();
      this.canResolve = false;
    }
  }

  async resolve(): Promise<void> {
    if (!this.canResolve || !this.serviceRequest?.id) {
      return;
    }

    const confirmed = await this.modalService.confirm(
      gettext('service-request.action--resolve') as string,
      // TODO translation
      gettext(
        `You are about to resolve a the service request '${this.serviceRequest.title}'`
      ) as string,
      Status.WARNING
    );

    if (!confirmed) {
      return;
    }

    this.requestFormInAction = true;
    try {
      await this.serviceRequestService.resolve(this.serviceRequest);
      this.close(true);
    }  finally {
      this.requestFormInAction = false;
    }
  }

  resetServiceRequestForm(): void {
    this.setFormValue(this.serviceRequest);
    this.serviceRequestForm.markAsPristine();
  }

  async submitServiceRequest(): Promise<void> {
    this.serviceRequestForm.markAllAsTouched();
    this.serviceRequestForm.updateValueAndValidity();

    if (
      (this.isEdit && this.serviceRequestForm.pristine) ||
      this.serviceRequestForm.invalid ||
      this.requestFormInAction
    ) {
      return;
    }

    const formValue = this.serviceRequestForm.value;

    this.requestFormInAction = true;

    let newServiceRequestObject: ServiceRequestObject;

    if (!this.isEdit) {
      newServiceRequestObject = await this.serviceRequestService.create({
        title: formValue.title,
        status: formValue.status,
        priority: formValue.priority,
        description: formValue.description,
        type: this.serviceRequest.type,
        alarmRef: this.serviceRequest.alarmRef,
        customProperties: this.serviceRequest.customProperties,
        eventRef: this.serviceRequest.eventRef,
        seriesRef: this.serviceRequest.seriesRef,
        source: this.serviceRequest.source,
      });

      this.requestFormInAction = false;
    } else {
      newServiceRequestObject = await this.serviceRequestService.update(this.serviceRequest.id, {
        title: formValue.title ?? undefined,
        priority: formValue.priority ?? undefined,
        description: formValue.description ?? undefined,
      });
    }

    if (newServiceRequestObject) {
      if (formValue.attachment) {
        // TODO: if in the future service requests support multiple attachments, this check and the else path is no longer needed
        if (Array.isArray(formValue.attachment)) {
          const tasks = formValue.attachment.map((attachment) => {
            if (attachment.new) {
              return this.serviceRequestAttachmentsService.uploadAttachment(
                newServiceRequestObject.id,
                attachment.file
              );
            }

            if (attachment.delete) {
              // TODO: re-add when delete endpoint is available
              // return this.serviceRequestAttachmentsService.deleteAttachment(
              //   newServiceRequestObject.id,
              //   attachment.file
              // );
            }

            // null will resolve the promise immediately, no filtering or extra steps needed
            return null;
          });

          await Promise.all(tasks);
        } else {
          if (formValue.attachment.new) {
            await this.serviceRequestAttachmentsService.uploadAttachment(
              newServiceRequestObject.id,
              formValue.attachment.file
            );
          }
        }
      }

      
        await this.fetchServiceRequest(newServiceRequestObject.id);

        this.requestFormInAction = false;
        this.close(true);
      }
    
  }

  private async fetchServiceRequest(requestId: ServiceRequestObject['id']): Promise<void> {
    try {
      this.serviceRequest = await this.serviceRequestService.detail(requestId);
      this.setFormValue(this.serviceRequest);
    } catch (error) {
      console.error(error); // TODO temp

      this.reset();
    }
  }

  changeTab(tabId: Tab['id']): void {
    this.tabs.map((t) => {
      t.active = t.id === tabId;
    });
    this.currentTab = tabId;
  }
}
