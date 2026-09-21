# ADR-0001: Relevance-based filtering for the combined timeline

- **Status**: Accepted — Option A, `isClosed` field
- **Date**: 2026-08-24
- **Supersedes**: FR-068 (`docs/spec.md`)

## Context

The combined timeline (FR-063) shows two different entity kinds in one list: alarms and service
requests, linked one-SR-to-many-alarms (FR-064). The action bar filter currently reused for it is
the standard alarm dashboard filter — `c8y-alarms-filter` (severity, "show cleared"),
`c8y-alarms-date-filter` (date range), `c8y-alarms-type-filter` (alarm type) — wired up in
`ServiceRequestTimelineViewComponent.onAlarmsFilterApplied/onAlarmsDateFilterChange/onAlarmsTypeFilterChanged`
(`service-request-timeline-view.component.ts:252-279`).

This filter set is alarm-shaped. It doesn't have a concept of a service request at all, so FR-068
bolted on an escape hatch: *"All service requests that are not closed shall always be shown ...
the alarm filters have no effect on which service requests are visible."* That rule has a concrete
side effect worth naming: `buildTimelineRows` (`service-request-timeline.util.ts:39-45`) pairs a
service request with its alarm only if that alarm is in the currently loaded/filtered alarm set.
If the user filters out an alarm (e.g. unchecks its severity, or hides cleared alarms) whose linked
service request is still open, the request doesn't disappear — it falls back to rendering as a
standalone box, silently losing its arrow and elapsed-time context to the alarm it's actually about.
The filter UI gives no indication this happened.

More fundamentally: severity, date range, and alarm type describe alarm attributes. They don't map
onto "is this service request relevant right now," so the filter can't express the one thing a user
actually wants to ask of this timeline: *does this entry still need my attention?*

## Problem statement

Design a filter for the timeline's action bar that:

1. Fits both entity kinds (alarm and service request) under one mental model, instead of applying
   only to alarms with a bolted-on exception for requests.
2. Defaults to showing only what's relevant, condensing away noise the user doesn't need to review.
3. Stays simple — the user has explicitly flagged that the current filter's breadth (severity +
   date + type, each with its own popover) is more than this view needs.
4. Still gives the user a way to expand the view when they do want to see everything (audits,
   historical lookup, etc.).

## Relevance rule (proposed default)

An entry is **not relevant** — and hidden by default — when:

- It's an alarm that is `CLEARED` **and** has no linked service request, **or**
- It's an alarm-plus-service-request pair where the alarm is `CLEARED` **and** the service request
  is closed (`isClosed` / status id `10`, per FR-019), **or**
- It's a standalone service request (no `alarmRefList` entries, FR-065) that is closed.

Everything else is relevant and shown by default, in particular:

- Any alarm that is `ACTIVE` or `ACKNOWLEDGED`, regardless of whether it has a linked request.
- Any pair where the linked service request exists and is **not** closed — even if the alarm itself
  is already `CLEARED`. An open request means there's still follow-up work tied to that alarm, so
  the alarm stays visible as context for the request.
- Standalone service requests with no `alarmRefList` entries (FR-065), as long as they're **not**
  closed — consistent with today's FR-068 behavior, just now framed as one instance of the same
  rule (relevant while open, hidden once closed) rather than a special case bolted onto an alarm
  filter.

This directly fixes the "orphaned box" issue above: since a pair only becomes irrelevant once
*both* sides are resolved, an open request never gets separated from its alarm by filtering.

## Decision

**Option A** — a single escape-hatch toggle, no severity/date/type filters. The relevance rule
above is baked into row-building as the default view, not exposed as a filter control at all. The
action bar gets one toggle: **"Show resolved"** (off by default). Turning it on disables the
relevance rule entirely and shows everything, unfiltered — cleared orphan alarms and closed pairs
alike, as one combined state rather than two independently toggleable ones.

This was chosen over keeping a date-range control (Option B) or demoting severity/type into an
"advanced" popover (Option C): both would have preserved a piece of the alarm-only filter this ADR
exists to replace, which cuts against "don't want to make it too complicated." If a date-scoped
historical view turns out to be genuinely needed later, that's a separate, additive control — not
a reason to carry the old filter set forward now.

Closed detection uses **`ServiceRequestObject.isClosed`** (`service-request.model.ts:51`) directly,
rather than deriving it from `status.id === '10'` — simpler, and the field exists specifically to
answer this question.

## Data loading & pagination strategy

The relevant-only default and the "Show resolved" toggle aren't just a display-side filter — they
need different queries, because the two lists (alarms, service requests) can each be arbitrarily
large over a device's lifetime and pulling everything to filter client-side doesn't scale.

The service-request-mgmt OpenAPI spec turns out to already provide most of what's needed for the
service-request side: `GET /request/` takes an `all` parameter — `all=false` (the **default**)
*"returns only active service requests"* (i.e. not closed), `all=true` returns everything including
closed — and caps `pageSize` at **2,000**, the platform-wide maximum for this endpoint. That maps
directly onto the two toggle states, so there's no need to invent client-side closed-filtering for
standalone service requests at all.

**Relevant-only mode (toggle off, default):**

- Service requests: `all: false`, single fetch, `pageSize: 2000`. The server already excludes
  closed requests, satisfying the standalone-SR half of the relevance rule with no client post-filter.
- Alarms: single fetch, `pageSize: 2000` (Cumulocity's core Alarm collection is assumed to share the
  same 2,000-object cap as other platform list endpoints — worth a quick confirmation against a real
  environment before implementing, but not expected to differ), filtered server-side to
  `status: 'ACTIVE,ACKNOWLEDGED'`. This covers every alarm relevant regardless of a linked request.
- Gap: a `CLEARED` alarm whose linked service request is still open won't come back from that
  status-filtered query, but is still relevant per the rule above. Fix: take the `alarmRefList` IDs
  off the (already-fetched, non-closed) service requests, diff against the alarm IDs the status
  query returned, and fetch any missing ones individually via `alarmService.detail(id)` — the same
  on-demand detail-fetch pattern the alarm-ref-picker already uses for unresolved references
  (FR-057). This set is bounded by "how many open requests reference an already-cleared alarm,"
  which is expected to be small regardless of total alarm history, so it stays cheap.
- No "load more" UI in this mode — each entity type is a single bounded fetch. If `withTotalPages`
  ever indicates more than 2,000 truly-relevant items exist for one device, that should still
  surface a "load more" affordance rather than silently truncating (no silent caps), but this is a
  pathological case, not the common path this mode is designed around.

**Show resolved mode (toggle on):**

- Service requests: `all: true`, with real pagination via `currentPage`/`pageSize`/`withTotalPages`
  (already present on `ServiceRequestListRequest`/`ServiceRequestListResponse` but unused for
  paging today — `loadServiceRequests` currently makes one unbounded `all: true` call) and a
  "load more" affordance, since this list is now unbounded history.
- Alarms: drop the status filter; keep today's existing incremental pagination
  (`ALARM_PAGE_SIZE = 50`, `loadNextAlarmPage`, FR-010) unchanged.
- No cross-referencing step needed — both entity types now return every status/closed-state
  directly, so nothing needs reconciling after the fact.

Toggling "Show resolved" switches the fetch strategy and re-queries both entity types — it is
**not** a client-side re-filter over one big preloaded dataset. The two modes want genuinely
different queries (bounded + status-filtered vs. paginated + unfiltered), not the same data sliced
two ways, so treating them as one dataset with a display filter on top would mean either always
paying the unbounded-fetch cost (defeating the point of the default) or never being able to see
true history (defeating the point of the toggle).

## Consequences

- FR-068 will be rewritten to state the relevance rule above instead of "SR filters don't apply to
  alarms."
- `onAlarmsFilterApplied`, `onAlarmsDateFilterChange`, and `onAlarmsTypeFilterChanged` in
  `service-request-timeline-view.component.ts` are removed, along with the `c8y-alarms-filter`,
  `c8y-alarms-date-filter`, and `c8y-alarms-type-filter` components wired to them and the
  `AlarmListFormFilters`-shaped state (`selectedSeverities`, `selectedAlarmStatuses`,
  `selectedTypes`, `dateFrom`, `customDateTo`) backing them.
- `loadAlarms` and `loadServiceRequests` are each rewritten to branch on the toggle state per the
  pagination strategy above, rather than applying one fixed query — `AlarmQueryFilter.status` is
  set to `'ACTIVE,ACKNOWLEDGED'` only in relevant-only mode, and `ServiceRequestListRequest.all` is
  set explicitly per mode instead of always `true`.
- `loadServiceRequests` gains genuine pagination (`currentPage`/`loadingMore`/"load more") for the
  first time — today it always loads everything in one call regardless of any toggle.
- A new reconciliation step (diff open SRs' `alarmRefList` against fetched alarm IDs, fetch gaps via
  `alarmService.detail`) is added to relevant-only alarm loading, reusing the alarm-ref-picker's
  existing detail-fetch pattern rather than a new one.
- The action bar gains one new "Show resolved" toggle, replacing the old filter UI; flipping it
  triggers a fresh `loadAlarms`/`loadServiceRequests` in the new mode rather than re-rendering
  already-loaded data.
- Because the alarm reconciliation step guarantees a `CLEARED`-but-linked-to-an-open-request alarm
  is always fetched alongside its request, this also fixes the orphaned-box issue from the Context
  section: a pair is never split apart by filtering, in either loading mode.
