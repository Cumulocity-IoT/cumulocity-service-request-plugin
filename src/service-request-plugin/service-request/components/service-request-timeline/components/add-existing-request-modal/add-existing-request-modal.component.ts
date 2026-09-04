import { Component, OnInit } from '@angular/core';
import { IAlarm } from '@c8y/client';
import { AlertService } from '@c8y/ngx-components';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';
import { ServiceRequestObject } from '../../../../models/service-request.model';
import { ServiceRequestService } from '../../../../service/service-request.service';

/**
 * "Add existing service request" lookup (FR-085). The service-request-mgmt list API has no
 * server-side title-search query parameter, so filtering happens client-side over the fetched
 * candidate list, consistent with the device-select/alarm-select client-side filtering pattern.
 */
@Component({
  templateUrl: './add-existing-request-modal.component.html',
  styleUrls: ['./add-existing-request-modal.component.less'],
  standalone: false,
})
export class AddExistingRequestModalComponent implements OnInit {
  alarm: IAlarm;
  deviceId: string;

  readonly closeSubject = new Subject<ServiceRequestObject | null>();

  loading = true;
  linking = false;
  searchText = '';
  candidates: ServiceRequestObject[] = [];

  constructor(
    private bsModalRef: BsModalRef,
    private serviceRequestService: ServiceRequestService,
    private alertService: AlertService
  ) {}

  async ngOnInit(): Promise<void> {
    this.candidates = await this.serviceRequestService.list({ sourceId: this.deviceId, all: true });
    this.loading = false;
  }

  filteredCandidates(): ServiceRequestObject[] {
    const query = this.searchText.trim().toLowerCase();

    if (!query) {
      return this.candidates;
    }

    return this.candidates.filter(
      (sr) => sr.id.toLowerCase().includes(query) || sr.title?.toLowerCase().includes(query)
    );
  }

  async pick(sr: ServiceRequestObject): Promise<void> {
    if (this.linking) {
      return;
    }

    this.linking = true;

    try {
      const updated = await this.serviceRequestService.addAlarmRef(sr.id, {
        id: String(this.alarm.id),
        uri: this.alarm.self,
      });

      if (updated) {
        this.alertService.success(`Linked SR-${updated.id} to this alarm`);
        this.closeSubject.next(updated);
        this.bsModalRef.hide();
      }
    } finally {
      this.linking = false;
    }
  }

  cancel(): void {
    this.closeSubject.next(null);
    this.bsModalRef.hide();
  }
}
