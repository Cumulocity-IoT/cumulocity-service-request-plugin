import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { IAlarm } from '@c8y/client';
import { SplitViewSelectionService } from '@c8y/ngx-components';
import { Subscription } from 'rxjs';
import { ServiceRequestObject } from '../../../../models/service-request.model';
import { TimelineRow, TimelineSelection } from '../../models/service-request-timeline.model';

@Component({
  selector: 'sr-timeline-list',
  templateUrl: './timeline-list.component.html',
  styleUrls: ['./timeline-list.component.less'],
  standalone: false,
})
export class TimelineListComponent implements OnInit, OnDestroy {
  @Input() rows: TimelineRow[] = [];
  @Input() loading = false;

  @Output() createFromAlarm = new EventEmitter<IAlarm>();
  @Output() linkExistingFromAlarm = new EventEmitter<IAlarm>();

  currentSelection: TimelineSelection | null = null;

  private sub: Subscription;

  constructor(private selectionService: SplitViewSelectionService<TimelineSelection>) {}

  ngOnInit(): void {
    this.sub = this.selectionService.selectedItem$.subscribe((selection) => {
      this.currentSelection = selection;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  selectAlarm(alarm: IAlarm): void {
    this.selectionService.select({ kind: 'alarm', alarm });
  }

  selectSr(sr: ServiceRequestObject): void {
    this.selectionService.select({ kind: 'sr', sr });
  }

  isAlarmSelected(alarm: IAlarm): boolean {
    return this.currentSelection?.kind === 'alarm' && String(this.currentSelection.alarm.id) === String(alarm.id);
  }

  isSrSelected(sr: ServiceRequestObject): boolean {
    return this.currentSelection?.kind === 'sr' && this.currentSelection.sr.id === sr.id;
  }

  /**
   * Drives the `active` class on <c8y-li-timeline> itself (matching the standard alarm
   * dashboard's routerLinkActive="active", which greens out the date box and timeline dot) —
   * true when either box paired on this row is the current selection.
   */
  isRowSelected(row: TimelineRow): boolean {
    return (!!row.alarm && this.isAlarmSelected(row.alarm)) || (!!row.sr && this.isSrSelected(row.sr));
  }

  isFirstOfDay(row: TimelineRow, index: number): boolean {
    return index === 0 || this.rows[index - 1].dayLabel !== row.dayLabel;
  }

  isRequestClosed(sr: ServiceRequestObject): boolean {
    return !!sr.isClosed;
  }

  linkedAlarmCount(sr: ServiceRequestObject): number {
    if (sr.alarmRefList?.length) {
      return sr.alarmRefList.length;
    }

    return sr.alarmRef ? 1 : 0;
  }

  deltaLabel(row: TimelineRow): string | null {
    if (row.deltaMinutes == null) {
      return null;
    }

    const minutes = Math.abs(row.deltaMinutes);
    const sign = row.deltaMinutes < 0 ? '-' : '+';

    if (minutes < 60) {
      return `${sign}${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;

    return `${sign}${hours}h ${remainder}m`;
  }

  trackByRowId(_index: number, row: TimelineRow): string {
    return row.id;
  }
}
