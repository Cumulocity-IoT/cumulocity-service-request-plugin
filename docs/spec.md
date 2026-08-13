# Cumulocity Service Request Plugin Specification

## Requirements

Functional requirements below were derived from the current implementation under `src/service-request-plugin`. Each requirement has a unique, stable identifier (`FR-XXX`) that should be kept even if requirements are reordered; new requirements should append the next free number.

This document has two parts:

1. **Baseline (current behavior)** — FR-001 to FR-062, describing what is implemented today.
2. **Target redesign** — FR-063 onward, describing the new combined alarm/service-request timeline and split-view experience. Requirements here supersede specific baseline requirements where noted; baseline requirements not mentioned as superseded remain in force.

### Plugin registration & availability

- **FR-001**: The plugin shall register a "Service Requests" navigation tab in the device context (`ViewContext.Device`), routed at path `service-requests`, showing the `online-support` icon.
- **FR-002**: The Service Requests tab shall only activate if the `service-request-mgmt` microservice is reachable (`HEAD /service/service-request-mgmt/api/service/request/`); the availability check result shall be cached for the lifetime of the guard instance.
- **FR-003**: If the microservice is not available, the plugin shall show an informational alert instructing the user to install the `service-request-mgmt` microservice.

### Service request dashboard

- **FR-004**: Navigating to the Service Requests tab for a device shall render a dashboard pre-configured with two widgets: an Alarm List Widget and a Service Request List Widget, both scoped to the current device.
- **FR-005**: The dashboard shall expose an action to open the service request creation modal for the current device (not tied to a specific alarm).

### Alarm list widget

- **FR-006**: The widget shall list alarms for the configured device, including alarms of sub-assets/sub-devices when the widget is configured to show subassets.
- **FR-007**: The widget shall support filtering the alarm list by one or more alarm statuses (e.g. ACTIVE, ACKNOWLEDGED, CLEARED) and by one or more severities (CRITICAL, MAJOR, MINOR, WARNING), reloading results whenever a filter changes.
- **FR-008**: The widget shall order results by severity ascending, then time descending, then text ascending by default, and additionally by status when configured with `order: 'status'`.
- **FR-009**: The widget shall display a severity icon and a status icon per alarm, and an occurrence-count badge when an alarm's count exceeds 1.
- **FR-010**: The widget shall support paginated loading of additional alarms ("load more") without discarding already-loaded alarms.
- **FR-011**: The widget shall support automatic polling for new alarms on a fixed interval (60s) that can be toggled on/off by the user; a manual reload action shall also be available.
- **FR-012**: Loading additional pages or reloading the list shall temporarily suspend polling and restore it once the load completes, if polling is enabled.
- **FR-013**: The widget shall provide an action to clear an ACTIVE alarm (setting its status to CLEARED), showing a success or error notification and reloading the alarm list on success.
- **FR-014**: The widget shall provide an action, visible only for alarms with status ACTIVE, to open the service request creation modal pre-associated with that alarm.
- **FR-015**: Each alarm entry shall link to its source device's page.
- **FR-016**: The widget shall show a loading indicator while alarms are being fetched, and an empty-state message when no alarms match the current filters.

### Service request list widget

- **FR-017**: The widget shall list service requests for the configured device (by source device ID), with a default page size of 500.
- **FR-018**: The widget shall automatically reload its list on a fixed interval (180s) and whenever a service request is created, updated, or resolved elsewhere in the plugin.
- **FR-019**: Each list entry shall display the request's priority icon and current status; entries whose status equals the closed status (`10`) shall be visually distinguished as closed.
- **FR-020**: Each list entry shall be expandable/collapsible to reveal its full description (or a "no description provided" message when absent) and its comments.
- **FR-021**: Expanding an entry for the first time shall lazily load up to a configurable number of comments (default 10) for that request, plus a count of any additional comments not shown.
- **FR-022**: Each list entry shall link to its source device's page.
- **FR-023**: Clicking a service request's title shall open the service request edit modal for that request.
- **FR-024**: The widget shall show a loading indicator while service requests are being fetched, and an empty-state message when none exist.
- **FR-025**: The widget shall be configurable and registered as a dashboard widget (`service-request.list.widget`) selectable without requiring a specific device target.

### Service request creation & editing modal

- **FR-026**: The modal shall support two modes: creating a new service request (for a device, optionally associated with an alarm) and editing an existing service request.
- **FR-027**: On open, the modal shall fetch and cache available statuses and priorities via the meta service, used to populate the status and priority form controls.
- **FR-028**: When creating a request from an alarm, the modal shall pre-fill the title with the alarm's text and associate the request with the alarm via `alarmRef` (URI + ID); when creating for a device without an alarm, no alarm reference shall be set.
- **FR-029**: When creating a request, the source device (ID, self link, name) shall be attached to the request automatically.
- **FR-030**: When creating a request, the default status and default (first available) priority shall be pre-selected.
- **FR-031**: The form shall require a non-empty title; description, priority, and attachment shall be optional.
- **FR-032**: The status field shall be editable when creating a new request but disabled (read-only) when editing an existing request.
- **FR-033**: Submitting the create form shall send a create request (`title`, `status`, `priority`, `description`, `type`, `alarmRef`, `eventRef`, `seriesRef`, `source`, `customProperties`) and, on success, show a success notification and refresh the modal with the newly created request's details.
- **FR-034**: Submitting the edit form shall send an update request containing only the changed fields (`title`, `priority`, `description`) and, on success, show a success notification and refresh the modal with the updated request's details.
- **FR-035**: The edit form's submit action shall be disabled while the form is pristine (unmodified), invalid, or a submission is already in progress.
- **FR-036**: The modal shall provide a "Reset" action in edit mode that restores the form to the last-loaded values and clears the dirty/pristine state.
- **FR-037**: The modal shall provide a "Resolve" action, available only while the request is active and not already closed, that asks for user confirmation before marking the request inactive (`isActive: false`) via the API.
- **FR-038**: When the loaded service request is inactive (`isActive: false`), the entire form shall be disabled and the Resolve action shall be unavailable.
- **FR-039**: On successful create, update, or resolve, the modal shall close and notify listeners (e.g. list widgets) that a change occurred so they can refresh.
- **FR-040**: The modal shall provide a "Cancel" action that closes the modal without submitting changes.
- **FR-041**: The modal shall present tabbed navigation for Measurements, Events, and Alarms related to the request; the Alarms tab shall be active by default while Measurements and Events remain placeholders (disabled) in the current implementation.
- **FR-042**: The modal shall allow attaching a single file to the service request via drag-and-drop or file picker; selecting a new file while one is already attached shall mark the previous attachment for deletion and stage the new one, since the backend currently supports only one attachment per request.
- **FR-043**: On successful creation or update, any staged new attachment shall be uploaded to the newly created/updated request.
- **FR-044**: The modal shall allow downloading the current attachment of a service request.
- **FR-045**: The modal shall embed the comments component (see below) so users can view and add comments while editing a request.

### Service request comments

- **FR-046**: Comments for a service request shall be fetched and displayed in reverse order as returned by the API, limited to a configurable number of displayed items with a count of any remaining, hidden comments.
- **FR-047**: Users shall be able to submit a new text comment (`type: 'user'`) for a service request; the text field is required and the submit action shall be a no-op while a submission is already in progress.
- **FR-048**: After a comment is successfully created, the comment form shall reset and the comment list shall be refreshed.
- **FR-049**: Users shall be able to attach a single file to a new comment; the attachment shall be uploaded in a follow-up request using the newly created comment's ID, after the comment itself is created.
- **FR-050**: Users shall be able to download a comment's attachment, if present.
- **FR-051**: Comment text containing newline characters shall render with line breaks (`<br>`) in the UI.
- **FR-052**: System-generated comments (`type: 'system'`) shall be visually distinguishable from user comments.

### Service request & comment attachments (device-agnostic)

- **FR-053**: Uploading an attachment shall send the file as multipart form data along with a `force` flag indicating whether an existing attachment should be overwritten.
- **FR-054**: Downloading an attachment shall retrieve the raw file content and offer it to the user as a browser file download (save-as).
- **FR-055**: Attachment upload and download failures shall surface a localized error notification, including any server-provided error message when available.

### Device & alarm selection components

- **FR-056**: The device selection component shall list devices (`c8y_IsDevice`) with live updates to the currently selected device's properties (via realtime subscription), and support text filtering of the candidate list.
- **FR-057**: The alarm selection component shall support selecting a single alarm or multiple alarms by reference, resolving each reference to full alarm details (using a locally cached list of available alarms plus on-demand detail fetches for any not already cached), and allow removing a selected alarm from the selection.
- **FR-058**: If a referenced alarm cannot be found/fetched, the alarm selection component shall show an error notification rather than failing silently.

### Data & API integration

- **FR-059**: The plugin shall communicate with the `service-request-mgmt` microservice via the following REST operations: list/detail/create/update/resolve service requests; list statuses; list priorities; list/create comments; upload/download request attachments; upload/download comment attachments.
- **FR-060**: A service request shall carry: id, title, optional description, status, optional priority, active flag, timestamps (creation/update/last-updated), owner, type (currently always `'alarm'`), optional source device reference, optional alarm/event/series references, optional custom properties, and an optional attachment.
- **FR-061**: List and comment-list requests shall default to a page size of 500 when no explicit limit is provided.
- **FR-062**: All create/update/resolve/comment operations shall surface success or failure via user-facing notifications (success on completion, danger/error with server status text on failure), and log details to the console for diagnostics.

## Target redesign

The redesign aligns the plugin with Cumulocity's standard alarm dashboard conventions (`AlarmListWidgetComponent` / `AlarmsListComponent`, the `c8y-list-group` primitives, and the standard split-view layout pattern), while introducing a combined alarm + service-request timeline. Reference material used for alignment: `@c8y/ngx-components` alarm widget/list types (SDK 1024.8.3), the Codex design-system docs for split view, list-group, badges, and feedback severity.

### Combined timeline (master list)

- **FR-063**: The alarm list widget and service request list widget (FR-004, FR-006–FR-025) shall be replaced by a single combined, chronologically ordered timeline listing both alarms and service requests for the device, using the standard `c8y-list-group`/`c8y-li` list primitives instead of custom bootstrap markup.
- **FR-064**: Each service request that references an alarm (`alarmRef.id` matching the alarm's `id`) shall be rendered as a distinct, bordered block visually attached to that alarm's row via a connecting arrow, so the alarm-to-request relationship is immediately visible in the timeline.
- **FR-065**: If a service request has no `alarmRef` (created directly from a device), it shall appear as its own standalone timeline entry with no connecting arrow.
- **FR-066**: If more than one service request references the same alarm, each linked request shall render as its own bordered block connected to that alarm.
- **FR-067**: An alarm with no linked service request shall retain the existing create-service-request action (FR-014) so one can be created directly from the timeline.
- **FR-068**: The timeline shall preserve existing filtering by alarm status/severity (FR-007) and shall additionally support filtering by service request status, using the standard severity/status `btn-group` (icon + label + count badge) pattern instead of multi-select dropdowns.
- **FR-069**: The timeline shall continue to show a severity icon and status icon per alarm using the standard severity-to-icon mapping (`circle`/`high-priority`/`warning`/`exclamation-circle`) and an occurrence-count badge for alarms with `count > 1`, per the standard badge pattern.
- **FR-070**: The timeline shall continue to show a priority icon and status per service request block, and shall visually distinguish closed requests (FR-019).

### Split view & detail panel

- **FR-071**: The Service Requests tab shall use the standard split-view layout: the combined timeline occupies the list column, and a detail panel occupies the second column, replacing the modal-based creation/editing flow (supersedes the "modal" framing in FR-026, FR-039, FR-040, and the dashboard action in FR-005).
- **FR-072**: Selecting an alarm row in the timeline shall display that alarm's details in the detail panel.
- **FR-073**: Selecting a service-request block in the timeline shall display that service request's details (the existing create/edit form content: title, description, status, priority, attachment, tabs, resolve/update/reset actions, and comments) in the detail panel.
- **FR-074**: Only one timeline entry (an alarm or a service-request block) shall be active/selected at a time; selecting a new entry shall switch the detail panel's contents accordingly, per the standard split-view single-selection behavior.
- **FR-075**: The detail panel shall follow standard split-view conventions: sticky header and footer (action buttons), and a "Back" affordance to return to the list on small/tablet screens.
- **FR-076**: Creating a new service request (from an alarm with no linked request, or from the device-level action) shall populate the detail panel with the creation form rather than opening a modal.

### Open questions for the design mockup phase

The following are not yet fully specified and should be resolved visually during the mockup step before implementation:

- What "alarm details" (FR-072) contains — current implementation has no standalone alarm detail view; needs its own content/actions (e.g. an explicit "Create service request" call-to-action when unlinked).
- Exact chronological ordering rule for the combined timeline (e.g. by alarm time vs. request creation/update time) when interleaving alarms and requests.
- Whether the connecting arrow (FR-064) is purely visual or also interactive (e.g. clicking it also selects the linked request).
- Responsive behavior of the arrow/bordered-block relationship on narrow (tablet/mobile) layouts where split view collapses to a single column.
