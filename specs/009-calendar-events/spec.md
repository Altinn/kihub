# Feature Specification: Phase 8 — Calendar / Events

**Feature Branch**: `feat/new-architecture` (single-branch workflow; see `.specify/feature.json`)

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Phase 8 — Calendar / Events: an `events` Payload collection with fields title, description (rich text), start datetime (required), end datetime (optional), location, organizer, status (draft/published), optional tags and a featured flag, and a unique title-derived slug for the detail URL. Events are authored and published in the `/cms` editor back-office by Contributor+ users (server-side role gating, reusing the Phase 6 admin gate). All employees read events in the employee-facing Designsystemet app: an events list of published events (upcoming first) plus an event detail page and a friendly empty state, with a nav link in the app header (like News). Unpublished drafts are never visible to employees (not in any list, not by direct URL). Events are first-class NATIVE platform content per Constitution Principle II — no Git source, not an artifact, fully owned by Payload. Reuses the shared foundation (Entra auth, five-role model, two-surface split, Payload data layer); adds no new datastore, service, or dependency. This is the third and final module of the portal charter (Registry + News + Calendar). Phase 7 News (specs/007-news/) is the direct template. Defer to later phases: recurring events, RSVP/registration, ICS export, a month-grid calendar view, and a home-page events widget. Open questions to resolve in clarify: URL identity (slug vs id), location shape (free-text place vs online-meeting URL vs both; required?), how past events are handled (hidden vs separate past section vs archived) and list ordering, whether end time is required and whether all-day events are in scope, timezone handling (single Europe/Oslo vs per-event), and the module route name (/calendar vs /events)."

## Overview

Calendar / Events is the third and final native-content module of KI Hub's portal charter (Registry
+ News + Calendar; Constitution Product Modules, Principle II). Like News — and unlike the Registry —
an event has no external source of truth: it is created, edited, and published inside KI Hub and is
fully owned by the platform. This phase completes the everyday-value half of the portal: an internal
list of upcoming events all employees can browse, authored by a small set of editors in the existing
`/cms` back-office.

The module is deliberately modeled on Phase 7 News (`specs/007-news/`): one native Payload collection,
a thin server-side read library that enforces published-only visibility, employee-facing Designsystemet
pages (list + detail + empty state + a header nav link), and authoring in the existing Phase 6
back-office gated to Contributor-and-above. It reuses the shared foundation established in Phases 1–7
(Entra auth, the five-role model, the two-surface split, and the Payload/PostgreSQL data layer) and adds
no new datastore, service, or dependency.

## Clarifications

### Session 2026-07-23

- Q: URL scheme (route name + identity) for the events module? → A: `/events/<slug>` — route `/events`
  with a unique, human-readable slug derived from the title (mirrors the News `/news/<slug>` precedent).
- Q: How is an event's location modeled? → A: Both an optional free-text place and an optional
  online-meeting URL (neither required) — supports in-person, online, and hybrid events.
- Q: How are past (already-ended) events handled, and how is the list ordered? → A: Only upcoming events
  are listed, ordered soonest-first (ascending by start); past events are hidden (no past section this
  phase).
- Q: Is the end datetime required, and are all-day events in scope? → A: Start datetime required, end
  datetime optional; all-day events are out of scope this phase (every event has a specific start time).
- Q: How are event datetimes handled with respect to timezone? → A: Single Europe/Oslo — all datetimes
  are interpreted and displayed in Europe/Oslo; no per-event timezone stored.
- Q: Confirm the deferred feature set? → A: Recurring events, RSVP/registration, ICS export, a month-grid
  calendar view, and a home-page events widget are all deferred to later phases (Principle VII).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Employees browse upcoming internal events (Priority: P1)

As an employee, I open the app and browse internal events: a list of published upcoming events (soonest
first, featured items surfaced) and, from there, a full event page showing its title, description, when
it takes place (start and, if set, end), where (location), and who is organizing it. This is the module's
primary everyday value.

**Why this priority**: The charter's everyday value is "being the internal home employees actually visit."
An at-a-glance list of what is coming up, readable by every employee, is that value; without it the module
delivers nothing to its largest audience. It is the MVP.

**Independent Test**: With one or more published events present (authored in `/cms`), sign in as any
employee (including a Reader), open the events list, confirm published upcoming events appear soonest-first
with featured ones surfaced, open an event, and confirm its title/description/start (and end if set)/
location/organizer render. Confirm a friendly empty state (not an error) when nothing is published.

**Acceptance Scenarios**:

1. **Given** three published events with different start times, **When** an employee opens the events list,
   **Then** the upcoming ones appear ordered soonest-first.
2. **Given** a published event flagged featured, **When** an employee opens the events list, **Then** that
   event is surfaced (visually distinguished / placed ahead of non-featured items).
3. **Given** a published event, **When** an employee opens its detail page, **Then** its title, description,
   start time (and end time if present), location, and organizer are shown.
4. **Given** no published (upcoming) events, **When** an employee opens the events list, **Then** a friendly
   empty state is shown (not an error).
5. **Given** the employee app header, **When** an employee views any page, **Then** a nav link to the events
   module is present (as News has one).

---

### User Story 2 - Editors author and publish events in the back-office (Priority: P2)

As a Contributor-or-above editor, I create an event in the `/cms` back-office — title, rich-text
description, start datetime, optional end datetime, location, organizer, optional tags, featured flag —
save it as a draft while I work, and publish it when it is ready. Publishing makes it visible to employees;
I can later edit, unpublish, or delete it.

**Why this priority**: Authoring is what populates the list US1 renders. It is separated from US1 because
the read surface can be demonstrated against seeded/authored content, but a self-sustaining module needs an
authoring path. It builds directly on the Phase 6 back-office and its Contributor+ gate.

**Independent Test**: Sign in as a Contributor+ persona, create an event in `/cms`, save it as draft, then
publish it; confirm it persists and (once published) becomes visible to employees. Confirm a Reader /
anonymous user cannot author or publish.

**Acceptance Scenarios**:

1. **Given** a signed-in Contributor+, **When** they create and publish an event in `/cms`, **Then** the
   event is saved and appears in the employee events list (if upcoming).
2. **Given** a signed-in Contributor+, **When** they save an event as draft, **Then** it is persisted but
   does not appear to employees.
3. **Given** a published event, **When** an editor edits its details and saves, **Then** employees see the
   updated content without a redeploy.
4. **Given** a Reader or anonymous user, **When** they attempt to create/edit/publish/delete an event,
   **Then** the action is refused server-side.

---

### User Story 3 - Publication visibility is controlled and safe (Priority: P3)

As the platform, I guarantee that only published events are ever visible to employees and that unpublishing
immediately removes an event from the employee surfaces — including by direct URL — so drafts and retracted
events never leak.

**Why this priority**: Draft/retracted content leaking to all employees is the module's main risk. The
draft/published control is introduced in US2; this story hardens and independently verifies the visibility
guarantee (list, detail, and direct-URL access) as an explicit, testable invariant, enforced in both the
read library and the collection read-access rule (defense in depth).

**Independent Test**: Attempt to reach a draft event's detail page directly as an employee (refused / not
found); publish it (now reachable); set it back to draft (disappears from the list and its detail URL is no
longer accessible).

**Acceptance Scenarios**:

1. **Given** a draft event, **When** an employee requests its detail page by direct URL, **Then** it is not
   found / not accessible (no draft content is exposed).
2. **Given** a published event that an editor sets back to draft, **When** an employee reloads the events
   list, **Then** the event is gone, and its detail URL is no longer accessible.
3. **Given** the employee app, **When** any events surface is rendered, **Then** it never includes an
   unpublished event.

---

### Edge Cases

- **No published events**: the list shows a friendly empty state, never an error or a blank page.
- **Event with no end time, no location/online URL, no tags, or not featured**: renders cleanly (all
  optional); an online-only event (URL, no place) and a place-only event both render sensibly.
- **Unpublish while being viewed**: an event set back to draft is removed from employee surfaces on next
  request; a direct URL to it is no longer accessible.
- **Past events**: an event whose start (and end, if set) is already in the past is not listed (no past
  section this phase); it drops off the upcoming list automatically once its start time passes.
- **End before start**: an event whose end datetime precedes its start datetime is invalid and MUST be
  rejected at authoring time (validation rule).
- **Rich description content**: headings, lists, links, and emphasis in the description render readably on
  the detail page.
- **Organizer**: the organizer is a free-text label (resolved in planning — research §7), so an event
  always displays a sensible organizer and there is no account to deactivate; the field is optional and an
  event with no organizer renders cleanly.
- **Direct back-office access by a Reader/anonymous**: refused by the existing Phase 6 entry gate.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a native **Event** content type with: title; a unique title-derived
  URL slug; description (rich text); start datetime (required); end datetime (optional); an optional
  free-text location (place) and an optional online-meeting URL; organizer; status (draft or published);
  optional tags; and a featured flag.
- **FR-002**: Editors with role **Contributor or above** MUST be able to create, edit, publish/unpublish,
  and delete events in the `/cms` editor back-office; these actions MUST be gated by role and enforced
  server-side. (Events are not under the Registry's AI-governance lifecycle/reviews — no separate publisher
  role: any Contributor+ may publish.)
- **FR-003**: Each event MUST carry a status of **draft** or **published**; only **published** events are
  visible to employees.
- **FR-004**: Employees MUST be able to view a list of **published, upcoming** events in the employee-facing
  app, ordered **soonest-first** by start datetime, with **featured** events surfaced. Past (already-ended)
  events MUST NOT appear in the list (no past section this phase).
- **FR-005**: Employees MUST be able to open a published event's detail page — addressed at `/events/<slug>`
  by its unique title-derived slug — showing at least its title, description, start datetime (and end
  datetime if set), location (free-text place and/or online-meeting URL, when set), and organizer.
- **FR-006**: Unpublished (draft) events MUST NOT be visible or accessible to employees on the employee app
  — not in any list and not via a direct detail URL — enforced both in the read library and in the
  collection read-access rule (defense in depth).
- **FR-007**: Readers and anonymous users MUST NOT be able to author, edit, publish, unpublish, or delete
  events; this MUST be enforced server-side (not only hidden in the UI).
- **FR-008**: Event content MUST be stored natively in KI Hub's data layer (Payload), MUST NOT be sourced
  from or reconciled against Git, and MUST NOT be modeled as an artifact (respecting the Registry boundaries
  in Principles I/II/III).
- **FR-009**: Both surfaces MUST reuse the existing single Entra auth model, the five-role model, and the
  two-surface split; only signed-in employees may read events, and the employee-facing events UI MUST be
  built with Designsystemet (the back-office remains Payload's own admin UI, exempt).
- **FR-010**: Publishing, editing, or unpublishing an event MUST take effect for employees without a
  redeploy (reflected on the next request after save).
- **FR-011**: An event MUST have a required **start datetime**; its **end datetime** is optional. When an
  end datetime is present it MUST NOT precede the start datetime (rejected at authoring time). All-day
  (date-only) events are out of scope this phase — every event has a specific start time.
- **FR-012**: The employee events surfaces MUST show a friendly empty state (not an error) when no
  published, upcoming events exist.
- **FR-013**: The event's slug MUST be unique across all events and derived from the title on creation
  (editable by an editor); it is the stable public handle used in the employee detail URL (`/events/<slug>`).
- **FR-014**: The employee app header MUST include a navigation link to the events module (as the News
  module added one), placed consistently with the existing header navigation.
- **FR-015**: Datetimes MUST be interpreted and displayed consistently in a single timezone,
  **Europe/Oslo**, so an event's stated time is unambiguous to all employees; no per-event timezone is
  stored.

### Key Entities *(include if feature involves data)*

- **Event**: a native, KI-Hub-authored calendar event. Attributes: title; slug (unique, title-derived — the
  public detail-URL handle); description (rich text); start datetime (required); end datetime (optional);
  location — an optional free-text place and an optional online-meeting URL (either, both, or neither);
  organizer (attribution of who runs the event — free-text label or a user reference, resolved in planning);
  status (draft | published); tags (optional, free-form labels); featured (boolean). All datetimes are in
  Europe/Oslo. Owned entirely by Payload; no Git source; not an artifact. It has no dependency on the
  Registry's `Artifact`/`CatalogEntry` records; its only potential relationship is an optional
  organizer/creator reference to `users`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From opening the app, an employee can reach and read the details of the next upcoming event in
  no more than two clicks.
- **SC-002**: 100% of unpublished (draft) events are inaccessible to employees — verified across the list,
  the detail page, and direct-URL access — with zero draft leaks.
- **SC-003**: An editor can publish a new event and an employee sees it in the events list on the next page
  load (no redeploy, effectively immediate).
- **SC-004**: 100% of author/publish/edit/delete attempts by a Reader or anonymous user are refused
  server-side.
- **SC-005**: The events list presents published events soonest-first with featured items surfaced, for any
  set of events (ordering and surfacing are correct 100% of the time).
- **SC-006**: When no event is published/upcoming, employees see a friendly empty state rather than an error,
  and the module adds no new external datastore or service (reuses the existing platform).
- **SC-007**: An event with an end datetime earlier than its start datetime is rejected 100% of the time at
  authoring; no such event can be saved.

## Assumptions

- **Open decisions resolved**: The previously-open decisions are settled in the Clarifications section above
  (Session 2026-07-23): `/events/<slug>` route + title-derived slug identity; location = optional free-text
  place + optional online-meeting URL (neither required); hide past events, list upcoming soonest-first; end
  datetime optional and all-day out of scope; single Europe/Oslo timezone; and the advanced feature set
  deferred.
- **Authoring/publishing role**: Contributor-and-above may both author and publish; events are intentionally
  NOT placed under the Registry's AI-governance lifecycle / typed reviews / approval matrix (mirrors News
  FR-002). A finer editor/publisher role split is deferred until a concrete need.
- **Organizer attribution**: "organizer" identifies who runs the event and is shown to employees on the
  detail page. Whether it is a free-text label or a reference to a KI Hub user (as News models `author`) is a
  data-model detail refined in planning; either way it must display sensibly and not error if a referenced
  account is removed.
- **Reading audience**: events are internal — only signed-in employees may read them (same gate as the rest
  of the employee app); the module is not public/anonymous.
- **Employee route**: the events list lives at `/events` and an event at `/events/<slug>`; this does not
  collide with existing employee routes (`/`, `/artifacts/*`, `/news/*`, `/admin/*`, `/signin`) or the
  back-office (`/cms`).
- **List volume / pagination**: at portal scale the list may show all published upcoming events soonest-first;
  pagination or infinite scroll is a plan-level concern deferred until volume warrants it.
- **Shared foundation reused unchanged**: Entra/Auth.js session, the five-role model, the Phase 6 back-office
  entry gate, and the Payload/PostgreSQL data layer are reused as-is; no new datastore, service, or dependency
  is introduced. This is an additive module with zero changes to Registry, governance, or News.
- **Out of scope (deferred to later phases)**: recurring events, RSVP/registration, ICS/calendar-feed export,
  a month-grid calendar view, and a home-page/landing events widget (confirmed deferred in Clarifications).
