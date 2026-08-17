import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CoreModule, HOOK_ROUTE, ViewContext, WidgetsDashboardComponent } from '@c8y/ngx-components';

import { ServiceRequestDashboardComponent } from './components/service-request-dashboard/service-request-dashboard.component';
import { ServiceRequestDetailsGuard } from './factory/service-request-details.guard';
import { SERVICE_REQUEST_PATH } from './models/service-request.model';

import { ServiceRequestListWidgetModule } from './components/service-request-list-widget/service-request-list-widget.module';
import { AlarmListWidgetModule } from './components/alarm-list-widget/alarm-list-widget.module';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
@NgModule({
  imports: [CoreModule, CommonModule, RouterModule, ReactiveFormsModule, BsDropdownModule, WidgetsDashboardComponent, ServiceRequestListWidgetModule, AlarmListWidgetModule],
  declarations: [ServiceRequestDashboardComponent],
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
          component: ServiceRequestDashboardComponent,
          priority: 3000,
          canActivate: [ServiceRequestDetailsGuard],
        },
      ],
    },
  ],
})
export class ServiceRequestModule {}
