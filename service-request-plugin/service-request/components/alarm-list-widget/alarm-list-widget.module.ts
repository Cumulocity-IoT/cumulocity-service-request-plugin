import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { CoreModule, HOOK_COMPONENTS, ModalModule } from '@c8y/ngx-components';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { AlarmListWidgetComponent } from './alarm-list-widget.component';
import { AlarmListWidgetConfigComponent } from './alarm-list-widget-config.component';
import { AlarmIconPipe, C8yLiStatusFromAlarmPipe } from './alarm-icon.pipe';
import { ServiceRequestModalModule } from '../service-request-modal/service-request-modal.module';
import { AlarmIconComponent } from './alarm-icon/alarm-icon.component';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [CommonModule, RouterModule, CoreModule, TooltipModule, ServiceRequestModalModule],
  declarations: [
    AlarmIconComponent,
    AlarmListWidgetComponent,
    AlarmListWidgetConfigComponent,
    AlarmIconPipe,
    C8yLiStatusFromAlarmPipe,
  ],
  entryComponents: [AlarmListWidgetComponent, AlarmListWidgetConfigComponent],
  providers: [
    {
      provide: HOOK_COMPONENTS,
      multi: true,
      useValue: [
        {
          id: 'alarm.list.widget',
          label: 'Alarm List Widget',
          description: '',
          component: AlarmListWidgetComponent,
          configComponent: AlarmListWidgetConfigComponent,
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
export class AlarmListWidgetModule {}
