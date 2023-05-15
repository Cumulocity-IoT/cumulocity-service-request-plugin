import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { CoreModule, ModalModule } from '@c8y/ngx-components';
import { ServiceRequestModalComponent } from './service-request-modal.component';
import { ServiceRequestDetailsComponent } from './service-request-details/service-request-details.component';
import { Nl2brPipe } from '../../pipes/nl2br.pipe';

@NgModule({
  imports: [CommonModule, CoreModule, ModalModule],
  declarations: [ServiceRequestModalComponent, ServiceRequestDetailsComponent,  Nl2brPipe],
  exports: [ServiceRequestModalComponent],
  entryComponents: [ServiceRequestDetailsComponent],
})
export class ServiceRequestModalModule {}
