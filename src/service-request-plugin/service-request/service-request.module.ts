import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CoreModule, HOOK_ROUTE, ViewContext } from '@c8y/ngx-components';

import { ServiceRequestTimelineViewComponent } from './components/service-request-timeline/service-request-timeline-view.component';
import { ServiceRequestTimelineModule } from './components/service-request-timeline/service-request-timeline.module';
import { ServiceRequestDetailsGuard } from './factory/service-request-details.guard';
import { SERVICE_REQUEST_PATH } from './models/service-request.model';

import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
@NgModule({
  imports: [CoreModule, CommonModule, RouterModule, ReactiveFormsModule, BsDropdownModule, ServiceRequestTimelineModule],
  providers: [
    {
      provide: HOOK_ROUTE,
      multi: true,
      useValue: [
        {
          label: 'Service Requests',
          path: SERVICE_REQUEST_PATH,
          icon: 'online-support',
          context: ViewContext.Device,
          component: ServiceRequestTimelineViewComponent,
          priority: 3000,
          canActivate: [ServiceRequestDetailsGuard],
        },
      ],
    },
  ],
})
export class ServiceRequestModule {}
