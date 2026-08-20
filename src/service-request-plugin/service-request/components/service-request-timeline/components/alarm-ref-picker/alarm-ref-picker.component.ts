import { Component, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IAlarm } from '@c8y/client';

/**
 * Multi-select picker for linking one or more alarms to a manually-created service request
 * (FR-076, device-level creation only). Replaces the old alarm-select component, which only
 * ever dumped the candidate alarm list as raw JSON.
 */
@Component({
  selector: 'sr-alarm-ref-picker',
  templateUrl: './alarm-ref-picker.component.html',
  styleUrls: ['./alarm-ref-picker.component.less'],
  standalone: false,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: AlarmRefPickerComponent,
    },
  ],
})
export class AlarmRefPickerComponent implements ControlValueAccessor {
  @Input() candidates: IAlarm[] = [];

  selected: IAlarm[] = [];
  disabled = false;

  onChange: (value: IAlarm[]) => void = () => undefined;
  onTouched: () => void = () => undefined;

  writeValue(value: IAlarm[]): void {
    this.selected = value ?? [];
  }

  registerOnChange(onChange: (value: IAlarm[]) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  isSelected(alarm: IAlarm): boolean {
    return this.selected.some((a) => a.id === alarm.id);
  }

  toggle(alarm: IAlarm): void {
    this.selected = this.isSelected(alarm)
      ? this.selected.filter((a) => a.id !== alarm.id)
      : [...this.selected, alarm];
    this.onChange(this.selected);
    this.onTouched();
  }

  remove(alarm: IAlarm): void {
    this.selected = this.selected.filter((a) => a.id !== alarm.id);
    this.onChange(this.selected);
    this.onTouched();
  }
}
