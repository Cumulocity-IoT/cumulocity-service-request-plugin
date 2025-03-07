import { Injectable } from '@angular/core';
import { FetchClient } from '@c8y/client';
import { AlertService, gettext } from '@c8y/ngx-components';
import {
  CreateServiceRequestRequest,
  ServiceRequestComment,
  ServiceRequestCommentListResponse,
  ServiceRequestListRequest,
  ServiceRequestListResponse,
  ServiceRequestObject,
  ServiceRequestPriority,
  ServiceRequestStatus,
  SERVICE_REQUEST_DEFAULT_PAGE_SIZE,
  UpdateServiceRequestRequest,
} from '../models/service-request.model';

@Injectable({ providedIn: 'root' })
export class ServiceRequestService {
  constructor(private fetchClient: FetchClient, private alertService: AlertService) {}

  createEmptyServiceRequest(): ServiceRequestObject {
    return {
      id: '',
      isActive: true,
      title: '',
      description: '',
      creationTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      owner: '',
      type: 'alarm',
      alarmRef: null,
      source: null,
      lastUpdated: new Date().toISOString(),
      eventRef: null,
      seriesRef: null,
      status: { id: '', name: ''},
      priority: null,
      customProperties: null,
      attachment: null
    };
  }

  /**
   * 
   * @returns true, if MS endpoint exists, false otherwise.
   */
  async isAvailable() {
    try {
      const result = await this.fetchClient.fetch(
        `/service/service-request-mgmt/api/service/request/`,
        {
          method: 'HEAD',
          headers: { 'Content-Type': 'application/json' },
        });
        if (result.ok) {
          return true;
        }
    } catch(e) {
      // nothing to do here
    }
    this.alertService.info('The Microservice Service-request-mgmt needs to be installed in order to use the Service Request Plugin');
    return true;
  }

  // GET /service/request
  async list(request?: ServiceRequestListRequest): Promise<ServiceRequestObject[]> {
    const result = await this.fetchClient.fetch(
      `/service/service-request-mgmt/api/service/request/`,
      {
        params: {
          pageSize: SERVICE_REQUEST_DEFAULT_PAGE_SIZE,
          ...request,
        },
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (result.ok) {
      try {
        return ((await result.json()) as ServiceRequestListResponse)?.list;
      } catch (e) {
        console.error('No service requests available', result);
      }
    } else {
      console.error('Error receiving service requests', result);
    }

    return [];
  }

  // GET /service/request/{serviceRequestId}
  async detail(id: ServiceRequestObject['id']): Promise<ServiceRequestObject> {
    const result = await this.fetchClient.fetch(
      `/service/service-request-mgmt/api/service/request/${id}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (result.ok) {
      try {
        return (await result.json()) as ServiceRequestObject;
      } catch (e) {
        console.error('Error parsing service request details response', e, result);
      }
    } else {
      console.error('Error updating service request', result);
    }

    return null;
  }

  // POST /service/request
  async create(serviceRequest: CreateServiceRequestRequest): Promise<ServiceRequestObject> {
    const result = await this.fetchClient.fetch(
      `/service/service-request-mgmt/api/service/request/`,
      {
        body: JSON.stringify(serviceRequest),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (result.ok) {
      try {
        const res = (await result.json()) as ServiceRequestObject;

        this.alertService.success(`Service request '${serviceRequest.title}' created`);

        return res;
      } catch (e) {
        console.error('Error while parsing service request object', e, result);
      }
    } else {
      console.error('Error creating service requests', result);

      this.alertService.danger(
        `Service request '${serviceRequest.title}' could not be created`,
        result.statusText
      );
    }

    return null;
  }

  // PATCH /service/request/{serviceRequestId}
  async update(
    serviceRequestId: ServiceRequestObject['id'],
    serviceRequest: UpdateServiceRequestRequest
  ): Promise<ServiceRequestObject> {
    const result = await this.fetchClient.fetch(
      `/service/service-request-mgmt/api/service/request/${serviceRequestId}`,
      {
        body: JSON.stringify(serviceRequest),
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (result.ok) {
      try {
        const res = (await result.json()) as ServiceRequestObject;

        this.alertService.success(`Service request '${serviceRequest.title}' updated`);

        return res;
      } catch (e) {
        console.error('Error while parsing service request object', e, result);
      }
    } else {
      this.alertService.danger(
        `Service request '${serviceRequest.title}' could not be updated`,
        result.statusText
      );

      console.error('Error updating service requests', result);
    }

    return null;
  }

  // DELETE /service/request/{serviceRequestId}
  // TODO: currently returns mocked data
  async resolve(serviceRequest: ServiceRequestObject): Promise<ServiceRequestObject> {
    const result = await this.fetchClient.fetch(
      `/service/service-request-mgmt/api/service/request/${serviceRequest.id}`,
      {
        body: JSON.stringify({
          isActive: false,
        }),
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (result.ok) {
      try {
        const res = (await result.json()) as ServiceRequestObject;

        this.alertService.success(`Service request '${serviceRequest.title}' resolved`);

        return res;
      } catch (e) {
        console.error('Error while parsing service request object', e, result);
      }
    } else {
      this.alertService.danger(
        `Service request '${serviceRequest.title}' could not be resolved`,
        result.statusText
      );

      console.error('Error resolving service request', result);
    }

    return null;
  }

  // needed in UI?
  // - GET /service/request/external/{serviceRequestExternalId}
  // - PATCH /service/request/external/{serviceRequestExternalId}
  // - POST /service/request/external

  // GET /service/request/status
  async statusList(): Promise<ServiceRequestStatus[]> {
    const result = await this.fetchClient.fetch(
      `/service/service-request-mgmt/api/service/request/status`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (result.ok) {
      try {
        const status = (await result.json()) as ServiceRequestStatus[];

        return status;
      } catch (e) {
        console.error('No service request status available', result);
      }
    } else {
      console.error('Error receiving service request status', result);
    }

    return [];
    // return Promise.resolve(this.generateMockPriorityList());
  }

  // needed in UI?
  // - POST /service/request/status
  // - GET /service/request/status/{statusId}
  // - DELETE /service/request/status/{statusId}

  // GET /service/request/priority
  async priorityList(): Promise<ServiceRequestPriority[]> {
    const result = await this.fetchClient.fetch(
      `/service/service-request-mgmt/api/service/request/priority`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (result.ok) {
      try {
        const priorities = (await result.json()) as ServiceRequestPriority[];

        return priorities;
      } catch (e) {
        console.error('No service request priorities available', result);
      }
    } else {
      console.error('Error receiving service request priorities', result);
    }

    return [];
    // return Promise.resolve(this.generateMockPriorityList());
  }

  // needed in UI?
  // - POST /service/request/priority
  // - GET /service/request/priority/{priorityOrdinal}
  // - DELETE /service/request/priority/{priorityOrdinal}

  // GET /service/request/{serviceRequestId}/comment
  async commentList(
    serviceRequestId: ServiceRequestObject['id'],
    limit = SERVICE_REQUEST_DEFAULT_PAGE_SIZE
  ): Promise<ServiceRequestComment[]> {
    const result = await this.fetchClient.fetch(
      `/service/service-request-mgmt/api/service/request/${serviceRequestId}/comment`,
      {
        params: {
          pageSize: limit,
        },
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (result.ok) {
      try {
        return ((await result.json()) as ServiceRequestCommentListResponse)?.list;
      } catch (e) {
        console.error('No comments available', result);
      }
    } else {
      console.error('Error receiving comments', result);
    }

    return [];
  }

  // POST /service/request/{serviceRequestId}/comment
  async commentCreate(
    serviceRequestId: ServiceRequestObject['id'],
    comment: Partial<ServiceRequestComment>
  ): Promise<ServiceRequestComment> {
    const result = await this.fetchClient.fetch(
      `/service/service-request-mgmt/api/service/request/${serviceRequestId}/comment`,
      {
        body: JSON.stringify(comment),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (result.ok) {
      try {
        const res = (await result.json()) as ServiceRequestComment;

        this.alertService.success(gettext('Comment created') as string);

        return res;
      } catch (e) {
        console.error('Could not create commen', result);
      }
    } else {
      this.alertService.danger(
        gettext('Could not create comment') as string,
        result.statusText
      );

      console.error('service-request.request.feedback--error-receive', result);
    }

    return null;
  }

  // TODO: DELETE
}
