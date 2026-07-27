import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate } from '@angular/router';
import { IManagedObject } from '@c8y/client';
import { SERVICE_REQUEST_ASSET_FRAGMENT } from '../models/service-request.model';
import { ServiceRequestAssetTypesService } from '../service/service-request-asset-types.service';
import { ServiceRequestService } from '../service/service-request.service';

/**
 * Guards the service request dashboard in the group context. The group context is also
 * used for plain device groups, so the dashboard is only shown for managed objects
 * carrying the `c8y_IsAsset` fragment and, if configured via tenant option, only for the
 * listed asset types.
 */
@Injectable({ providedIn: 'root' })
export class ServiceRequestAssetGuard implements CanActivate {

  // cache the response to not trigger a check again and again
  isAvailable: Promise<boolean>;

  constructor(
    private serviceRequestService: ServiceRequestService,
    private assetTypesService: ServiceRequestAssetTypesService
  ) {
    this.isAvailable = this.serviceRequestService.isAvailable();
  }

  async canActivate(activeRoute: ActivatedRouteSnapshot): Promise<boolean> {
    if (!activeRoute || !activeRoute.parent) {
      return false;
    }

    if (!(await this.isAvailable)) {
      return false;
    }

    const asset = (activeRoute.data['contextData'] ||
      activeRoute.parent.data['contextData']) as IManagedObject;

    if (!asset || !(SERVICE_REQUEST_ASSET_FRAGMENT in asset)) {
      return false;
    }

    return this.assetTypesService.isAssetTypeEnabled(asset['type']);
  }
}
