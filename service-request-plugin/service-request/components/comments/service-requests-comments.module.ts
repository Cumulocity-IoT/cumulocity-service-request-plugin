import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { CoreModule } from '@c8y/ngx-components';
import { Nl2brPipe } from '../../pipes/nl2br.pipe';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { ServiceRequestCommentsComponent } from './service-request-comments.component';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  imports: [CommonModule, CoreModule, ReactiveFormsModule, BsDropdownModule],
  declarations: [ServiceRequestCommentsComponent,  Nl2brPipe],
  exports: [ServiceRequestCommentsComponent],
  entryComponents: [ServiceRequestCommentsComponent],
})
export class ServiceRequestCommentsModule {}
