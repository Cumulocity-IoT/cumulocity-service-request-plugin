import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlarmQueryFilter, AlarmService, AlarmStatus, IAlarm, IManagedObject, IResultList, Severity } from '@c8y/client';
import { AlertService, SplitViewComponent } from '@c8y/ngx-components';
import { BsModalService } from 'ngx-bootstrap/modal';
import { firstValueFrom, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { ServiceRequestObject, ServiceRequestStatus } from '../../models/service-request.model';
import { ServiceRequestChangeService } from '../../service/service-request-change.service';
import { ServiceRequestMetaService } from '../../service/service-request-meta.service';
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

  readonly severityOptions = Object.values(Severity).filter((v) => typeof v === 'string') as string[];
  readonly alarmStatusOptions = Object.values(AlarmStatus).filter((v) => typeof v === 'string') as string[];
  selectedSeverities: string[] = [];
  selectedAlarmStatuses: string[] = [];

  srStatuses: ServiceRequestStatus[] = [];
  selectedSrStatusIds: string[] = [];

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
    private serviceRequestMetaService: ServiceRequestMetaService,
    private serviceRequestChange: ServiceRequestChangeService,
    private alertService: AlertService,
    private bsModalService: BsModalService
  ) {}

  async ngOnInit(): Promise<void> {
    this.device = this.activatedRoute.parent?.snapshot.data['contextData'];

    const meta = await this.serviceRequestMetaService.fetchMeta();
    this.srStatuses = meta.status;

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
      dateFrom: '1970-01-01',
      dateTo: new Date().toISOString(),
      withSourceAssets: true,
      withSourceDevices: true,
    };

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

    this.loading = false;
    this.loadingMore = false;
    this.rebuildRows();
  }

  async loadServiceRequests(): Promise<void> {
    this.serviceRequests = await this.serviceRequestService.list({
      sourceId: this.device.id,
      all: true,
      statusList: this.selectedSrStatusIds.length ? this.selectedSrStatusIds : undefined,
    });

    this.rebuildRows();
  }

  loadNextAlarmPage(): void {
    void this.loadAlarms(this.alarmPage + 1);
  }

  hasMoreAlarms(): boolean {
    return !!this.alarmTotalPages && this.alarmPage < this.alarmTotalPages;
  }

  async onAlarmFilterChange(): Promise<void> {
    await this.loadAlarms();
  }

  async onSrFilterChange(): Promise<void> {
    await this.loadServiceRequests();
  }

  toggleSeverity(value: string): void {
    this.selectedSeverities = this.toggleInArray(this.selectedSeverities, value);
    void this.onAlarmFilterChange();
  }

  toggleAlarmStatus(value: string): void {
    this.selectedAlarmStatuses = this.toggleInArray(this.selectedAlarmStatuses, value);
    void this.onAlarmFilterChange();
  }

  toggleSrStatus(value: string): void {
    this.selectedSrStatusIds = this.toggleInArray(this.selectedSrStatusIds, value);
    void this.onSrFilterChange();
  }

  private toggleInArray(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
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

  /** sr_ActiveStatus managed-object fragment, e.g. { "medium": 3 } (FR-083). */
  activeStatusEntries(): Array<{ label: string; count: number }> {
    const status = (this.device as unknown as Record<string, unknown>)?.['sr_ActiveStatus'] as
      | Record<string, number>
      | undefined;

    if (!status) {
      return [];
    }

    return Object.entries(status).map(([label, count]) => ({ label, count }));
  }

  serviceObjectId(): string | undefined {
    return (this.device as unknown as Record<string, unknown>)?.['sr_ServiceObjectId'] as
      | string
      | undefined;
  }

  private rebuildRows(): void {
    this.rows = buildTimelineRows(this.alarms, this.serviceRequests);
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
