import { Injectable } from '@angular/core';
import { FetchClient, IFetchResponse } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import {
  ServiceRequestComment,
  ServiceRequestCommentListResponse,
  SERVICE_REQUEST_COMMENTS_DEFAULT_PAGE_SIZE,
  SERVICE_REQUEST_API_URL,
  ServiceRequestCommentsErrorResponse,
} from '../models/service-request-comments.model';

@Injectable({ providedIn: 'root' })
export class ServiceRequestCommentsService {
  constructor(
    private fetchClient: FetchClient,
    private alertService: AlertService,
    private translateService: TranslateService
  ) {}

  // needed in UI?
  // - POST /service/request/priority
  // - GET /service/request/priority/{priorityOrdinal}
  // - DELETE /service/request/priority/{priorityOrdinal}

  // GET /service/request/{serviceRequestId}/comment
  async list(
    serviceRequestId: string,
    limit = SERVICE_REQUEST_COMMENTS_DEFAULT_PAGE_SIZE
  ): Promise<ServiceRequestComment[]> {
    const result = await this.fetchClient.fetch(
      `${SERVICE_REQUEST_API_URL}/request/${serviceRequestId}/comment`,
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
        console.error('No service requests available', result);
      }
    } else {
      console.error('Error receiving service requests', result);
    }

    return [];
  }

  // POST /service/request/{serviceRequestId}/comment
  async create(
    serviceRequestId: string,
    comment: Partial<ServiceRequestComment>
  ): Promise<ServiceRequestComment> {
    const result = await this.fetchClient.fetch(
      `${SERVICE_REQUEST_API_URL}/request/${serviceRequestId}/comment`,
      {
        body: JSON.stringify(comment),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (result.ok) {
      try {
        const res = (await result.json()) as ServiceRequestComment;

        this.alertService.success(
          this.translateService.instant('service-request-comments.comment-created') as string
        );

        return res;
      } catch (e) {
        console.error('Error parsing comment response', result);
      }
    } else {
      console.error('Error creating comment', result);

      const errorMessage = await this.readErrorMessage(result);

      this.alertService.danger(
        this.translateService.instant('service-request-comments.comment-create-failed') as string,
        errorMessage ?? result.statusText
      );
    }

    return null;
  }

  // POST /service/request/comment/{commentId}/attachment
  async uploadAttachment(serviceRequestCommentId: string, file: File, force = false) {
    const formData = new FormData();

    formData.append('file', file, file.name);
    formData.append('force', force.toString());

    const result = await this.fetchClient.fetch(
      `${SERVICE_REQUEST_API_URL}/request/comment/${serviceRequestCommentId}/attachment`,
      {
        body: formData,
        method: 'POST',
      }
    );

    if (result.ok) {
      return true;
    } else {
      console.error('Error uploading attachment', result);

      const errorMessage = await this.readErrorMessage(result);

      this.alertService.danger(
        this.translateService.instant(
          'service-request-comments.upload-attachment-failed'
        ) as string,
        errorMessage ?? result.statusText
      );
    }

    return null;
  }

  async downloadAttachment(serviceRequestCommentId: string) {
    const result = await this.fetchClient.fetch(
      `${SERVICE_REQUEST_API_URL}/request/comment/${serviceRequestCommentId}/attachment`,
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
      console.error('Error downloading attachment', result);

      const errorMessage = await this.readErrorMessage(result);

      this.alertService.danger(
        this.translateService.instant(
          'service-request-comments.download-attachment-failed'
        ) as string,
        errorMessage ?? result.statusText
      );
    }

    return null;
  }

  // TODO: DELETE

  private async readErrorMessage(result: IFetchResponse): Promise<string> {
    try {
      const res = (await result.json()) as ServiceRequestCommentsErrorResponse;

      return res?.error;
    } catch {
      return null;
    }
  }
}
