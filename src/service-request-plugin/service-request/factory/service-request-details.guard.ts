import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate } from '@angular/router';
import { ServiceRequestService } from '../service/service-request.service';

// TODO: change to Injectable once provider mechanism works again!
@Injectable({providedIn: 'root'})
export class ServiceRequestDetailsGuard implements CanActivate {

  // cache the response to not trigger a check again and again
  isAvailable: Promise<boolean>;
  
  constructor(private serviceRequestService: ServiceRequestService) {
    this.isAvailable = this.serviceRequestService.isAvailable();
  }

  canActivate(activeRoute: ActivatedRouteSnapshot): boolean | Promise<boolean> {
    if (!activeRoute || !activeRoute.parent) {
      return false;
    }

    return this.isAvailable;
  }
}
