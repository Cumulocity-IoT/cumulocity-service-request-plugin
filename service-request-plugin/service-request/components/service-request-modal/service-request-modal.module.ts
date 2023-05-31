import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { CoreModule, ModalModule } from '@c8y/ngx-components';
import { ServiceRequestModalComponent } from './service-request-modal.component';
import { ServiceRequestDetailsComponent } from './service-request-details/service-request-details.component';
import { ServiceRequestCommentsModule } from '../comments/service-requests-comments.module';
import { ServiceRequestAttachmentsComponent } from '../service-request-attachments/service-request-attachments.component';

@NgModule({
  imports: [CommonModule, CoreModule, ModalModule, ServiceRequestCommentsModule],
  declarations: [ServiceRequestModalComponent, ServiceRequestDetailsComponent, ServiceRequestAttachmentsComponent],
  exports: [ServiceRequestModalComponent],
  entryComponents: [ServiceRequestDetailsComponent],
})
export class ServiceRequestModalModule {}
