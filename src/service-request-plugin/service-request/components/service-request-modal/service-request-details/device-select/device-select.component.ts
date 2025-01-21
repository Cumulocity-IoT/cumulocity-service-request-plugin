import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { IManagedObject, InventoryService, IResultList } from '@c8y/client';
import { ManagedObjectRealtimeService } from '@c8y/ngx-components';
import { Subscription, pipe, UnaryFunction, Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'sr-device-select',
  templateUrl: './device-select.component.html',
  styleUrls: ['./device-select.component.less'],
  providers: [ManagedObjectRealtimeService],
})
export class DeviceSelectComponent implements OnDestroy {
  @Input('label') label!: string;

  @Input('disabled') disabled = true;

  @Input('device') set device(device: IManagedObject) {
    this.initDevice(device);

    from(this.loadDeviceList()).subscribe((devices) => (this.devices = devices));
  }

  @Output('deviceChange') deviceChange = new EventEmitter<IManagedObject>();

  selectedDevice!: IManagedObject | null;

  searchPattern!: string;

  devices!: IResultList<Partial<IManagedObject>>;

  filterPipe!: UnaryFunction<Observable<IManagedObject[]>, Observable<IManagedObject[]>>;

  private sub!: Subscription | null;

  constructor(
    private realtimeService: ManagedObjectRealtimeService,
    private inventoryService: InventoryService
  ) {}

  ngOnDestroy(): void {
    this.clearDevice();
  }

  deselectDevice(): void {
    this.clearDevice();
  }

  async loadDeviceList() {
    const filter = {
      pageSize: 2000,
      withTotalPages: true,
      fragmentType: 'c8y_IsDevice',
    };

    return await this.inventoryService.list(filter);
  }

  selectDevice(device: IManagedObject) {
    this.initDevice(device);

    this.deviceChange.emit(device);
  }

  setFilter(filter: string) {
    this.searchPattern = filter;

    this.filterPipe = pipe(
      map((data: IManagedObject[]) => {
        return data.filter((mo) => mo['name']?.toLowerCase().includes(filter.toLowerCase()));
      })
    );
  }

  private clearDevice(): void {
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = null;
    }

    this.selectedDevice = null;
  }

  private initDevice(device: IManagedObject): void {
    this.clearDevice();

    this.selectedDevice = device;
    this.sub = this.realtimeService.onUpdate$(device.id).subscribe((d) => {
      this.selectedDevice = d;
    });
  }
}
