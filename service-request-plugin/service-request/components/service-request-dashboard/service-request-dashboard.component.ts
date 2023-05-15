import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Widget } from '@c8y/ngx-components';
import { Subscription } from 'rxjs';
import { IManagedObject } from '@c8y/client';
import { ServiceRequestModalComponent } from '../service-request-modal/service-request-modal.component';
import { BsModalService } from "ngx-bootstrap/modal";
import { take } from 'rxjs/operators';


@Component({
  templateUrl: './service-request-dashboard.component.html',
})
export class ServiceRequestDashboardComponent implements OnInit, OnDestroy {
  private sub: Subscription;
  serviceRequestID: string;
  serviceRequestIsCreateForm: boolean;
  device: IManagedObject;
  widgets: Widget[];

  constructor(private activatedRoute: ActivatedRoute, private bsModalService: BsModalService) {
    this.device = this.activatedRoute.parent.snapshot.data.contextData as IManagedObject;
  }

  private initWidgets(device = this.device): Widget[] {
    this.widgets = [
      {
        componentId: 'alarm.list.widget',
        _x: 0,
        _y: 0,
        _height: 5,
        _width: 12,
        id: '123456',
        title: 'Alarms',
        config: {
          device: {
            id: device.id,
            name: device.name,
          },
        },
      },
      {
        componentId: 'service-request.list.widget',
        _x: 0,
        _y: 5,
        _height: 9,
        _width: 12,
        id: '789012',
        title: 'IoT Notifications',
        config: {
          device: {
            id: device.id,
            name: device.name,
          },
        },
      },
    ];

    return this.widgets;
  }

   ngOnInit(): void {
    void this.initWidgets();
  }

  openServiceRequestModal(): void {
    const modalRef = this.bsModalService.show(ServiceRequestModalComponent, {
      class: "modal-lg",
    });
    modalRef.content.requestDetails.device = this.device;
    modalRef.content.requestDetails.init();
    modalRef.content.closeSubject.pipe(take(1)).subscribe();
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
