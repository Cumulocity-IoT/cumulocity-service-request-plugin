import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * App-wide "something about a service request changed" signal (created, updated, resolved,
 * linked to an alarm). Components that render service request data (the combined timeline,
 * detail panels) subscribe to change$ to know when to refresh.
 */
@Injectable({ providedIn: 'root' })
export class ServiceRequestChangeService {
  private readonly changeSubject = new Subject<void>();

  readonly change$ = this.changeSubject.asObservable();

  notifyChange(): void {
    this.changeSubject.next();
  }
}
