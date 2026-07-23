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

> **NOTE — provisional decisions pending `/speckit-clarify`**: This specification uses working defaults
> (drawn from the News precedent) for several decisions the author flagged as open. They are listed in
> **Open Questions for Clarification** below and are called out inline where they appear. `/speckit-clarify`
> will confirm or revise them and fold the answers into a Clarifications section before planning. They are
> intentionally NOT pre-baked as final.

## Open Questions for Clarification *(to be resolved in `/speckit-clarify`)*

These are recorded here so they are not lost; the working default in parentheses is what the rest of this
spec currently assumes. None is treated as final.

1. **URL identity** — Is an event addressed by a unique, human-readable **slug** derived from the title
   (News precedent), or by an opaque **id**? *(Working default: title-derived slug, e.g. `/events/<slug>`.)*
2. **Location shape** — Is location a **free-text place**, an **online-meeting URL**, or **both**? Is any
   of it **required**? *(Working default: a single optional free-text location string; online-meeting URL
   not separately modeled.)*
3. **Past events & ordering** — Are past (already-ended) events **hidden**, shown in a **separate "past"
   section**, or **archived**? What is the list ordering? *(Working default: only upcoming events are
   listed, ordered soonest-first (ascending by start); past events are hidden.)*
4. **End time & all-day events** — Is an **end datetime required** or optional? Are **all-day events** in
   scope for this phase? *(Working default: start datetime required, end datetime optional; all-day events
   out of scope for this phase — every event has a specific start time.)*
5. **Timezone** — Single **Europe/Oslo** assumption for all events, or a **stored per-event timezone**?
   *(Working default: single Europe/Oslo; datetimes are interpreted and displayed in Europe/Oslo.)*
6. **Module route name** — Is the employee module route `/events` or `/calendar`? *(Working default:
   `/events`, mirroring the News `/news` convention where the route matches the collection.)*
7. **Deferred-feature confirmation** — Confirm that recurring events, RSVP/registration, ICS export, a
   month-grid calendar view, and a home-page events widget are all **deferred** to later phases
   (Principle VII — simplest useful thing first; Designsystemet ships no calendar-grid component).
   *(Working default: all deferred.)*

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
- **Event without an end time, tags, or featured flag**: renders cleanly (these are optional).
- **Unpublish while being viewed**: an event set back to draft is removed from employee surfaces on next
  request; a direct URL to it is no longer accessible.
- **Past events**: an event whose start (and end, if set) is already in the past is not listed in the
  upcoming list under the working default (see Open Question 3 — `/speckit-clarify` may introduce a past
  section instead of hiding).
- **End before start**: an event whose end datetime precedes its start datetime is invalid and MUST be
  rejected at authoring time (validation rule).
- **Rich description content**: headings, lists, links, and emphasis in the description render readably on
  the detail page.
- **Organizer no longer active**: if the organizer is modeled as a user reference and that account is later
  removed, the event still displays a sensible organizer label and does not error. *(Organizer shape —
  free-text vs user reference — is refined in planning; see Assumptions.)*
- **Direct back-office access by a Reader/anonymous**: refused by the existing Phase 6 entry gate.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a native **Event** content type with: title; a unique URL handle
  (working default: a title-derived slug — see Open Question 1); description (rich text); start datetime
  (required); end datetime (optional); location; organizer; status (draft or published); optional tags; and
  a featured flag.
- **FR-002**: Editors with role **Contributor or above** MUST be able to create, edit, publish/unpublish,
  and delete events in the `/cms` editor back-office; these actions MUST be gated by role and enforced
  server-side. (Events are not under the Registry's AI-governance lifecycle/reviews — no separate publisher
  role: any Contributor+ may publish.)
- **FR-003**: Each event MUST carry a status of **draft** or **published**; only **published** events are
  visible to employees.
- **FR-004**: Employees MUST be able to view a list of **published** events in the employee-facing app,
  ordered **soonest-first** by start datetime, with **featured** events surfaced. *(Whether past events are
  hidden, sectioned, or archived is Open Question 3; the working default lists only upcoming events.)*
- **FR-005**: Employees MUST be able to open a published event's detail page — addressed by its unique
  public handle (working default `/events/<slug>` — see Open Questions 1 and 6) — showing at least its
  title, description, start datetime (and end datetime if set), location, and organizer.
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
  end datetime is present it MUST NOT precede the start datetime (rejected at authoring time). *(End-required
  vs optional, and all-day events, are Open Question 4; the working default keeps end optional and all-day
  out of scope.)*
- **FR-012**: The employee events surfaces MUST show a friendly empty state when no events are published
  (or, under the working default, when none are upcoming).
- **FR-013**: The event's public handle MUST be unique across all events and stable (working default:
  derived from the title on creation, editable by an editor — see Open Question 1); it is the handle used in
  the employee detail URL.
- **FR-014**: The employee app header MUST include a navigation link to the events module (as the News
  module added one), placed consistently with the existing header navigation.
- **FR-015**: Datetimes MUST be interpreted and displayed consistently in a single timezone
  (working default: Europe/Oslo — see Open Question 5), so an event's stated time is unambiguous to all
  employees.

### Key Entities *(include if feature involves data)*

- **Event**: a native, KI-Hub-authored calendar event. Attributes: title; public handle (unique — working
  default a title-derived slug); description (rich text); start datetime (required); end datetime (optional);
  location (working default a free-text string; shape refined by Open Question 2); organizer (attribution of
  who runs the event — free-text label or a user reference, resolved in planning); status (draft | published);
  tags (optional, free-form labels); featured (boolean). Owned entirely by Payload; no Git source; not an
  artifact. It has no dependency on the Registry's `Artifact`/`CatalogEntry` records; its only potential
  relationship is an optional organizer/creator reference to `users`.

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

- **Open decisions are provisional**: The seven items in **Open Questions for Clarification** are resolved in
  `/speckit-clarify`, not here. The working defaults documented above (title-derived slug; single optional
  free-text location; hide past events, upcoming soonest-first; end optional and all-day out of scope; single
  Europe/Oslo timezone; `/events` route; all listed advanced features deferred) are placeholders chosen from
  the News precedent and Principle VII, and may change.
- **Authoring/publishing role**: Contributor-and-above may both author and publish; events are intentionally
  NOT placed under the Registry's AI-governance lifecycle / typed reviews / approval matrix (mirrors News
  FR-002). A finer editor/publisher role split is deferred until a concrete need.
- **Organizer attribution**: "organizer" identifies who runs the event and is shown to employees on the
  detail page. Whether it is a free-text label or a reference to a KI Hub user (as News models `author`) is a
  data-model detail refined in planning; either way it must display sensibly and not error if a referenced
  account is removed.
- **Reading audience**: events are internal — only signed-in employees may read them (same gate as the rest
  of the employee app); the module is not public/anonymous.
- **Employee route**: the events list lives at `/events` and an event at `/events/<slug>` under the working
  default; this does not collide with existing employee routes (`/`, `/artifacts/*`, `/news/*`, `/admin/*`,
  `/signin`) or the back-office (`/cms`). (Route name is Open Question 6.)
- **List volume / pagination**: at portal scale the list may show all published upcoming events soonest-first;
  pagination or infinite scroll is a plan-level concern deferred until volume warrants it.
- **Shared foundation reused unchanged**: Entra/Auth.js session, the five-role model, the Phase 6 back-office
  entry gate, and the Payload/PostgreSQL data layer are reused as-is; no new datastore, service, or dependency
  is introduced. This is an additive module with zero changes to Registry, governance, or News.
- **Out of scope (deferred to later phases)**: recurring events, RSVP/registration, ICS/calendar-feed export,
  a month-grid calendar view, and a home-page/landing events widget (Open Question 7 confirms these).
