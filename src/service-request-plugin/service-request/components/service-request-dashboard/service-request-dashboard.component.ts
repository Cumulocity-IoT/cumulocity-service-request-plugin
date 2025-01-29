import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Widget } from '@c8y/ngx-components';
import { Subscription } from 'rxjs';
import { IManagedObject } from '@c8y/client';
import { ServiceRequestModalService } from '../../service/service-request-modal.service';

@Component({
  templateUrl: './service-request-dashboard.component.html',
})
export class ServiceRequestDashboardComponent implements OnInit, OnDestroy {
  private sub!: Subscription;
  serviceRequestID!: string;
  serviceRequestIsCreateForm!: boolean;
  device: IManagedObject;
  widgets: Widget[] = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private serviceRequestModal: ServiceRequestModalService
  ) {
    this.device = this.activatedRoute.parent?.snapshot.data['contextData'] as IManagedObject;
  }

  private initWidgets(device = this.device): Widget[] {
    this.widgets = [
      {
        componentId: 'alarm.list.widget',
        _x: 0,
        _y: 0,
        _height: 12,
        _width: 6,
        id: '123456',
        title: 'Alarms',
        config: {
          device: {
            id: device.id,
            name: device['name'],
          },
          status: ['ACTIVE', 'ACKNOWLEDGED'],
          severity: ['CRITICAL'],
          showSubassets: true,
        },
      },
      {
        componentId: 'service-request.list.widget',
        _x: 6,
        _y: 0,
        _height: 12,
        _width: 6,
        id: '789012',
        title: 'Service Requests',
        config: {
          device: {
            id: device.id,
            name: device['name'],
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
    this.serviceRequestModal.openForDevice(this.device);
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
