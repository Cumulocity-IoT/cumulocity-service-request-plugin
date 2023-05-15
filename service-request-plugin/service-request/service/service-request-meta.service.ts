import { Injectable } from '@angular/core';
import { ServiceRequestStatus, ServiceRequestPriority } from '../models/service-request.model';
import { ServiceRequestService } from './service-request.service';

@Injectable({ providedIn: 'root' })
export class ServiceRequestMetaService {
  protected status: ServiceRequestStatus[] = [];
  protected priorities: ServiceRequestPriority[] = [];

  constructor(private serviceRequestService: ServiceRequestService) {}

  fetchMeta(
    ignoreCache = false
  ): Promise<{ status: ServiceRequestStatus[]; priorities: ServiceRequestPriority[] }> {
    const response = {
      status: this.status,
      priorities: this.priorities,
    };

    if (ignoreCache && this.status?.length && this.priorities.length) {
      return Promise.resolve(response);
    }

    return Promise.all([
      this.serviceRequestService.statusList(),
      this.serviceRequestService.priorityList(),
    ]).then(([status, priorities]) => {
      this.status = status;
      this.priorities = priorities;

      return {
        status: this.status,
        priorities: this.priorities,
      };
    });
  }
}
