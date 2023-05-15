import { Pipe, PipeTransform } from "@angular/core";
import { AlarmStatus, IAlarm, Severity } from "@c8y/client";

@Pipe({
    name:'alarmIcon'
})
export class AlarmIconPipe implements PipeTransform {

    protected icons = new Map<string, string>(
        [
            [Severity.WARNING.toString(), 'circle'], 
            [Severity.MINOR.toString(), 'high-priority'], 
            [Severity.MAJOR.toString(), 'warning'],
            [Severity.CRITICAL.toString(), 'exclamation-circle'],
            [AlarmStatus.CLEARED.toString(), 'c8y-alert-idle'],
            [AlarmStatus.ACKNOWLEDGED.toString(), 'bell-slash'],
            [AlarmStatus.ACTIVE.toString(), 'bell'],

        ]);
  
        transform(value: IAlarm): string {
        //    if (value.status && this.icons.has(value.status.toString())) {
        //     return this.icons.get(value.status.toString())
        //    }

           return this.icons.get(value.severity.toString());
        }
}

@Pipe({
    name: 'c8yLiStatus'
})
export class C8yLiStatusFromAlarmPipe implements PipeTransform {

    transform(value: IAlarm): string {
           return `status ${value.severity.toString().toLowerCase()}`;
        }
}