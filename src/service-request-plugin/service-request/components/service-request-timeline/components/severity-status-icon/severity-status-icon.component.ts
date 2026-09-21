import { Component, Input } from '@angular/core';
import { IAlarm } from '@c8y/client';

/**
 * Renders either the alarm severity icon or the alarm status icon (per FR-069),
 * using the standard Cumulocity severity->icon convention:
 * CRITICAL -> exclamation-circle, MAJOR -> warning, MINOR -> high-priority, WARNING -> circle.
 */
@Component({
  selector: 'sr-severity-status-icon',
  templateUrl: './severity-status-icon.component.html',
  standalone: false,
})
export class SeverityStatusIconComponent {
  @Input() placement: 'top' | 'right' | 'bottom' | 'left' = 'right';
  @Input() display: 'severity' | 'status' = 'severity';
  @Input() severity: string;
  @Input() status: string;

  @Input() set alarm(alarm: IAlarm) {
    this.severity = String(alarm.severity);
    this.status = String(alarm.status);
  }
}
