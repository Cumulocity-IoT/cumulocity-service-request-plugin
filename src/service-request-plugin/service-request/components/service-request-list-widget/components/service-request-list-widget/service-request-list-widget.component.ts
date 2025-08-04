import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ServiceRequestObject } from '../../../../models/service-request.model';
import { ServiceRequestService } from '../../../../service/service-request.service';
import { ServiceRequestModalService } from '../../../../service/service-request-modal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'ene-service-request-list-widget-component-widget',
  templateUrl: './service-request-list-widget.component.html',
  styleUrls: ['./service-request-list-widget.component.less'],
  standalone: false,
})
export class SeriveRequestListWidgetComponent implements OnInit, OnDestroy {
  private intervalTime = 180 * 1000;
  private pollingTimer!: NodeJS.Timeout | null;
  serviceRequests: ServiceRequestObject[] = [];
  public loading = false;
  private changeSub: Subscription;

  constructor(
    private activatedRoute: ActivatedRoute,
    private serviceRequestService: ServiceRequestService,
    serviceRequestModal: ServiceRequestModalService
  ) {
    this.changeSub = serviceRequestModal.change$.subscribe(() => {
      void this.reload();
    });
  }

  private async reload(): Promise<void> {
    this.loading = true;
    // TODO: verify this works
    const contextData =
      this.activatedRoute.snapshot.data['contextData'] ||
      this.activatedRoute.snapshot.parent?.data['contextData'];
    try {
      this.serviceRequests = await this.serviceRequestService.list({
        sourceId: contextData.id,
      });
    } finally {
      this.loading = false;
    }
  }

  ngOnInit(): void {
    void this.reload();

    this.pollingTimer = setInterval(() => {
      void this.reload();
    }, this.intervalTime);
  }

  ngOnDestroy(): void {
    this.pollingTimer = null;

    if (this.changeSub) {
      this.changeSub.unsubscribe();
    }
  }
}
