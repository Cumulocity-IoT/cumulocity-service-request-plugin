import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ServiceRequestObject } from '../../../../models/service-request.model';
import { ServiceRequestService } from '../../../../service/service-request.service';

@Component({
  selector: 'ene-service-request-list-widget-component-widget',
  templateUrl: './service-request-list-widget.component.html',
  styleUrls: ['./service-request-list-widget.component.less'],
})
export class SeriveRequestListWidgetComponent implements OnInit, OnDestroy {
  private intervalTime = 180 * 1000;
  private pollingTimer: NodeJS.Timeout;
  serviceRequests: ServiceRequestObject[] = [];
  public loading = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private serviceRequestService: ServiceRequestService,
  ) {}

  private async initSource(): Promise<void> {
    this.loading = true;
    // TODO: verify this works
   const contextData = this.activatedRoute.snapshot.data.contextData || this.activatedRoute.snapshot.parent.data.contextData;
    this.serviceRequests = await this.serviceRequestService.list({ sourceId: contextData.id });
    this.loading = false;
  }

  ngOnInit(): void {
    void this.initSource();

    this.pollingTimer = setInterval(() => {
      void this.initSource();
    }, this.intervalTime);
  }

  ngOnDestroy(): void {
    delete this.pollingTimer;
  }
}
