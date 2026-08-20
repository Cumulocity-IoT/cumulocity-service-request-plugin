import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  CoreModule,
  IconPanelComponent,
  ListGroupModule,
  SplitViewComponent,
  SplitViewDetailsActionsComponent,
  SplitViewDetailsComponent,
  SplitViewFooterComponent,
  SplitViewHeaderActionsComponent,
  SplitViewListComponent,
} from '@c8y/ngx-components';
import { AlarmsModule } from '@c8y/ngx-components/alarms';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { ModalModule } from 'ngx-bootstrap/modal';
import { TooltipModule } from 'ngx-bootstrap/tooltip';

import { ServiceRequestTimelineViewComponent } from './service-request-timeline-view.component';
import { AddExistingRequestModalComponent } from './components/add-existing-request-modal/add-existing-request-modal.component';
import { AlarmDetailPanelComponent } from './components/alarm-detail-panel/alarm-detail-panel.component';
import { AlarmRefPickerComponent } from './components/alarm-ref-picker/alarm-ref-picker.component';
import { NewRequestFormComponent } from './components/new-request-form/new-request-form.component';
import { SeverityStatusIconComponent } from './components/severity-status-icon/severity-status-icon.component';
import { ServiceRequestSupportIconComponent } from './components/support-icon/service-request-support-icon.component';
import { SrDetailPanelComponent } from './components/sr-detail-panel/sr-detail-panel.component';
import { TimelineListComponent } from './components/timeline-list/timeline-list.component';
import { ServiceRequestAttachmentsComponent } from '../service-request-attachments/service-request-attachments.component';
import { ServiceRequestCommentsModule } from '../comments/service-requests-comments.module';

@NgModule({
  imports: [
    CoreModule,
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    BsDropdownModule,
    TooltipModule,
    ModalModule,
    ListGroupModule,
    AlarmsModule,
    IconPanelComponent,
    ServiceRequestCommentsModule,
    SplitViewComponent,
    SplitViewListComponent,
    SplitViewDetailsComponent,
    SplitViewFooterComponent,
    SplitViewHeaderActionsComponent,
    SplitViewDetailsActionsComponent,
  ],
  declarations: [
    ServiceRequestTimelineViewComponent,
    SeverityStatusIconComponent,
    ServiceRequestSupportIconComponent,
    TimelineListComponent,
    AlarmDetailPanelComponent,
    SrDetailPanelComponent,
    ServiceRequestAttachmentsComponent,
    AlarmRefPickerComponent,
    NewRequestFormComponent,
    AddExistingRequestModalComponent,
  ],
})
export class ServiceRequestTimelineModule {}
