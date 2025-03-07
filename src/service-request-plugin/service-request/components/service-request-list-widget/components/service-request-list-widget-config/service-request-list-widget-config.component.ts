import { Component } from '@angular/core';
import { ControlContainer, NgForm } from '@angular/forms';

@Component({
  selector: 'ene-service-request-list-widget-config',
  templateUrl: './service-request-list-widget-config.component.html',
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class ServiceRequestListWidgetConfigComponent {}
