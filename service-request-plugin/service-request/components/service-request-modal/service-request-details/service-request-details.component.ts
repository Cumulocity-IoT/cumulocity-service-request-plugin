import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IAlarm, IManagedObject, InventoryService } from '@c8y/client';
import { gettext, ModalService, Status } from '@c8y/ngx-components';
import {
  ServiceRequestComment,
  ServiceRequestForm,
  ServiceRequestObject,
  ServiceRequestPriority,
  ServiceRequestStatus,
} from '../../../models/service-request.model';
import { ServiceRequestMetaService } from '../../../service/service-request-meta.service';
import { ServiceRequestService } from '../../../service/service-request.service';
import { Subscription } from 'rxjs';

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
export class ServiceRequestDetailsComponent implements OnDestroy {
  private sub: Subscription;

  device: IManagedObject;
  alarm?: IAlarm;
  serviceRequestId: string;

  serviceRequest: ServiceRequestObject;

  comments: ServiceRequestComment[] = [];
  status: ServiceRequestStatus[] = [{name: 'Default', id: ''}];
  priorities: ServiceRequestPriority[] = [];

  loadingRequest = true;
  loadingComments = false;
  requestFormInAction = false;
  commentFormInAction = false;

  canResolve = false;

  serviceRequestForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    type: new FormControl(''),
    status: new FormControl<ServiceRequestStatus>({ value: null, disabled: true }),
    priority: new FormControl<ServiceRequestPriority>(null),
  });

  commentForm = new FormGroup({
    text: new FormControl('', [Validators.required]),
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

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private serviceRequestService: ServiceRequestService,
    private serviceRequestMetaSerivce: ServiceRequestMetaService,
    private inventory: InventoryService,
    private modalService: ModalService
  ) {}
 
   async init() {
    this.loadingRequest = true;

    await this.reset();

    this.serviceRequest.title = '';

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

    this.setFormValue(this.serviceRequest);

    if (this.serviceRequestId) {
      await this.fetchServiceRequest(this.serviceRequestId);
    }

    this.loadingRequest = false;
  }

  private async reset() {
    await this.fetchMeta();
    this.serviceRequest = this.serviceRequestService.createEmptyServiceRequest();
    this.comments = [];

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
      request.priority = this.priorities.find((p) => p.ordinal == request.priority?.ordinal);
      request.priority ??= this.priorities[0];

      request.status = this.status.find((p) => p.id == request.status?.id);
      request.status ??= this.status[0];
    }

    this.serviceRequestForm.reset({
      title: request?.title,
      description: request?.description,
      type: request?.type,
      status: request?.status,
      priority: request?.priority,
    });

    if (!this.serviceRequestId) {
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

  private async fetchComments(id: string): Promise<ServiceRequestComment[]> {
    this.loadingComments = true;
    this.comments = await this.serviceRequestService.commentList(id);
    this.loadingComments = false;

    return this.comments;
  }

  private async fetchServiceRequest(serviceRequestId: string): Promise<void> {
    try {
      this.loadingRequest = true;
      this.serviceRequest = await this.serviceRequestService.detail(serviceRequestId);
      this.device = (await this.inventory.detail(this.serviceRequest.source.id)).data;
      this.setFormValue(this.serviceRequest);
      await this.fetchComments(this.serviceRequest.id);
    } catch (error) {
      console.error(error); // TODO temp
      this.reset();
    } finally {
      this.loadingRequest = false;
    }
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
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
    const resolvedServiceRequestObject = await this.serviceRequestService.resolve(
      this.serviceRequest
    );

    this.requestFormInAction = false;

    if (resolvedServiceRequestObject) {
      await this.router.navigate(['./'], {
        relativeTo: this.route,
      });
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
      this.serviceRequestForm.pristine ||
      this.serviceRequestForm.invalid ||
      this.requestFormInAction
    ) {
      return;
    }

    const formValue = this.serviceRequestForm.value;

    this.requestFormInAction = true;

    let newServiceRequestObject: ServiceRequestObject;

    if (!this.serviceRequestId) {
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

      if (newServiceRequestObject) {
        await this.router.navigate(['./' + newServiceRequestObject.id], {
          relativeTo: this.route,
        });
      }
    } else {
      newServiceRequestObject = await this.serviceRequestService.update(this.serviceRequest.id, {
        title: formValue.title ?? undefined,
        priority: formValue.priority ?? undefined,
        description: formValue.description ?? undefined,
      });
    }

    this.requestFormInAction = false;

    this.setFormValue(newServiceRequestObject);
  }

  async submitComment(): Promise<void> {
    const formValue = this.commentForm.value as ServiceRequestForm;

    if (!formValue?.text || this.commentFormInAction) {
      return;
    }

    this.commentFormInAction = true;

    await this.serviceRequestService.commentCreate(this.serviceRequest.id, {
      text: formValue?.text,
      type: 'user',
    });

    this.commentFormInAction = false;

    this.commentForm.reset({
      text: '',
    });

    await this.fetchComments(this.serviceRequest.id);
  }

  changeTab(tabId: Tab['id']): void {
    this.tabs.map((t) => {
      t.active = t.id === tabId;
    });
    this.currentTab = tabId;
  }
}
