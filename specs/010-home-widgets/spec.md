# Feature Specification: Home-Page Widgets

**Feature Branch**: `feat/new-architecture` (single-branch workflow; see `.specify/feature.json`)

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "Home-page widgets — give employees a real 'internal home'. The employee-app landing page should surface, at a glance, the LATEST published NEWS and the UPCOMING published EVENTS (and possibly featured/recommended Registry items), each as a small widget with a 'View all →' link into the full module (/news, /events). This is an ADDITIVE, employee-app, read-only feature: it reuses the existing published-only read libs (lib/news.ts::listPublishedNews, lib/events.ts::listUpcomingEvents) and the existing Designsystemet cards (NewsCard, EventCard). Expect ZERO new Payload collections, ZERO schema changes, ZERO migrations, ZERO new dependencies. Employee-facing UI stays pure Digdir Designsystemet (Principle VIII); access reuses the existing (app)/layout.tsx requireSession() gate; drafts and past events must never leak into the widgets (guaranteed by the published-only read libs). Simplest useful thing (Principle VII): latest N news + next N events with friendly per-widget empty states and view-all links. Open questions to resolve in clarify: what `/` becomes (portal dashboard with catalog below vs. widgets in a sidebar beside the catalog vs. `/` becomes a pure dashboard and the catalog moves to /registry|/catalog with its own nav link); interaction with full-text search (`/` currently branches on `q`); which widgets (News + Events only, or also a featured Registry widget); items per widget and ordering; card style (reuse cards as-is vs. compact home variants). Defer: personalization/per-user config, dismissable/reorderable widgets, real-time updates, pagination inside widgets."

## Overview

This feature delivers the deferred **home-page widget** that both the News (`specs/007-news/`) and
Calendar/Events (`specs/009-calendar-events/`) specs left open. With all three native modules of the
portal charter shipped (Registry + News + Calendar), the employee-app landing page becomes a real
"internal home": on arrival, an employee sees — at a glance — the **latest published news**, the
**upcoming published events**, and **featured/recommended Registry artifacts**, each as a compact
widget with a "View all →" link into the full module. This is the charter's everyday value ("being
the internal home employees actually visit") made concrete on the first screen.

The feature is deliberately **additive and read-only on the employee app**. It introduces **no new
Payload collection, no schema change, no migration, and no new dependency**. It reuses the existing
published-only read libraries (`lib/news.ts::listPublishedNews`, `lib/events.ts::listUpcomingEvents`)
— which already exclude drafts and past events by construction — the existing catalog + governance
read layer (`lib/catalog.ts::listArtifacts`, `lib/governance.ts::getGovernance`) for the Registry
widget, and the existing Designsystemet listing cards (`NewsCard`, `EventCard`, `ArtifactCard`).
Access reuses the existing `(app)/layout.tsx` `requireSession()` gate (signed-in employees only).

Per the clarifications below, `/` **becomes a pure portal dashboard** (three widgets, no catalog) and
the Registry catalog **browse + full-text search moves to a new `/registry` route** with its own
header nav link. This is the highest-impact change (routing, header nav, the "← Back to catalog"
links on `/news` and `/events`, and every existing catalog/search test that assumed `/` is the
catalog) — all anticipated and in scope.

This is **not** a new module and **not** new native content: no new collection, no new authoring
surface, no governance change (Principles II/VII/VIII). It surfaces content the modules already own.

## Clarifications

### Session 2026-07-24

- Q: What does the landing route `/` become? → A: `/` becomes a **pure portal dashboard** (News +
  Events + Registry widgets, no catalog on it); the Registry catalog browse + full-text search
  **moves to a new route** with its own header nav link.
- Q: What is the moved catalog route named? → A: **`/registry`** (matches the constitution's
  "Registry" module name); its header nav link and the "← Back to catalog" links on `/news` and
  `/events` all point there.
- Q: How do the home widgets interact with full-text search (which used to branch on `/`'s `q`
  param)? → A: **Search moves to `/registry`** with the catalog; the `/` dashboard has no search
  branch and **always** shows the three widgets.
- Q: Which widgets appear on the dashboard? → A: **Three** — News, Events, and a **Registry** widget.
  The Registry widget surfaces **featured/recommended** artifacts, reusing the existing catalog read
  layer (`listArtifacts`) + governance (`getGovernance`, which exposes `featured`/`recommended`
  flags) + `ArtifactCard` — no schema change.
- Q: How many items per widget? → A: **3** — latest 3 news, next 3 upcoming events, up to 3
  featured/recommended artifacts; each honoring the module's existing ordering (featured-first;
  news newest-first, events soonest-first).
- Q: Card style for the widgets? → A: **Reuse** `NewsCard` / `EventCard` / `ArtifactCard` **as-is**;
  add a compact home variant only if the dashboard layout later needs it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Employee sees the latest news, upcoming events, and recommended tools on the home page (Priority: P1)

As an employee, when I open KI Hub I land on a dashboard that shows me, at a glance, the most recent
published news, the next upcoming published events, and the featured/recommended AI tools — without
having to navigate into each module. Each widget shows up to three items and a "View all →" link
that takes me to the full module.

**Why this priority**: This is the entire point of the feature and the charter's everyday value — an
internal home that surfaces what's new, what's coming up, and which tools are recommended, on the
first screen. Without it the feature delivers nothing. It is the MVP.

**Independent Test**: With at least one published news article, one published upcoming event, and one
featured/recommended artifact present, sign in as any employee (including a Reader), open the home
page, and confirm a news widget lists the latest published article(s), an events widget lists the
next upcoming event(s), and a Registry widget lists featured/recommended artifact(s), each with a
working "View all →" link to `/news`, `/events`, and `/registry` respectively.

**Acceptance Scenarios**:

1. **Given** several published news articles, **When** an employee opens the home page, **Then** the
   news widget shows the most recent published article(s) (featured surfaced, newest-first), limited
   to 3.
2. **Given** several published upcoming events, **When** an employee opens the home page, **Then** the
   events widget shows the next upcoming event(s) (featured surfaced, soonest-first), limited to 3.
3. **Given** artifacts flagged featured/recommended in governance, **When** an employee opens the
   home page, **Then** the Registry widget shows up to 3 of them.
4. **Given** each widget on the home page, **When** an employee activates its "View all →" link,
   **Then** they arrive at the full list — news → `/news`, events → `/events`, Registry → `/registry`.
5. **Given** an employee on any device supported by the app, **When** the home page renders, **Then**
   the widgets are presented with Digdir Designsystemet styling consistent with the rest of the
   employee app.

---

### User Story 2 - Widgets never leak drafts or past items and degrade gracefully when empty (Priority: P2)

As the platform, I guarantee the home-page widgets show only content employees are allowed to see —
never a draft article, never a draft or already-ended event, never an inactive artifact — and that a
widget with nothing to show presents a friendly empty state rather than an error or a blank gap.

**Why this priority**: The widgets are a new place existing content is surfaced; the main risk is
that they surface content the module pages would not (a draft, a past event). This story makes the
visibility invariant and the empty behaviour explicit and independently testable. It builds on US1's
rendering but verifies a distinct guarantee.

**Independent Test**: With a draft news article and a past/draft event present alongside published
upcoming content, open the home page and confirm the draft article and the past/draft event do not
appear in the widgets (only published, non-past content does). Separately, with no published news,
no upcoming events, and no featured/recommended artifacts, confirm each widget shows a friendly empty
state, not an error.

**Acceptance Scenarios**:

1. **Given** a draft news article, **When** an employee opens the home page, **Then** the draft never
   appears in the news widget.
2. **Given** an already-ended or draft event, **When** an employee opens the home page, **Then** it
   never appears in the events widget (only published, upcoming events do).
3. **Given** no published news articles, **When** an employee opens the home page, **Then** the news
   widget shows a friendly empty state (not an error, not a blank).
4. **Given** no upcoming published events, **When** an employee opens the home page, **Then** the
   events widget shows a friendly empty state (not an error, not a blank).
5. **Given** no featured/recommended artifacts, **When** an employee opens the home page, **Then** the
   Registry widget shows a friendly empty state (not an error, not a blank).

---

### User Story 3 - The Registry catalog remains fully reachable at its new route (Priority: P3)

As an employee who came to KI Hub to browse or search the AI-tool Registry, I can still reach the
catalog browse + full-text search exactly as before — now at `/registry`, from a clear header nav
link — so moving the catalog off the landing page does not take it away.

**Why this priority**: Reworking the landing page must not regress the Registry, which is the
platform's differentiating value and the current content of `/`. Moving it to `/registry` is the
highest-churn part of this feature; the invariant — the catalog and its search stay reachable and
functional — must be independently verified.

**Independent Test**: Navigate to `/registry`, confirm the catalog listing renders with filters and
governance state, run a full-text search over it (via the `q` param on `/registry`), and confirm
results behave exactly as they did when the catalog lived on `/`. Confirm `/registry` is reachable
from a header nav link and that the "← Back to catalog" links on `/news` and `/events` point to it.

**Acceptance Scenarios**:

1. **Given** the reworked navigation, **When** an employee wants to browse the Registry, **Then** the
   catalog listing is reachable at `/registry` from a clear header nav link.
2. **Given** the catalog at `/registry`, **When** an employee runs a full-text search, **Then** search
   behaves as it did before this feature (results + filters + governance state), now on `/registry`.
3. **Given** the header navigation, **When** an employee views any employee-app page, **Then** links
   to News, Events, and the Registry (`/registry`) are all present and consistent.
4. **Given** a `/news` or `/events` page, **When** an employee follows its "back to catalog" link,
   **Then** they arrive at `/registry`.

---

### Edge Cases

- **All widgets empty**: a brand-new/empty portal (no published news, no upcoming events, no
  featured/recommended artifacts) shows three friendly empty states and still renders the dashboard
  cleanly.
- **Some widgets empty, some populated**: an empty widget shows its empty state while the others list
  items — no layout break.
- **Fewer items than 3**: a widget with 1–2 items shows just those (no padding, no placeholder rows).
- **A featured item**: featured news/events (and featured/recommended artifacts) are surfaced within
  the widget consistent with how the module list surfaces them.
- **No featured/recommended artifacts, but active artifacts exist**: the Registry widget shows its
  empty state (it curates on the featured/recommended signal, not "any active artifact").
- **Draft / past content present**: draft articles, draft-or-ended events, and inactive artifacts
  exist in the data but never appear in the widgets (guaranteed by the existing read layers).
- **Full-text search**: search now lives at `/registry` (via its `q` param); the `/` dashboard has no
  search branch and always renders the three widgets.
- **"View all →" targets**: each widget's link points at its module list (`/news`, `/events`,
  `/registry`) and works for every employee role.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The employee-app landing page (`/`) MUST be a portal **dashboard** presenting three
  widgets: a **news widget** (most recent published articles), an **events widget** (next upcoming
  published events), and a **Registry widget** (featured/recommended artifacts) — each shown at a
  glance without navigating into the module. The catalog listing MUST NOT be rendered on `/`.
- **FR-002**: Each widget MUST show at most **3** items, honoring the owning module's existing
  ordering (news: featured-first, newest-first; events: featured-first, soonest-first; Registry:
  featured/recommended artifacts).
- **FR-003**: Each widget MUST provide a **"View all →"** affordance linking to that module's full
  list — news → `/news`, events → `/events`, Registry → `/registry`.
- **FR-004**: The news and events widgets MUST source content exclusively from the existing
  published-only read libraries (`listPublishedNews`, `listUpcomingEvents`); the Registry widget MUST
  source from the existing catalog read layer (`listArtifacts`) filtered by the existing governance
  `featured`/`recommended` signal (`getGovernance`). No widget MUST introduce a new query path, and
  none MUST ever display a draft article, a draft/already-ended event, or an inactive artifact.
- **FR-005**: Each widget MUST show a **friendly empty state** (not an error, not a blank gap) when
  it has no items to display, independently per widget.
- **FR-006**: Access to the home page and its widgets MUST reuse the existing `(app)/layout.tsx`
  `requireSession()` gate — only signed-in employees may see it; no new access rule is introduced.
- **FR-007**: The employee-facing widgets and dashboard MUST be built with Digdir Designsystemet
  (Principle VIII), reusing existing components/tokens; the existing listing cards (`NewsCard`,
  `EventCard`, `ArtifactCard`) MUST be reused **as-is** (a compact variant may be added only if the
  dashboard layout later needs it).
- **FR-008**: The feature MUST be additive and introduce **no new Payload collection, no schema
  change, no migration, and no new dependency**; it MUST NOT modify News, Events, Registry,
  governance, or shared packages beyond the employee-app landing/navigation surface (dashboard page,
  the moved catalog route, header nav, and the two back-links).
- **FR-009**: The Registry catalog **browse + full-text search** MUST be moved to a new **`/registry`**
  route and remain fully functional there — results, filters, and governance state MUST behave exactly
  as they did on `/` before this change; the move MUST NOT alter catalog/search logic, only its route.
- **FR-010**: Full-text search MUST live on `/registry` (via its `q` param, as it did on `/`); the
  `/` dashboard MUST NOT branch on a search query and MUST always render the three widgets.
- **FR-011**: The dashboard MUST present exactly three widgets — News, Events, and Registry. The
  Registry widget's curation signal MUST be the existing governance **`featured`/`recommended`**
  flags (no new "featured" concept is introduced).
- **FR-012**: The employee app header navigation MUST expose links to **News**, **Events**, and the
  **Registry** (`/registry`) consistently on every employee-app page, so all three modules remain
  discoverable; the "← Back to catalog" links on `/news` and `/events` MUST point to `/registry`.
- **FR-013**: Any per-widget item-selection logic (take the latest/next/top **3**, honoring
  featured-first ordering; for the Registry widget, select featured/recommended and cap at 3) MUST be
  a small, pure, independently testable selection over the read layers' output — not a new
  data-access rule.

### Key Entities *(include if feature involves data)*

- *No new entities.* This feature introduces no data model. It reads existing **News** and **Event**
  content (owned by Payload, defined in `specs/007-news/` and `specs/009-calendar-events/`) through
  the existing published-only read libraries, and existing **Registry** artifacts + their governance
  state through the existing catalog/governance read layer (`listArtifacts`, `getGovernance` — the
  latter already surfaces `featured`/`recommended`). No collection, field, or migration is added or
  changed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From opening the app, an employee sees the latest published news, the next upcoming
  published events, and featured/recommended tools on the dashboard **without any further navigation**
  (zero clicks).
- **SC-002**: From the dashboard, an employee can reach the full news list, events list, or catalog in
  **one click** via each widget's "View all →" link.
- **SC-003**: **100%** of draft news articles, draft-or-already-ended events, and inactive artifacts
  are absent from the widgets — zero draft/past/inactive leaks — across any content set.
- **SC-004**: When a widget has no items, employees see a **friendly empty state**, never an error or
  a blank gap — verified independently for the news, events, and Registry widgets.
- **SC-005**: The Registry catalog browse **and** full-text search remain reachable at `/registry` and
  behave as before this feature (results, filters, and governance state unchanged) — **no regression**.
- **SC-006**: The feature ships with **zero** new Payload collections, schema changes, migrations, or
  dependencies (verified: no migration file, no collection/field diff, no new package).
- **SC-007**: The existing automated test suite continues to pass (never regresses), with the
  catalog-route move and dashboard reflected in updated tests, plus a focused unit test for the
  per-widget item-selection logic.

## Assumptions

- **Reuse, don't rebuild**: the news/events widgets read through `lib/news.ts::listPublishedNews` and
  `lib/events.ts::listUpcomingEvents` exactly as the module list pages do; those libraries already
  guarantee published-only, drafts-excluded, and (for events) upcoming-only by construction. The
  Registry widget reads through `lib/catalog.ts::listArtifacts` (active-only) + `lib/governance.ts::getGovernance`
  (which already exposes `featured`/`recommended`). No widget needs a new access rule, and the
  existing news/events access integration tests continue to guarantee the underlying visibility
  invariant.
- **Card reuse (confirmed)**: `NewsCard`, `EventCard`, and `ArtifactCard` are reused as-is; a "compact
  home variant" is not built this feature unless the dashboard layout demands it (a presentational
  tweak reusing Designsystemet tokens, never a new data contract).
- **Items per widget (confirmed)**: each widget shows up to **3** items, honoring the module's
  existing featured-first ordering; a widget with fewer items shows only those.
- **Catalog move is in scope and expected**: adding the `/registry` route, moving the current catalog
  listing + full-text search there (unchanged logic), adding its header nav link, updating the header
  navigation, and repointing the "← Back to catalog" links on `/news` and `/events` to `/registry`
  are all anticipated, in-scope changes — as is rewriting `(app)/page.tsx` into the dashboard. Any
  change beyond the employee-app landing/navigation surface (to a collection, access rule, schema,
  News/Events/Registry internals, governance, or a shared package) is a signal the scope has grown and
  MUST be flagged, not made silently.
- **Testing posture (Principle VII + constitution testing gate)**: this feature adds no new module or
  collection, so a heavy access-control matrix test is not mandated. A **light, failing-first unit
  test** covers the "take top/next 3 / featured-first ordering" selection helper(s); the existing
  news-access and events-access integration tests are relied on for the underlying visibility
  guarantee. Existing catalog/search tests are **updated** to the `/registry` route (an expected
  consequence of the move, not new coverage). Needing a *new* integration access test would signal the
  scope grew — stop and say so.
- **Out of scope (deferred to later phases)**: personalization / per-user widget configuration,
  dismissable or reorderable widgets, real-time/live-updating widgets, and pagination or "load more"
  inside a widget.
- **Shared foundation reused unchanged**: Entra/Auth.js session, the five-role model, the
  `requireSession()` employee gate, the Payload/PostgreSQL data layer, and the existing read layers
  are reused as-is; no new datastore, service, or dependency is introduced.
