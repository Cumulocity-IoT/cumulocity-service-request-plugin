import { Component, Input } from '@angular/core';
import {
  ServiceRequestComment,
  ServiceRequestObject,
} from '../../../../models/service-request.model';
import { ServiceRequestService } from '../../../../service/service-request.service';
import { SERVICE_REQUEST_CLOSED } from '../../models/service-request.model';
import { ServiceRequestModalService } from '../../../../service/service-request-modal.service';

const displayedCommentsLimit = 10;

@Component({
  selector: 'service-request-list-item',
  templateUrl: './service-request-list-item.component.html',
  styleUrls: ['./service-request-list-item.component.less'],
  standalone: false,
})
export class ServiceRequestListItemComponent {
  comments: ServiceRequestComment[] = [];
  additionalCommentsCount = 0;
  collapsed = true;
  loading: boolean;
  requestIsClosed = SERVICE_REQUEST_CLOSED;

  @Input('serviceRequest') serviceRequest: ServiceRequestObject;

  constructor(
    private serviceRequestService: ServiceRequestService,
    private serviceRequestModal: ServiceRequestModalService
  ) {}

  async loadComments(): Promise<void> {
    this.loading = true;
    const comments = await this.serviceRequestService.commentList(
      this.serviceRequest.id
    );

    this.comments = comments.slice(0, displayedCommentsLimit);

    // limit count to 0 if there are less comments than displayedCommentsLimit (would result in negative number)
    this.additionalCommentsCount = Math.max(
      0,
      comments.length - displayedCommentsLimit
    );

    this.loading = false;
  }

  openServiceRequestModal(serviceRequest: ServiceRequestObject) {
    this.serviceRequestModal.open(serviceRequest);
  }

  toggle(collapsed = !this.collapsed): void {
    this.collapsed = collapsed;

    if (!collapsed && !this.comments.length) {
      void this.loadComments();
    }
  }

  edit(): void {
    // TODO
  }

  resolve(): void {
    // TODO
  }
}
