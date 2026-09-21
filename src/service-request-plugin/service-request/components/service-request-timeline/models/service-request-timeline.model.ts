import { IAlarm, IManagedObject } from '@c8y/client';
import { ServiceRequestObject } from '../../../models/service-request.model';

/**
 * Context passed to the creation panel. `device` is always the request's target — either the
 * specific alarm's source, or the device/asset the "New service request" action bar button was
 * opened from (that button only shows on a device/asset scope, never on a group or the tenant-wide
 * root, so there's never a target left for the user to pick — FR-092).
 */
export interface NewRequestContext {
  device: IManagedObject;
  fromAlarm?: IAlarm;
}

/**
 * Discriminated union of what the split-view detail panel is currently showing.
 * Selection is tracked centrally via the c8y-sv SplitViewSelectionService instance shared by
 * the timeline list and the detail panel (both are content-projected into the same <c8y-sv>).
 */
export type TimelineSelection =
  | { kind: 'alarm'; alarm: IAlarm }
  | { kind: 'sr'; sr: ServiceRequestObject }
  | { kind: 'new'; context: NewRequestContext };

/**
 * One row of the combined timeline: either an alarm (optionally paired with the single service
 * request that references it, per FR-064) or a standalone service request with no alarm link.
 */
export interface TimelineRow {
  /** Stable key for *ngFor tracking; independent of object identity so reloads don't reshuffle the DOM. */
  id: string;
  timestamp: number;
  dayLabel: string;
  alarm?: IAlarm;
  sr?: ServiceRequestObject;
  /** Elapsed time between the alarm and its paired request's creation, in minutes (only set when both exist). */
  deltaMinutes?: number;
}

export interface AlarmFilterState {
  severities: string[];
  statuses: string[];
}

export interface ServiceRequestFilterState {
  statusIds: string[];
}
