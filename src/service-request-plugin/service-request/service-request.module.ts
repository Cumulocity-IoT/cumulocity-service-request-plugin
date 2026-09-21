import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CoreModule, HOOK_ROUTE, hookNavigator, NavigatorNode, ViewContext } from '@c8y/ngx-components';

import { ServiceRequestTimelineViewComponent } from './components/service-request-timeline/service-request-timeline-view.component';
import { ServiceRequestTimelineModule } from './components/service-request-timeline/service-request-timeline.module';
import { ServiceRequestDetailsGuard } from './factory/service-request-details.guard';
import { SERVICE_REQUEST_GLOBAL_PATH, SERVICE_REQUEST_PATH } from './models/service-request.model';

import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
@NgModule({
  imports: [CoreModule, CommonModule, RouterModule, ReactiveFormsModule, BsDropdownModule, ServiceRequestTimelineModule],
  providers: [
    {
      // Per-context tabs (FR-001, FR-086): available on device, group, and asset detail pages —
      // Cumulocity routes both groups and assets under ViewContext.Group's shared `group/:id` path.
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
        {
          label: 'Service Requests',
          path: SERVICE_REQUEST_PATH,
          icon: 'online-support',
          context: ViewContext.Group,
          component: ServiceRequestTimelineViewComponent,
          priority: 3000,
          canActivate: [ServiceRequestDetailsGuard],
        },
      ],
    },
    {
      // Top-level nav route (FR-088): no `context`, so it renders outside any device/group tab —
      // ServiceRequestTimelineViewComponent detects this (no route contextData) and defaults to
      // the tenant-wide scope (FR-089).
      provide: HOOK_ROUTE,
      multi: true,
      useValue: [
        {
          path: SERVICE_REQUEST_GLOBAL_PATH,
          component: ServiceRequestTimelineViewComponent,
          canActivate: [ServiceRequestDetailsGuard],
        },
      ],
    },
    hookNavigator(
      new NavigatorNode({
        label: 'Service Requests',
        icon: 'online-support',
        path: SERVICE_REQUEST_GLOBAL_PATH,
        priority: 300,
      })
    ),
  ],
})
export class ServiceRequestModule {}
