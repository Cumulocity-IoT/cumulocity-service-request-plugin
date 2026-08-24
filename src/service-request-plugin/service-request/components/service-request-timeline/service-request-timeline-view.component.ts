import { AfterViewInit, Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlarmQueryFilter, AlarmService, AlarmStatus, IAlarm, IManagedObject, IResultList } from '@c8y/client';
import { AlertService, SplitViewComponent } from '@c8y/ngx-components';
import { AlarmListFormFilters } from '@c8y/ngx-components/alarms';
import { BsModalService } from 'ngx-bootstrap/modal';
import { BehaviorSubject, firstValueFrom, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { ServiceRequestObject } from '../../models/service-request.model';
import { ServiceRequestChangeService } from '../../service/service-request-change.service';
import { ServiceRequestService } from '../../service/service-request.service';
import { AddExistingRequestModalComponent } from './components/add-existing-request-modal/add-existing-request-modal.component';
import { NewRequestContext, TimelineRow, TimelineSelection } from './models/service-request-timeline.model';
import { buildTimelineRows } from './service-request-timeline.util';

const ALARM_PAGE_SIZE = 50;
const ALARM_POLL_INTERVAL_MS = 60 * 1000;
const SR_POLL_INTERVAL_MS = 180 * 1000;

@Component({
  templateUrl: './service-request-timeline-view.component.html',
  styleUrls: ['./service-request-timeline-view.component.less'],
  standalone: false,
})
export class ServiceRequestTimelineViewComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(SplitViewComponent) splitView!: SplitViewComponent<TimelineSelection>;

  device: IManagedObject;

  alarms: IAlarm[] = [];
  serviceRequests: ServiceRequestObject[] = [];
  rows: TimelineRow[] = [];

  loading = false;
  loadingMore = false;
  alarmPage = 1;
  alarmTotalPages: number | null = null;

  /** See ngAfterViewInit — flipped true only once c8y-alarms-interval-refresh can react to it. */
  autoRefreshToggleEnabled = false;
  /**
   * c8y-alarms-interval-refresh only restarts its countdown when this emits `false` — it stops the
   * countdown on every emission and only resets (restarts) it once the emitted value is falsy, so
   * a full reload cycle must toggle this true -> false to keep the auto-refresh loop going.
   */
  autoRefreshLoading$ = new BehaviorSubject<boolean>(false);

  private selectedSeverities: string[] = [];
  private selectedAlarmStatuses: string[] = [];
  private selectedTypes: string[] = [];
  private dateFrom = '1970-01-01';
  /** Only set when the user picks an explicit range via c8y-alarms-date-filter — see loadAlarms. */
  private customDateTo: string | null = null;

  /** Backs c8y-alarms-type-filter's [alarms] input (needs the raw IResultList, not just IAlarm[]). */
  alarmsResult: IResultList<IAlarm> | null = null;

  currentSelection: TimelineSelection | null = null;
  /**
   * Derived from currentSelection, recomputed only when the selection or the underlying
   * alarm/SR data actually changes (never inline in the template) — calling .filter()/.find()
   * directly in a template binding returns a new array/value every change-detection cycle,
   * which makes Angular re-fire ngOnChanges on the child component on every tick.
   */
  currentLinkedSr: ServiceRequestObject | null = null;
  currentLinkedAlarms: IAlarm[] = [];

  /**
   * Angular's template type-checker doesn't narrow currentSelection's discriminated union from
   * a `*ngIf="currentSelection?.kind === 'x'"` comparison, so pull each variant out via a typed
   * getter instead and use `*ngIf="selectedAlarm as alarm"` in the template.
   */
  get selectedAlarm(): IAlarm | null {
    return this.currentSelection?.kind === 'alarm' ? this.currentSelection.alarm : null;
  }

  get selectedSr(): ServiceRequestObject | null {
    return this.currentSelection?.kind === 'sr' ? this.currentSelection.sr : null;
  }

  get selectedNewContext(): NewRequestContext | null {
    return this.currentSelection?.kind === 'new' ? this.currentSelection.context : null;
  }

  private alarmPollTimer: ReturnType<typeof setTimeout>;
  private srPollTimer: ReturnType<typeof setInterval>;
  private changeSub: Subscription;
  private selectionSub: Subscription;

  constructor(
    private activatedRoute: ActivatedRoute,
    private alarmService: AlarmService,
    private serviceRequestService: ServiceRequestService,
    private serviceRequestChange: ServiceRequestChangeService,
    private alertService: AlertService,
    private bsModalService: BsModalService,
    private ngZone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    this.device = this.activatedRoute.parent?.snapshot.data['contextData'];

    await Promise.all([this.loadAlarms(), this.loadServiceRequests()]);

    this.startAlarmPolling();
    this.startSrPolling();

    this.changeSub = this.serviceRequestChange.change$.subscribe(() => {
      void this.loadServiceRequests();
    });
  }

  ngAfterViewInit(): void {
    this.selectionSub = this.splitView.selectionService.selectedItem$.subscribe((selection) => {
      this.currentSelection = selection;
      this.refreshDerivedSelectionData();
    });

    /**
     * c8y-alarms-interval-refresh only starts its countdown in reaction to a `valueChanges` event
     * on its toggle form control, and that subscription isn't wired up until its own
     * ngAfterViewInit — so flipping this input during our own ngAfterViewInit (which, per Angular's
     * lifecycle order, always runs after the child's) is what actually reaches a live listener.
     * Binding it `true` from the start fires the setter too early, before that listener exists,
     * and the countdown never starts until the user manually toggles it off and on.
     */
    setTimeout(() => (this.autoRefreshToggleEnabled = true));
  }

  ngOnDestroy(): void {
    clearTimeout(this.alarmPollTimer);
    clearInterval(this.srPollTimer);
    this.changeSub?.unsubscribe();
    this.selectionSub?.unsubscribe();
  }

  clearSelection(): void {
    this.splitView.selectionService.clearSelection();
  }

  private linkedSrForAlarm(alarm: IAlarm): ServiceRequestObject | null {
    return this.rows.find((row) => row.alarm?.id === alarm.id)?.sr ?? null;
  }

  private linkedAlarmsForSr(sr: ServiceRequestObject): IAlarm[] {
    const ids = new Set((sr.alarmRefList ?? []).map((ref) => ref.id));

    if (sr.alarmRef?.id) {
      ids.add(sr.alarmRef.id);
    }

    return this.alarms.filter((alarm) => ids.has(String(alarm.id)));
  }

  private refreshDerivedSelectionData(): void {
    if (this.currentSelection?.kind === 'alarm') {
      this.currentLinkedSr = this.linkedSrForAlarm(this.currentSelection.alarm);
    } else if (this.currentSelection?.kind === 'sr') {
      this.currentLinkedAlarms = this.linkedAlarmsForSr(this.currentSelection.sr);
    }
  }

  selectSr(sr: ServiceRequestObject): void {
    this.splitView.selectionService.select({ kind: 'sr', sr });
  }

  selectAlarm(alarm: IAlarm): void {
    this.splitView.selectionService.select({ kind: 'alarm', alarm });
  }

  async loadAlarms(page = 1): Promise<void> {
    if (page === 1) {
      this.loading = this.alarms.length === 0;
    } else {
      this.loadingMore = true;
    }

    this.alarmPage = page;

    const filter: AlarmQueryFilter = {
      source: this.device.id,
      pageSize: ALARM_PAGE_SIZE,
      currentPage: page,
      withTotalPages: page === 1,
      dateFrom: this.dateFrom,
      withSourceAssets: true,
      withSourceDevices: true,
    };

    if (this.customDateTo) {
      filter['dateTo'] = this.customDateTo;
    }

    if (this.selectedAlarmStatuses.length) {
      filter.status = this.selectedAlarmStatuses.join(',');
    }
    if (this.selectedSeverities.length) {
      filter.severity = this.selectedSeverities.join(',');
    }

    const response: IResultList<IAlarm> = await this.alarmService.list(filter);

    if (page === 1) {
      this.alarms = response.data;
      this.alarmTotalPages = response.paging?.totalPages ?? null;
    } else {
      this.alarms = [...this.alarms, ...response.data];
    }

    this.alarmsResult = { ...response, data: this.alarms };
    this.loading = false;
    this.loadingMore = false;
    this.rebuildRows();
  }

  async loadServiceRequests(): Promise<void> {
    this.serviceRequests = await this.serviceRequestService.list({
      sourceId: this.device.id,
      all: true,
    });

    this.rebuildRows();
  }

  loadNextAlarmPage(): void {
    void this.loadAlarms(this.alarmPage + 1);
  }

  /**
   * From c8y-alarms-interval-refresh's (onCountdownEnded) — its countdown ticks via
   * NgZone.runOutsideAngular, so this callback fires outside Angular's zone. Without re-entering
   * the zone, the REST calls still happen but the resulting `rows`/`alarms` mutations never trigger
   * change detection, so the timeline silently doesn't visually refresh.
   */
  onAutoRefreshTick(): void {
    this.ngZone.run(async () => {
      this.autoRefreshLoading$.next(true);

      try {
        await Promise.all([this.loadAlarms(), this.loadServiceRequests()]);
      } finally {
        this.autoRefreshLoading$.next(false);
      }
    });
  }

  hasMoreAlarms(): boolean {
    return !!this.alarmTotalPages && this.alarmPage < this.alarmTotalPages;
  }

  /** From c8y-alarms-filter's (onFilterApplied) — severity checkboxes + "Show cleared alarms". */
  onAlarmsFilterApplied(filters: AlarmListFormFilters): void {
    const allSeverities = Object.keys(filters.severityOptions);
    const selectedSeverities = allSeverities.filter((severity) => filters.severityOptions[severity]);

    this.selectedSeverities = selectedSeverities.length === allSeverities.length ? [] : selectedSeverities;
    this.selectedAlarmStatuses = filters.showCleared ? [] : [AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED];

    void this.loadAlarms();
  }

  /** From c8y-alarms-date-filter's (dateFilterChange) — only the date range is authoritative here. */
  onAlarmsDateFilterChange(filters: AlarmListFormFilters): void {
    if (filters.selectedDates) {
      this.dateFrom = filters.selectedDates[0].toISOString();
      this.customDateTo = filters.selectedDates[1].toISOString();
    } else {
      this.dateFrom = '1970-01-01';
      this.customDateTo = null;
    }

    void this.loadAlarms();
  }

  /** From c8y-alarms-type-filter's (onFilterChanged) — filtered client-side, no refetch needed. */
  onAlarmsTypeFilterChanged(activeFilters: Array<{ filters: { type: string } }>): void {
    this.selectedTypes = activeFilters.map((filter) => filter.filters.type);
    this.rebuildRows();
  }

  async clearAlarm(alarm: IAlarm): Promise<void> {
    try {
      const { data } = await this.alarmService.update({ id: alarm.id, status: AlarmStatus.CLEARED });

      if (data) {
        this.alertService.success('Alarm cleared');
        await this.loadAlarms();
      }
    } catch (error) {
      this.alertService.danger('Alarm could not be cleared', error as string);
    }
  }

  openNewRequestForDevice(): void {
    const context: NewRequestContext = { device: this.device };

    this.splitView.selectionService.select({ kind: 'new', context });
  }

  openNewRequestFromAlarm(alarm: IAlarm): void {
    const context: NewRequestContext = { device: this.device, fromAlarm: alarm };

    this.splitView.selectionService.select({ kind: 'new', context });
  }

  async linkExistingFromAlarm(alarm: IAlarm): Promise<void> {
    const modalRef = this.bsModalService.show(AddExistingRequestModalComponent, {
      initialState: { alarm, deviceId: String(this.device.id) },
    });

    const linkedSr = await firstValueFrom(
      modalRef.content.closeSubject.pipe(take(1))
    );

    if (linkedSr) {
      await this.loadServiceRequests();
      this.selectSr(linkedSr);
    }
  }

  serviceObjectId(): string | undefined {
    return (this.device as unknown as Record<string, unknown>)?.['sr_ServiceObjectId'] as
      | string
      | undefined;
  }

  private rebuildRows(): void {
    const alarmsForRows = this.selectedTypes.length
      ? this.alarms.filter((alarm) => this.selectedTypes.includes(alarm.type))
      : this.alarms;

    this.rows = buildTimelineRows(alarmsForRows, this.serviceRequests);
    this.refreshDerivedSelectionData();
  }

  private startAlarmPolling(): void {
    clearTimeout(this.alarmPollTimer);
    this.alarmPollTimer = setTimeout(() => {
      void this.loadAlarms().then(() => this.startAlarmPolling());
    }, ALARM_POLL_INTERVAL_MS);
  }

  private startSrPolling(): void {
    clearInterval(this.srPollTimer);
    this.srPollTimer = setInterval(() => {
      void this.loadServiceRequests();
    }, SR_POLL_INTERVAL_MS);
  }
}
