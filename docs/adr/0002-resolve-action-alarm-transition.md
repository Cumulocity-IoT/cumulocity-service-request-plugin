# ADR-0002: Making "Resolve" close the request and clear its linked alarm(s)

- **Status**: Accepted — Option A, status picker
- **Date**: 2026-09-15
- **Relates to**: FR-037, FR-038, FR-078 (`docs/spec.md`)

## Context

The detail panel's "Resolve" action (`SrDetailPanelComponent.resolve()`,
`sr-detail-panel.component.ts:213-239`) confirms with the user, then calls
`ServiceRequestService.resolve()` (`service-request.service.ts:201-233`), which sends:

```
PUT /service/service-request-mgmt/api/service/request/{serviceRequestId}
Body: { isActive: false }
```

This matches the microservice's `updateServiceRequestById` operation
(`openapi.json:53-99`), body schema `ServiceRequestPatchRqBody`. Two things in that schema explain
why clicking Resolve leaves the linked alarm open:

- `isActive` is documented as **deprecated**: *"Service request active flag... this field is
  managed internally and will be removed in the next version"* (`openapi.json:1584-1589`). Resolve
  is patching a field the backend itself says it no longer really acts on.
- The only mechanism the microservice has for cascading an SR change onto its linked alarm is
  **`ServiceRequestStatusConfig`** (`openapi.json:2157-2208`, returned by `GET /request/status` /
  `getServiceRequestStatusConfigList`, `openapi.json:991-1012`). Each tenant-configured status can
  declare:
  - `alarmStatusTransition` (e.g. `"ACKNOWLEDGED"`, `"CLEARED"`) — sets the linked alarm's status
    when that SR status is applied.
  - `isClosedTransition` — closes the SR (`isClosed: true`) when that status is applied.

  That cascade only fires when a SR's `status` field is changed to one of these configured statuses
  via `PUT /request/{id}`.

This plugin never sends `status` in that PUT. That's intentional today: FR-037 scopes Resolve to
exactly `isActive: false`, and FR-078 states *"the Status field shall always be read-only... status
is set exclusively by the system/FSM integration and is never manually edited."* So Resolve can
never trigger `alarmStatusTransition` — it only flips a flag the backend now treats as
internally-managed, and touches nothing else. The alarm stays open, and the SR is never actually
marked `isClosed`.

Complicating a fix: the status list is **tenant-configured**, not a fixed enum. The current
frontend model doesn't even carry the fields needed to reason about it —
`ServiceRequestStatus` (`service-request.model.ts:27-30`) only has `{ id, name }`, while the actual
`GET /request/status` response is `ServiceRequestStatusConfig[]`, which also carries
`alarmStatusTransition`, `isClosedTransition`, `isDeactivateTransition`, `isInitialStatus`, and
`icon` — all currently discarded by `ServiceRequestService.statusList()`
(`service-request.service.ts:304-328`).

## Problem statement

Decide how "Resolve" determines *which* configured status to apply (if any), so that:

1. Clicking Resolve results in a closed service request (`isClosed: true`) and its linked alarm(s)
   cleared — matching the user-facing meaning of the word "Resolve".
2. The behavior still works across tenants with different, independently configured status lists —
   nothing here should assume a fixed status name or id exists.
3. The UX cost is proportional to the actual ambiguity: a tenant with one obvious "closing" status
   shouldn't be forced through an extra picker just because the underlying model is configurable in
   general.

## Options

### Option A — Status picker for Resolve

Replace the single "Resolve" button with a control that lists only the tenant's configured statuses
where `isClosedTransition: true` (fetched via `GET /request/status`, filtered client-side) and lets
the user pick which one to apply. Statuses without `isClosedTransition` (e.g. intermediate
in-progress statuses) are excluded — this picker is scoped to "how do you want to close this
request," not a general status editor. The chosen status is sent as `status` in the
`PUT /request/{id}` body; the microservice then applies whatever `alarmStatusTransition` that status
is configured with.

- **Pros**: Most correct and most flexible — always matches whatever the tenant actually
  configured, including tenants with several distinct "closing" statuses (e.g. Resolved vs.
  Rejected) that should behave differently. No guessing logic to get wrong. Filtering to
  `isClosedTransition: true` keeps the picker scoped to closing outcomes only, rather than exposing
  the tenant's entire status list (including non-closing, in-progress ones) as Resolve options.
- **Cons**: Real UX change — one click becomes pick-then-confirm, for every tenant, even ones with
  a single closing status. Sits in direct tension with FR-078 ("status is never manually edited"),
  which would need to be narrowed or superseded to allow this one, deliberate exception. Degenerate
  case: if a tenant has configured **zero** closing statuses, the picker has nothing to offer and
  Resolve would need a defined fallback (e.g. disabled with an explanatory tooltip).
- **Naming**: since the picker can surface non-resolution closing statuses (e.g. "Rejected",
  "Cancelled") alongside "Resolved", labeling the button "Resolve" would misrepresent what it does
  once a non-resolution status is picked. Under this option the button should be renamed
  **"Close"** — describing the mechanical action (closing the request), with the chosen status
  itself carrying the actual outcome semantics. This renaming is specific to Option A; under Option
  B or C, where Resolve maps to one implicit target (a single detected status, or just clearing the
  alarm), "Resolve" remains the accurate label and should be kept.

### Option B — Auto-detect the "resolved" status

Keep the single Resolve button. Under the hood, resolve the status config list once (or on demand)
and pick the status where `isClosedTransition: true` (optionally also requiring
`alarmStatusTransition` to be set) — send that as `status` in the PUT instead of `isActive: false`.

- **Pros**: Preserves today's one-click UX for the common case of a tenant with exactly one closing
  status. No new UI surface.
- **Cons**: Breaks down whenever a tenant configures more than one closing status — "which one is
  *the* Resolve status" becomes ambiguous, and silently picking one (e.g. the first match) risks
  applying the wrong semantic (e.g. "Rejected" instead of "Resolved"). Needs an explicit fallback
  for the zero-or-multiple-candidates case, which likely ends up reusing Option A's picker anyway.

### Option C — Clear the alarm directly, independent of status

Keep Resolve exactly as it is today (`isActive: false`), and additionally call the Alarms API
directly from the plugin to clear the linked alarm(s) when Resolve is clicked. No `status` field is
ever sent; the microservice's status-transition config is bypassed entirely for this action.

- **Pros**: Simplest change, and guarantees the specific outcome this ADR was raised for
  (alarm cleared on Resolve) regardless of how a tenant's statuses are configured. Doesn't touch
  FR-078 at all.
- **Cons**: Duplicates transition logic the microservice's status config already exists to express,
  in a second place the plugin now owns. Can also actively fight a tenant's configured workflow — if
  their "Resolved" status is deliberately configured *not* to clear the alarm (e.g. alarm needs a
  separate manual ack step), this action would clear it anyway. The SR itself also still never
  becomes genuinely `isClosed` here, since that also only happens via `isClosedTransition` — so this
  option addresses the alarm half but not the "closed request" half of the original problem.

## Consequences (cross-cutting, regardless of option chosen)

- `ServiceRequestStatus` (`service-request.model.ts:27-30`) and `ServiceRequestService.statusList()`
  (`service-request.service.ts:304-328`) need to carry the full `ServiceRequestStatusConfig` shape
  (`alarmStatusTransition`, `isClosedTransition`, `isDeactivateTransition`, `isInitialStatus`,
  `icon`) instead of just `{ id, name }`, for Options A and B.
- Whichever option is chosen, "Resolve" moves from patching a deprecated `isActive` flag to patching
  `status` (A/B) or making an additional alarm-clear call (C) — either way, FR-037 needs to be
  rewritten to describe the new behavior, and (for A) FR-078 needs to be explicitly narrowed to
  allow this one status-setting exception.

## Decision

**Option A** — a status picker, scoped to statuses with `isClosedTransition: true`. The button that
triggers it is renamed from "Resolve" to **"Close"**, per the naming note above, since the picker
can surface non-resolution closing statuses (e.g. "Rejected") alongside "Resolved" and the button
label needs to stay accurate regardless of which one the user picks.

This was chosen over Option B because "which configured status is *the* Resolve status" has no safe
automatic answer once a tenant configures more than one closing status — Option B would need to fall
back to a picker in that case anyway, so it doesn't actually avoid Option A's UX surface for the
tenants where it matters most, it only removes it for the simple case. It was chosen over Option C
because Option C never makes the SR itself `isClosed` (that still requires `isClosedTransition`, the
same mechanism Option A already uses) and can clear an alarm a tenant's configured workflow
deliberately didn't want cleared at that point — Option A defers both the closing and the alarm
transition to the tenant's own status configuration instead of the plugin guessing or overriding it.

Implementation follows the cross-cutting consequences above: widen `ServiceRequestStatus` /
`statusList()` to the full `ServiceRequestStatusConfig` shape, filter to `isClosedTransition: true`
for the picker's options, send the chosen status via `PUT /request/{id}`, rewrite FR-037 to describe
the picker-driven close, and narrow FR-078 to carve out this one deliberate status-setting
exception.

**Picker implementation**: uses the platform's own `ModalService.confirm()` (Cumulocity's standard
confirmation dialog — [Modal / confirmation
modal](https://cumulocity.com/codex/components/status-feedback-and-notifications/modal/overview#confirmation-modal))
with its `confirmOptions` checkbox list, rather than a bespoke modal component, so the dialog matches
the platform's own look, copy, and interaction pattern (title, explanatory body text, Cancel/Close
buttons) instead of introducing a one-off. `ConfirmOption.disabledByKey` (used in the platform's own
delete-modal example to keep two checkboxes mutually exclusive) only disables a single *named* option
and can't express "any other status" across an arbitrary tenant-configured list, so true single-select
across N statuses is enforced by defining each option's `checked` as an accessor: checking one clears
every other one, and unchecking the only checked option is a no-op — the first status starts
pre-checked, so exactly one is always selected, matching "only one status is allowed to set."
