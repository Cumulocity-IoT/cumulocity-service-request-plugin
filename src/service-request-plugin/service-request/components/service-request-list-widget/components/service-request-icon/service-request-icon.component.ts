import { Component, Input } from '@angular/core';
import { ServiceRequestPriority } from '../../../../models/service-request.model';

@Component({
  selector: 'ene-service-request-icon',
  templateUrl: './service-request-icon.component.html',
  styleUrls: ['./service-request-icon.component.less'],
})
export class ServiceRequestIconComponent {
  @Input('priority') priority: ServiceRequestPriority;
  @Input('closed') closed = false;
}
