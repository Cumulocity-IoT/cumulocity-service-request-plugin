import { Injectable } from '@angular/core';
import { FetchClient, IFetchResponse } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import {
  ServiceRequestStatus,
  ServiceRequestPriority,
  ServiceRequestObject,
  ServiceRequestErrorResponse,
} from '../models/service-request.model';

@Injectable({ providedIn: 'root' })
export class ServiceRequestAttachmentsService {
  protected status: ServiceRequestStatus[] = [];
  protected priorities: ServiceRequestPriority[] = [];

  SERVICE_REQUEST_API_URL = '/service/service-request-mgmt/api/service';


  constructor(
    private fetchClient: FetchClient,
    private alertService: AlertService,
    private translateService: TranslateService
  ) {}

  async uploadAttachment(serviceRequestId: ServiceRequestObject['id'], file: File, force = false) {
    const formData = new FormData();

    formData.append('file', file, file.name);
    formData.append('force', force.toString());

    const result = await this.fetchClient.fetch(
      `${this.SERVICE_REQUEST_API_URL}/request/${serviceRequestId}/attachment`,
      {
        body: formData,
        method: 'POST',
      }
    );

    if (result.ok) {
      return true;
    } else {
      const errorMessage = await this.readErrorMessage(result);

      this.alertService.danger(
        this.translateService.instant('service-request-attachments.upload-failed') as string,
        errorMessage ?? result.statusText
      );

      console.error('Error uploading attachment', result);
    }

    return null;
  }

  async downloadAttachment(serviceRequestId: ServiceRequestObject['id']) {
    const result = await this.fetchClient.fetch(
      `${this.SERVICE_REQUEST_API_URL}/request/${serviceRequestId}/attachment`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (result.ok) {
      try {
        const buffer = await result.arrayBuffer();

        const array = new Uint8Array(buffer);

        return array;
      } catch (e) {
        console.error('error while reading file from response', result);
      }
    } else {
      const errorMessage = await this.readErrorMessage(result);

      this.alertService.danger(
        this.translateService.instant('service-request-attachments.download-failed') as string,
        errorMessage ?? result.statusText
      );

      console.error('error downloading attachment', result);
    }

    return null;
  }

  private async readErrorMessage(result: IFetchResponse): Promise<string> {
    try {
      const res = (await result.json()) as ServiceRequestErrorResponse;

      return res?.error;
    } catch {
      return null;
    }
  }
}
