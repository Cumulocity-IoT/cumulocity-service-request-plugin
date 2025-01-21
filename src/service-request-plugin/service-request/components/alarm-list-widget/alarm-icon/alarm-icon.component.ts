import { Component, Input } from '@angular/core';
import { IAlarm } from '@c8y/client';

@Component({
  selector: 'sr-alarm-icon',
  templateUrl: './alarm-icon.component.html',
})
export class AlarmIconComponent {
  @Input() placement: 'top' | 'right' | 'bottom' | 'left' = 'right';
  @Input() display: 'severity' | 'status' = 'severity';
  @Input() severity: string;
  @Input() status: string;

  @Input() set alarm(alarm: IAlarm) {
    this.severity = String(alarm.severity);
    this.status = String(alarm.status);
  }
}
