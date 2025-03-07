import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { CoreModule, ModalModule } from '@c8y/ngx-components';
import { ServiceRequestModalComponent } from './service-request-modal.component';
import { ServiceRequestDetailsComponent } from './service-request-details/service-request-details.component';
import { ServiceRequestCommentsModule } from '../comments/service-requests-comments.module';
import { ServiceRequestAttachmentsComponent } from '../service-request-attachments/service-request-attachments.component';
import { AlarmSelectComponent } from './service-request-details/alarm-select/alarm-select.component';
import { DeviceSelectComponent } from './service-request-details/device-select/device-select.component';
import { CollapseModule } from 'ngx-bootstrap/collapse';

@NgModule({
  imports: [CommonModule, CollapseModule, CoreModule, ModalModule, ServiceRequestCommentsModule],
  declarations: [
    ServiceRequestModalComponent,
    ServiceRequestDetailsComponent,
    ServiceRequestAttachmentsComponent,
    AlarmSelectComponent,
    DeviceSelectComponent,
  ],
  exports: [ServiceRequestModalComponent],
})
export class ServiceRequestModalModule {}
