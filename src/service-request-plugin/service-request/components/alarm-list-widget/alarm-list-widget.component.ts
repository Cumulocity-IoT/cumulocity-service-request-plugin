import { Component, Input, OnDestroy } from '@angular/core';
import {
  AlarmService,
  AlarmStatus,
  IAlarm,
  IResultList,
  Severity,
} from '@c8y/client';
import { AlertService, Item, SelectableItem } from '@c8y/ngx-components';
import { AlarmsListWidgetConfig } from './alarm-list-widget.model';
import { ServiceRequestModalService } from '../../service/service-request-modal.service';

interface RequestFilter {
  [key: string]: any;
}

@Component({
  templateUrl: './alarm-list-widget.component.html',
  styleUrls: ['./alarm-list-widget.component.less'],
})
export class AlarmListWidgetComponent implements OnDestroy {
  @Input() set config(config: AlarmsListWidgetConfig) {
    this._config = config;
    this.selectedStatusTypes =
      config.status
        ?.filter((status) =>
          this.statusTypes.find((statusType) => statusType.label === status)
        )
        .sort()
        .map((status) =>
          this.statusTypes.find((statusType) => statusType.label === status)
        )
        .filter((statusType) => statusType !== undefined) ?? [];

    this.selectedSeverityTypes =
      config.severity
        ?.filter((severity) =>
          this.severityTypes.find(
            (severityType) => severityType.label === severity
          )
        )
        .sort()
        .map((severity) =>
          this.severityTypes.find(
            (severityType) => severityType.label === severity
          )
        )
        .filter((severityType) => severityType !== undefined) ?? [];

    void this.loadAlarms();
  }

  get config(): AlarmsListWidgetConfig {
    return this._config;
  }

  readonly statusTypes: SelectableItem[] = Object.keys(AlarmStatus)
    .filter((item) => isNaN(Number(item)))
    .sort()
    .map((statusType) => ({ label: statusType, value: statusType }));

  readonly severityTypes: SelectableItem[] = Object.keys(Severity)
    .filter((item) => isNaN(Number(item)))
    .sort()
    .map((severityType) => ({ label: severityType, value: severityType }));

  selectedStatusTypes: SelectableItem[] = [];

  selectedSeverityTypes: SelectableItem[] = [];

  pollingEnabled = true;

  loading = false;

  loadMore = false;

  alarms: IAlarm[] = [];

  page = 1;

  totalPages!: number | null;

  private pollingTimeout!: NodeJS.Timeout;

  private _config!: AlarmsListWidgetConfig;

  constructor(
    private alarmsSevice: AlarmService,
    private alertService: AlertService,
    private serviceRequestModal: ServiceRequestModalService
  ) {}

  ngOnDestroy(): void {
    this.stopPolling();
  }

  async loadAlarms(page = 1): Promise<void> {
    if (!this.alarms || this.alarms.length === 0) {
      this.loading = true;
    } else {
      this.loadMore = true;
    }
    this.page = page;

    const response = await this.alarmsSevice.list(this.buildFilter());

    this.handleResponse(response);

    this.loading = false;
    this.loadMore = false;

    if (this.pollingEnabled) {
      void this.startPolling();
    }
  }

  reload(): void {
    this.alarms = [];
    this.pollingEnabled = true;
    void this.loadAlarms();
  }

  loadNextPage(page = this.page + 1) {
    this.pollingEnabled = false;
    void this.loadAlarms(page);
  }

  togglePolling(state = !this.pollingEnabled) {
    this.pollingEnabled = state;

    if (state) {
      void this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  openServiceRequestModal(alarm: IAlarm): void {
    this.serviceRequestModal.openForAlarm(alarm);
  }

  async clearAlarm(alarm: IAlarm) {
    try {
      const { data } = await this.alarmsSevice.update({
        id: alarm.id,
        status: AlarmStatus.CLEARED,
      });

      if (data) {
        this.alertService.success('alarms-widget.success.cleared');
        this.reload();
      }
    } catch (error) {
      this.alertService.danger(
        'alarms-widget.error.not-cleared',
        error as string
      );
    }
  }

  async onStatusOrSeverityChange() {
    await this.loadAlarms();
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollingTimeout = setTimeout(() => {
      void this.loadAlarms();
    }, 60 * 1000);
  }

  private stopPolling() {
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
    }
  }

  private buildFilter(page = this.page): RequestFilter {
    const now = new Date();
    const filter: { [key: string]: any } = {
      source: this.config.device.id,
      pageSize: 20,
      currentPage: page,
      dateFrom: '1970-01-01',
      dateTo: now.toISOString(),
      query: this.buildQueryFilter(),
      // type:
      status: this.joinArrayConfig(
        this.selectedStatusTypes.map((statusType) => statusType.label)
      ),
      severity: this.joinArrayConfig(
        this.selectedSeverityTypes.map((severityType) => severityType.label)
      ),
      withSourceAssets: this.config.showSubassets || false,
      withSourceDevices: this.config.showSubassets || false,
    };

    if (page === 1) {
      this.totalPages = null;
      filter['withTotalPages'] = true;
    }

    return filter;
  }

  private buildQueryFilter(): string {
    let filter = 'severity asc,time.date desc,text asc';

    if (this.config.order === 'status') {
      filter = 'status asc,' + filter;
    }

    return '$orderby=' + filter;
  }

  private joinArrayConfig(config: string[]): string | null {
    return config && config.length ? config.join(',') : null;
  }

  private handleResponse(response: IResultList<IAlarm>): void {
    const alarms = response.data;

    if (response.paging?.currentPage === 1) {
      this.alarms = alarms;
      this.totalPages = response.paging.totalPages;
    } else {
      this.alarms = [...this.alarms, ...alarms]; // better join
    }
  }
}
