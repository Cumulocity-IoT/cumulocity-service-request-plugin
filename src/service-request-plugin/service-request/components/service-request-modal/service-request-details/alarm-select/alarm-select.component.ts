import { Component, Input } from '@angular/core';
import { AlarmService, IAlarm, IResult } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import { Reference } from '../../../../models/service-request.model';

@Component({
  selector: 'sr-alarm-select',
  templateUrl: './alarm-select.component.html',
  styleUrls: ['./alarm-select.component.less'],
  standalone: false,
})
export class AlarmSelectComponent {
  private references: Reference[];
  loading = true;
  availableAlarms: IAlarm[] = [];
  selectedAlarms: IAlarm[];

  @Input('disabled') disabled = false;
  @Input('multiple') multiple = false;
  @Input('alarms') set alarms(alarms: Reference | Reference[]) {
    if (!alarms) {
      this.references = [];
      this.selectedAlarms = [];
    } else {
      if (Array.isArray(alarms)) {
        this.references = alarms;
      } else {
        this.references = [alarms];
      }
    }
    void this.fetchSelected(this.references);
  }

  get alarms(): Reference | Reference[] {
    return this.references;
  }

  constructor(
    private alarmService: AlarmService,
    private alertService: AlertService,
    private translateService: TranslateService
  ) {}

  private async fetchAvailable(): Promise<IAlarm[]> {
    if (this.availableAlarms.length) {
      return this.availableAlarms;
    }
    // TODO date range filter
    this.availableAlarms = await this.alarmService.list().then((res) => res.data);

    return this.availableAlarms;
  }

  private async fetchSelected(references = this.references): Promise<IAlarm[]> {
    // check cache
    this.loading = true;
    await this.fetchAvailable();
    const missingAlarmIds: string[] = [];
    const alarms: IAlarm[] = [];

    references.forEach((r) => {
      const result = this.availableAlarms.find((a) => a.id === r.id);

      if (result) {
        alarms.push(result);
      } else {
        missingAlarmIds.push(r.id);
      }
    });

    let data: any[];

    try {
      // fetch (missing) selected
      const promises = [];

      missingAlarmIds.forEach((id) => promises.push(this.alarmService.detail(id)));

      data = await Promise.all(promises);

      data.forEach((res: IResult<IAlarm>) => alarms.push(res.data));
    } catch (error) {
      this.alertService.danger(
        this.translateService.instant('service-request-details.alarm-not-found') as string
      );
    }

    // døne
    this.selectedAlarms = alarms;
    this.loading = false;

    return this.selectedAlarms;
  }

  removeAlarm(alarmId: IAlarm['id']): void {
    this.selectedAlarms = this.selectedAlarms.filter((a) => a.id !== alarmId);
  }
}
