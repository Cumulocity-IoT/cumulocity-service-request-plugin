import { IAlarm, IManagedObject } from '@c8y/client';
import { ServiceRequestObject } from '../../models/service-request.model';
import { TimelineRow } from './models/service-request-timeline.model';

/** True for an actual device (`c8y_IsDevice`), as opposed to a group or asset. */
export function isDevice(managedObject: IManagedObject | null | undefined): boolean {
  return !!(managedObject as unknown as Record<string, unknown>)?.['c8y_IsDevice'];
}

/**
 * True for an asset (`c8y_IsAsset`) — e.g. a Digital Twin Manager asset, which carries this
 * fragment alongside `c8y_IsDeviceGroup` since it reuses the group hierarchy for navigation while
 * still being a valid, single service-request target (unlike a plain organizational group).
 */
export function isAsset(managedObject: IManagedObject | null | undefined): boolean {
  return !!(managedObject as unknown as Record<string, unknown>)?.['c8y_IsAsset'];
}

/** True for a group or smart group (`c8y_IsDeviceGroup`/`c8y_IsDynamicGroup`), as opposed to a device or asset. */
export function isGroup(managedObject: IManagedObject | null | undefined): boolean {
  const mo = managedObject as unknown as Record<string, unknown>;

  return !!mo?.['c8y_IsDeviceGroup'] || !!mo?.['c8y_IsDynamicGroup'];
}

export function alarmIdsOf(sr: ServiceRequestObject): string[] {
  const ids = (sr.alarmRefList ?? []).map((ref) => ref.id);

  if (sr.alarmRef?.id && !ids.includes(sr.alarmRef.id)) {
    ids.push(sr.alarmRef.id);
  }

  return ids;
}

function timestampOf(value: string | Date | undefined): number {
  if (!value) {
    return 0;
  }

  return new Date(value).getTime();
}

export function getDayLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * Merges alarms and service requests into the combined, newest-first timeline (FR-063/FR-064).
 * A service request pairs with an alarm when the alarm's id appears in the request's
 * alarmRefList; a service request whose referenced alarm isn't in the currently loaded alarm
 * list falls back to rendering as its own standalone row. In relevant-only mode (FR-068) the
 * view component pre-fetches any cleared-but-linked-to-an-open-request alarm individually so
 * this fallback shouldn't normally trigger there — it remains a safety net either way.
 */
export function buildTimelineRows(
  alarms: IAlarm[],
  serviceRequests: ServiceRequestObject[]
): TimelineRow[] {
  const alarmIds = new Set(alarms.map((alarm) => String(alarm.id)));
  const srByAlarmId = new Map<string, ServiceRequestObject>();
  const linkedSrIds = new Set<string>();

  for (const sr of serviceRequests) {
    const ids = alarmIdsOf(sr).filter((id) => alarmIds.has(id));

    if (ids.length) {
      linkedSrIds.add(sr.id);
    }

    for (const id of ids) {
      if (!srByAlarmId.has(id)) {
        srByAlarmId.set(id, sr);
      }
    }
  }

  const rows: TimelineRow[] = alarms.map((alarm) => {
    const sr = srByAlarmId.get(String(alarm.id));
    const alarmTimestamp = timestampOf(alarm.creationTime ?? alarm.time);
    const deltaMinutes = sr
      ? Math.round((timestampOf(sr.creationTime) - alarmTimestamp) / 60000)
      : undefined;

    return {
      id: `alarm-${alarm.id}`,
      timestamp: alarmTimestamp,
      dayLabel: getDayLabel(alarmTimestamp),
      alarm,
      sr,
      deltaMinutes,
    };
  });

  for (const sr of serviceRequests) {
    if (linkedSrIds.has(sr.id)) {
      continue;
    }

    const timestamp = timestampOf(sr.creationTime);

    rows.push({
      id: `sr-${sr.id}`,
      timestamp,
      dayLabel: getDayLabel(timestamp),
      sr,
    });
  }

  return rows.sort((a, b) => b.timestamp - a.timestamp);
}
