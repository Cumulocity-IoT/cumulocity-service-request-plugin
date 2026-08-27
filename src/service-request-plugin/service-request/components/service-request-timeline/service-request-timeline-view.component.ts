import { AfterViewInit, Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlarmQueryFilter, AlarmService, AlarmStatus, IAlarm, IManagedObject, IResultList } from '@c8y/client';
import { AlertService, SplitViewComponent } from '@c8y/ngx-components';
import { BsModalService } from 'ngx-bootstrap/modal';
import { BehaviorSubject, firstValueFrom, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { ServiceRequestListRequest, ServiceRequestObject } from '../../models/service-request.model';
import { ServiceRequestChangeService } from '../../service/service-request-change.service';
import { ServiceRequestService } from '../../service/service-request.service';
import { AddExistingRequestModalComponent } from './components/add-existing-request-modal/add-existing-request-modal.component';
import { NewRequestContext, TimelineRow, TimelineSelection } from './models/service-request-timeline.model';
import { alarmIdsOf, buildTimelineRows, isGroup } from './service-request-timeline.util';

const ALARM_PAGE_SIZE = 50;
const ALARM_POLL_INTERVAL_MS = 60 * 1000;
const SR_POLL_INTERVAL_MS = 180 * 1000;
/** Both list endpoints cap pageSize at 2000 (ADR-0001) — relevant-only mode fetches in one shot. */
const RELEVANT_PAGE_SIZE = 2000;

@Component({
  templateUrl: './service-request-timeline-view.component.html',
  styleUrls: ['./service-request-timeline-view.component.less'],
  standalone: false,
})
export class ServiceRequestTimelineViewComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(SplitViewComponent) splitView!: SplitViewComponent<TimelineSelection>;

  /**
   * The current scope's managed object: a device or group/asset when opened as a context tab
   * (fixed, from the route), a user-picked device/group/asset when opened as the top-level view
   * and a source has been selected (FR-090), or null for the top-level view's default tenant-wide
   * scope (FR-089).
   */
  scopeObject: IManagedObject | null = null;
  /** True when opened via the top-level nav route rather than a device/group context tab (FR-088). */
  isGlobalView = false;

  /**
   * "New service request" only makes sense once there's a single implicit target to create it on
   * (FR-092) — a device or plain asset, never a group (too ambiguous which member to attach to)
   * and never the tenant-wide root (no scope at all). v1 has no device picker, so anything else
   * simply hides the button.
   */
  get canCreateFromScope(): boolean {
    return !!this.scopeObject && !isGroup(this.scopeObject);
  }

  alarms: IAlarm[] = [];
  serviceRequests: ServiceRequestObject[] = [];
  rows: TimelineRow[] = [];

  loading = false;
  loadingMore = false;
  loadingMoreSr = false;
  alarmPage = 1;
  alarmTotalPages: number | null = null;
  srPage = 1;
  srTotalPages: number | null = null;

  /**
   * "Show resolved" toggle (ADR-0001, FR-068). Off by default: alarms/service requests are
   * fetched with the relevance rule applied server-side (see loadAlarms/loadServiceRequests).
   * Flipping it re-queries both entity types in the other mode — it does not re-filter
   * already-loaded data, since the two modes use genuinely different queries.
   */
  showResolved = false;

  /** See ngAfterViewInit — flipped true only once c8y-alarms-interval-refresh can react to it. */
  autoRefreshToggleEnabled = false;
  /**
   * c8y-alarms-interval-refresh only restarts its countdown when this emits `false` — it stops the
   * countdown on every emission and only resets (restarts) it once the emitted value is falsy, so
   * a full reload cycle must toggle this true -> false to keep the auto-refresh loop going.
   */
  autoRefreshLoading$ = new BehaviorSubject<boolean>(false);

  currentSelection: TimelineSelection | null = null;
  /**
   * Derived from currentSelection, recomputed only when the selection or the underlying
   * alarm/SR data actually changes (never inline in the template) — calling .filter()/.find()
   * directly in a template binding returns a new array/value every change-detection cycle,
   * which makes Angular re-fire ngOnChanges on the child component on every tick.
   */
  currentLinkedSr: ServiceRequestObject | null = null;

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
    this.scopeObject = this.activatedRoute.parent?.snapshot.data['contextData'] ?? null;
    this.isGlobalView = !this.scopeObject;

    await this.refreshAll();

    this.startAlarmPolling();
    this.startSrPolling();

    this.changeSub = this.serviceRequestChange.change$.subscribe(() => {
      void this.refreshAll();
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

  private refreshDerivedSelectionData(): void {
    if (this.currentSelection?.kind === 'alarm') {
      this.currentLinkedSr = this.linkedSrForAlarm(this.currentSelection.alarm);
    }
  }

  selectSr(sr: ServiceRequestObject): void {
    this.splitView.selectionService.select({ kind: 'sr', sr });
  }

  /**
   * "Show resolved" toggle handler (ADR-0001). Resets both lists' pagination state and re-queries
   * from scratch in the new mode, rather than re-filtering the data already held in memory.
   */
  onShowResolvedToggle(showResolved: boolean): void {
    this.showResolved = showResolved;
    this.alarms = [];
    this.serviceRequests = [];
    void this.refreshAll();
  }

  /** Top-level view's source selector (FR-090) — narrows scope to a device/group/asset, or clears back to the tenant-wide default (FR-089). */
  onScopeChange(scopeObject: IManagedObject | null): void {
    this.scopeObject = scopeObject ?? null;
    this.alarms = [];
    this.serviceRequests = [];
    this.clearSelection();
    void this.refreshAll();
  }

  /** Full reload of both entity types for the current mode, plus relevance reconciliation. */
  async refreshAll(): Promise<void> {
    this.alarmPage = 1;
    this.alarmTotalPages = null;
    this.srPage = 1;
    this.srTotalPages = null;

    await Promise.all([this.loadAlarms(), this.loadServiceRequests()]);

    if (!this.showResolved) {
      await this.includeClearedAlarmsLinkedToOpenRequests();
    }

    this.rebuildRows();
  }

  async loadAlarms(page = 1): Promise<void> {
    if (page === 1) {
      this.loading = this.alarms.length === 0;
    } else {
      this.loadingMore = true;
    }

    this.alarmPage = page;

    const filter: AlarmQueryFilter = {
      dateFrom: '1970-01-01',
      currentPage: page,
    };

    // No scopeObject means the top-level view's default tenant-wide scope (FR-089) — omit
    // `source` entirely rather than filtering by anything. withSourceAssets/withSourceDevices
    // (FR-087) traverse the hierarchy under scopeObject when it's a group/asset; they're a no-op
    // for a leaf device.
    if (this.scopeObject) {
      filter.source = this.scopeObject.id;
      filter.withSourceAssets = true;
      filter.withSourceDevices = true;
    }

    if (this.showResolved) {
      // Full history, paginated (FR-010) — the user has explicitly opted into browsing everything.
      filter.pageSize = ALARM_PAGE_SIZE;
      filter.withTotalPages = page === 1;
    } else {
      // Relevance rule (FR-068): only alarms that are relevant regardless of a linked service
      // request. Cleared alarms still relevant via an open, linked request are added separately —
      // see includeClearedAlarmsLinkedToOpenRequests.
      filter.pageSize = RELEVANT_PAGE_SIZE;
      filter.withTotalPages = true;
      filter.status = `${AlarmStatus.ACTIVE},${AlarmStatus.ACKNOWLEDGED}`;
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

  async loadServiceRequests(page = 1): Promise<void> {
    if (page > 1) {
      this.loadingMoreSr = true;
    }

    this.srPage = page;

    // See loadAlarms: no scopeObject means the top-level view's tenant-wide scope (FR-089), so
    // sourceId/withSourceAssets/withSourceDevices are omitted entirely rather than filtering by
    // anything. When scopeObject is a group/asset, the two withSource* flags (FR-087) traverse the
    // hierarchy the same way the alarm API's identically-named flags do.
    const sourceFilter: Pick<ServiceRequestListRequest, 'sourceId' | 'withSourceAssets' | 'withSourceDevices'> =
      this.scopeObject
        ? { sourceId: String(this.scopeObject.id), withSourceAssets: true, withSourceDevices: true }
        : {};

    const { data, totalPages } = await this.serviceRequestService.listPaged(
      this.showResolved
        ? {
            // Full history, paginated (ADR-0001) — new for service requests, mirrors alarms' FR-010.
            ...sourceFilter,
            all: true,
            currentPage: page,
            withTotalPages: page === 1,
          }
        : {
            // all:false is the API's own default and already excludes closed requests server-side
            // (ADR-0001) — satisfies the standalone-request half of the relevance rule for free.
            ...sourceFilter,
            all: false,
            pageSize: RELEVANT_PAGE_SIZE,
            withTotalPages: true,
          }
    );

    if (page === 1) {
      this.serviceRequests = data;
      this.srTotalPages = totalPages;
    } else {
      this.serviceRequests = [...this.serviceRequests, ...data];
      this.srTotalPages = totalPages ?? this.srTotalPages;
    }

    this.loadingMoreSr = false;
    this.rebuildRows();
  }

  loadNextAlarmPage(): void {
    void this.loadAlarms(this.alarmPage + 1);
  }

  loadNextSrPage(): void {
    void this.loadServiceRequests(this.srPage + 1);
  }

  /**
   * Relevant-only mode only (ADR-0001): a CLEARED alarm whose linked service request is still
   * open is relevant, but won't come back from loadAlarms' ACTIVE/ACKNOWLEDGED status filter.
   * Fetches just those specific alarms by id — the same on-demand detail-fetch pattern the
   * alarm-ref-picker uses (FR-057) — bounded by "how many open requests reference an
   * already-cleared alarm," not by total alarm history.
   */
  private async includeClearedAlarmsLinkedToOpenRequests(): Promise<void> {
    const loadedIds = new Set(this.alarms.map((alarm) => String(alarm.id)));
    const missingIds = new Set<string>();

    for (const sr of this.serviceRequests) {
      if (sr.isClosed) {
        continue;
      }

      for (const id of alarmIdsOf(sr)) {
        if (!loadedIds.has(id)) {
          missingIds.add(id);
        }
      }
    }

    if (!missingIds.size) {
      return;
    }

    const fetched = await Promise.all(
      Array.from(missingIds).map(async (id) => {
        try {
          const { data } = await this.alarmService.detail(id);

          return data ?? null;
        } catch (error) {
          return null;
        }
      })
    );

    const additional = fetched.filter((alarm): alarm is IAlarm => !!alarm);

    if (additional.length) {
      this.alarms = [...this.alarms, ...additional];
    }
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
        await this.refreshAll();
      } finally {
        this.autoRefreshLoading$.next(false);
      }
    });
  }

  hasMoreAlarms(): boolean {
    return !!this.alarmTotalPages && this.alarmPage < this.alarmTotalPages;
  }

  hasMoreServiceRequests(): boolean {
    return !!this.srTotalPages && this.srPage < this.srTotalPages;
  }

  async clearAlarm(alarm: IAlarm): Promise<void> {
    try {
      const { data } = await this.alarmService.update({ id: alarm.id, status: AlarmStatus.CLEARED });

      if (data) {
        this.alertService.success('Alarm cleared');
        await this.refreshAll();
      }
    } catch (error) {
      this.alertService.danger('Alarm could not be cleared', error as string);
    }
  }

  /** Only reachable when {@link canCreateFromScope} is true, i.e. `scopeObject` is a device/asset. */
  openNewRequestForDevice(): void {
    const context: NewRequestContext = { device: this.scopeObject };

    this.splitView.selectionService.select({ kind: 'new', context });
  }

  openNewRequestFromAlarm(alarm: IAlarm): void {
    // The alarm's own source supplies the device implicitly (FR-028, FR-092) — not the current
    // scope, which may be a group/asset, the tenant-wide view, or a different device entirely.
    const context: NewRequestContext = { device: alarm.source as unknown as IManagedObject, fromAlarm: alarm };

    this.splitView.selectionService.select({ kind: 'new', context });
  }

  async linkExistingFromAlarm(alarm: IAlarm): Promise<void> {
    const modalRef = this.bsModalService.show(AddExistingRequestModalComponent, {
      initialState: { alarm, deviceId: String(alarm.source.id) },
    });

    const linkedSr = await firstValueFrom(
      modalRef.content.closeSubject.pipe(take(1))
    );

    if (linkedSr) {
      await this.refreshAll();
      this.selectSr(linkedSr);
    }
  }

  serviceObjectId(): string | undefined {
    return (this.scopeObject as unknown as Record<string, unknown>)?.['sr_ServiceObjectId'] as
      | string
      | undefined;
  }

  private rebuildRows(): void {
    this.rows = buildTimelineRows(this.alarms, this.serviceRequests);
    this.refreshDerivedSelectionData();
  }

  /**
   * Both poll loops call refreshAll (not the individual loaders) so relevant-only mode's
   * reconciliation step (includeClearedAlarmsLinkedToOpenRequests) always re-runs alongside any
   * background alarm reload — otherwise a plain loadAlarms() would overwrite this.alarms and
   * silently drop the cleared-but-linked-to-an-open-request alarms the previous reconciliation
   * had added.
   */
  private startAlarmPolling(): void {
    clearTimeout(this.alarmPollTimer);
    this.alarmPollTimer = setTimeout(() => {
      void this.refreshAll().then(() => this.startAlarmPolling());
    }, ALARM_POLL_INTERVAL_MS);
  }

  private startSrPolling(): void {
    clearInterval(this.srPollTimer);
    this.srPollTimer = setInterval(() => {
      void this.refreshAll();
    }, SR_POLL_INTERVAL_MS);
  }
}
