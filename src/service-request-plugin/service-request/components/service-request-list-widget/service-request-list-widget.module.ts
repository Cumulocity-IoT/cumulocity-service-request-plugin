import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CoreModule, HOOK_COMPONENTS } from '@c8y/ngx-components';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { TooltipModule } from 'ngx-bootstrap/tooltip';

import { ServiceRequestIconComponent } from './components/service-request-icon/service-request-icon.component';
import { ServiceRequestListItemComponent } from './components/service-request-list-item/service-request-list-item.component';
import { ServiceRequestListWidgetConfigComponent } from './components/service-request-list-widget-config/service-request-list-widget-config.component';
import { SeriveRequestListWidgetComponent } from './components/service-request-list-widget/service-request-list-widget.component';
import { ServiceRequestCommentsModule } from '../comments/service-requests-comments.module';

@NgModule({
  imports: [CommonModule, CoreModule, CollapseModule, RouterModule, TooltipModule, ServiceRequestCommentsModule],
  declarations: [
    SeriveRequestListWidgetComponent,
    ServiceRequestListWidgetConfigComponent,
    ServiceRequestListItemComponent,
    ServiceRequestIconComponent,
  ],
  providers: [
    {
      provide: HOOK_COMPONENTS,
      multi: true,
      useValue: [
        {
          id: 'service-request.list.widget',
          label: 'Service Request List Widget',
          description: '',
          component: SeriveRequestListWidgetComponent,
          configComponent: ServiceRequestListWidgetConfigComponent,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          previewImage: require('./assets/preview.png'),
          data: {
            settings: {
              noNewWidgets: false,
              ng1: {
                options: {
                  noDeviceTarget: false,
                  groupsSelectable: true,
                },
              },
            },
          },
        },
      ],
    },
  ],
})
export class ServiceRequestListWidgetModule {}
