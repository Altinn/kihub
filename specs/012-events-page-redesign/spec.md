# Feature Specification: Events Page Redesign (Kalender + Liste)

**Feature Branch**: `012-events-page-redesign`

**Created**: 2026-08-05

**Status**: Draft

**Input**: User description: "Redesign the /events page ('Arrangementer') into a full events
browsing experience with two switchable views — a month-grid calendar view and a chronologically
grouped list view with type/format filters — modeled on the old KI HUB app's calendar page
(screenshots provided) but restyled with the kihub design system. Extend the Event content model
with event type, format, channel, and seat-capacity information. Bring the events list and detail
pages up to the kihub token layer with Norwegian copy. Keep the existing ICS export and the
frontpage events section working."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and filter upcoming events in the list view (Priority: P1)

An employee opens "Arrangementer" from the site navigation and lands on a list of upcoming
published events, grouped chronologically under date headings ("Fredag 3. juli", "Onsdag 8. juli",
…). Each event row shows the start time, the title, a meta line (where it happens, how it is
delivered, and seat availability), and an event-type badge. The employee narrows the list using a
filter sidebar — event type (multi-select) and form of participation (single-select) — and can
reset all filters with one action. Clicking an event opens its detail page.

**Why this priority**: This is the core daily-use surface of the Calendar module. The current
events page is an unfiltered flat list with English copy on outdated styling; the grouped,
filterable list is the primary value of the redesign and is useful entirely on its own.

**Independent Test**: Can be fully tested by publishing a handful of events with different types,
formats, and dates, opening the events page, verifying chronological date grouping and row
content, applying each filter kind (and combinations), and resetting filters.

**Acceptance Scenarios**:

1. **Given** published upcoming events on three different days, **When** an employee opens the
   events page, **Then** events appear grouped under one date heading per day, days in ascending
   order, and events within a day ordered by start time.
2. **Given** an event with a seat capacity of 24 and 15 seats taken, **When** the list renders,
   **Then** its row shows "9 av 24 plasser igjen".
3. **Given** an event with no seat capacity, **When** the list renders, **Then** its row shows
   "Åpen for alle".
4. **Given** the employee selects the types "Webinar" and "Kurs", **When** the list refreshes,
   **Then** only events of those two types are shown and the selection is visible in the filter
   sidebar and reflected in the page address.
5. **Given** the employee selects the form "Digitalt", **When** the list refreshes, **Then** only
   digital events are shown; selecting "Alle" removes the form constraint.
6. **Given** active filters, **When** the employee activates "Nullstill filtre", **Then** all
   filters clear and the full upcoming list is shown.
7. **Given** active filters that match no events, **When** the list renders, **Then** a friendly
   Norwegian empty state explains that no events match the current filters.
8. **Given** a draft event and a past event, **When** an employee views the list, **Then**
   neither appears.

---

### User Story 2 - See the month at a glance in the calendar view (Priority: P2)

From the events page, the employee switches to the "Kalender" tab and sees a month grid
(Monday-first, Norwegian weekday headers) for the current month. Events appear inside their day
cells as small colored entries, colored by event type, with a legend above the grid explaining
the colors. Today's date is highlighted. The employee pages to earlier or later months with
previous/next controls and opens an event by clicking its entry.

**Why this priority**: The at-a-glance month overview is the feature that earned the page its
"Kalender" name in the old app and was explicitly deferred by the original events phase. It
builds on the same data as the list but is secondary to finding and reading events.

**Independent Test**: Can be tested by publishing events across two adjacent months, switching to
the calendar view, verifying grid shape, placement, coloring, legend, today-highlight, and month
navigation in both directions.

**Acceptance Scenarios**:

1. **Given** the calendar view for the current month, **When** it renders, **Then** the grid
   starts weeks on Monday with nb-NO weekday headers, shows the month title (e.g. "August 2026"),
   dims leading/trailing days that belong to adjacent months, and highlights today's date.
2. **Given** a published event on the 12th of the displayed month, **When** the grid renders,
   **Then** the event appears in the cell for the 12th, colored by its event type, and links to
   the event's detail page.
3. **Given** the legend above the grid, **When** it renders, **Then** it maps each of the five
   event types to its calendar color.
4. **Given** the displayed month is August, **When** the employee activates the next-month
   control, **Then** September renders with its events, and the displayed month is reflected in
   the page address so the view can be shared or bookmarked.
5. **Given** a published event earlier in the displayed month that has already passed, **When**
   the calendar renders, **Then** the past event still appears in its day cell (the month view is
   a complete month, unlike the upcoming-only list).
6. **Given** a multi-day event spanning the 3rd–5th, **When** the grid renders, **Then** the
   event appears in each day cell it spans within the displayed month.
7. **Given** a day with more events than the cell can reasonably show, **When** the grid renders,
   **Then** the cell shows the first few events and a "+N flere" indicator for the remainder.

---

### User Story 3 - Editors describe events with type, form, and capacity (Priority: P3)

A Contributor+ editor creating or editing an event in the back-office selects the event's type
(Webinar, Verksted, Kurs, Konferanse, Internt) and form (Digitalt, Oppmøte, Hybrid), optionally
names the delivery channel (e.g. "Teams"), and optionally sets a seat capacity together with the
number of seats already taken. Published events immediately reflect this on the employee surface.

**Why this priority**: The new browsing experience depends on this data, but entering it is an
editorial workflow that only a handful of people exercise; it has no standalone employee-facing
value without stories 1–2.

**Independent Test**: Can be tested by creating an event in the back-office with each new field
set, publishing it, and verifying the values drive the list row, calendar color, and detail page.

**Acceptance Scenarios**:

1. **Given** an editor creating an event, **When** the form is shown, **Then** event type and
   form are required choices (with sensible defaults) and channel/capacity are optional.
2. **Given** an editor sets capacity 30 and 22 seats taken, **When** the event is published,
   **Then** employees see "8 av 30 plasser igjen".
3. **Given** events that existed before this feature, **When** the redesigned page ships,
   **Then** those events still render correctly with defaulted type/form values and no seat
   capacity ("Åpen for alle").
4. **Given** a Reader-role user, **When** they attempt to create or modify an event, **Then**
   the attempt is refused (unchanged access rules).

---

### User Story 4 - Read a restyled Norwegian event detail page (Priority: P4)

An employee opens an event and reads a detail page presented in the kihub visual language with
Norwegian copy: title, event-type badge, date/time, place and form of participation, channel,
seat availability, organizer, description, and an "add to calendar" action. A link takes them
back to the events overview.

**Why this priority**: The detail page already works; this story upgrades its presentation and
completeness. Valuable, but the page is functional without it.

**Independent Test**: Can be tested by opening a published event's detail page and verifying
content, language, styling tokens, the calendar-file download, and the back link.

**Acceptance Scenarios**:

1. **Given** a published event with all fields set, **When** its detail page renders, **Then**
   it shows the type badge, when, where, form, channel, seat availability, organizer, and
   description in Norwegian, styled with the kihub token layer.
2. **Given** the detail page, **When** the employee activates "Legg til i kalender", **Then**
   they receive the same calendar file the existing export provides.
3. **Given** the detail page, **When** the employee looks for a way back, **Then** a link
   returns them to the events overview (the stale "Back to catalog" link is gone).
4. **Given** a draft or unknown event address, **When** visited, **Then** the page is not found
   (unchanged behavior).

---

### Edge Cases

- **Day with many events (calendar)**: cells cap the number of visible entries and show a
  "+N flere" remainder indicator; the full set remains reachable via the list view and detail
  pages.
- **Seats taken ≥ capacity**: the row shows "Fullt" instead of a negative or zero remainder;
  the event remains visible and clickable.
- **Seats taken set without capacity**: treated as "Åpen for alle" (capacity is the switch).
- **Multi-day events**: appear under their start date in the list view (one row); appear in every
  spanned day cell in the calendar view; days that only continue an event still count it toward
  the cell's entries.
- **Events spanning a month boundary**: the calendar shows the days that fall inside the
  displayed month only; adjacent-month cells in the same grid also show their events (dimmed
  day, normal entry).
- **Month navigation limits**: no hard limit; months without events render an empty grid (the
  grid itself is the content). The list view keeps its friendly empty state.
- **Invalid view/month/filter values in the page address**: unknown view falls back to the
  default view; malformed month falls back to the current month; unknown filter values are
  ignored rather than erroring.
- **Timezone/DST boundaries**: an event at 00:30 Oslo time must group under the correct Oslo
  calendar day even when stored timestamps cross UTC day boundaries.
- **No upcoming events at all**: list view shows the friendly empty state; calendar view shows
  the current month's empty grid.
- **Legacy events without the new fields**: render with the defaulted type and form and as
  "Åpen for alle"; they must never crash or vanish from either view.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The events page MUST offer two switchable presentations — a list view ("Liste")
  and a month-grid calendar view ("Kalender") — via a segmented toggle placed with the page
  heading; the active view MUST be reflected in the page address so it can be shared and
  bookmarked, and the list view is the default.
- **FR-002**: The list view MUST show only published, upcoming events (events whose end — or
  start, when no end is set — has not passed), grouped under one Norwegian date heading per
  calendar day (e.g. "Fredag 3. juli"), days ascending, events within a day by start time.
- **FR-003**: Each list row MUST show: start time (HH:mm, Oslo time), title linking to the
  event's detail page, a meta line combining place of participation (location, or "Digitalt"
  for digital events), delivery channel when present, and seat availability, an event-type
  badge, and a forward affordance.
- **FR-004**: Seat availability MUST render as "X av Y plasser igjen" (Y = capacity, X =
  capacity minus seats taken, floored at zero — "Fullt" when nothing remains) when a capacity
  is set, and "Åpen for alle" when it is not.
- **FR-005**: The list view MUST provide a filter sidebar with: TYPE — independent multi-select
  over the five event types (Webinar, Verksted, Kurs, Konferanse, Internt); FORM — single-select
  over Alle / Digitalt / Oppmøte / Hybrid (default Alle); and a "Nullstill filtre" reset. Filter
  state MUST be reflected in the page address, applied server-side, and function without
  client-side scripting.
- **FR-006**: The calendar view MUST render the displayed month as a Monday-first grid with
  nb-NO weekday headers (MAN–SØN), the month title (e.g. "August 2026"), previous/next month
  controls, today's date visually highlighted, and leading/trailing adjacent-month days rendered
  dimmed. The displayed month MUST be reflected in the page address; the current month is the
  default.
- **FR-007**: The calendar view MUST show all published events of the displayed month —
  including those already past — as small entries inside their day cells, each colored by event
  type and linking to the event's detail page. Multi-day events appear in every day cell they
  span. Cells cap visible entries and indicate the remainder as "+N flere".
- **FR-008**: The calendar view MUST show a legend mapping each of the five event types to its
  distinct calendar color. The five colors MUST come from the sanctioned token palette as a
  categorical (data-distinguishing) use — not status semantics — and MUST be accompanied by the
  type name in text wherever a color identifies a type (legend and accessible labels), so color
  is never the sole carrier of meaning.
- **FR-009**: The Event content model MUST be extended with: event type (required choice:
  webinar, verksted, kurs, konferanse, internt — defaulting to internt), form (required choice:
  digitalt, oppmøte, hybrid — defaulting to digitalt), optional delivery channel (short text,
  e.g. "Teams"), optional seat capacity (positive whole number), and seats taken (non-negative
  whole number, meaningful only when capacity is set). Existing free-form tags remain unchanged.
- **FR-010**: Events created before this feature MUST be backfilled so both views render them
  correctly: type defaults to internt; form is inferred from existing data (online link only →
  digitalt; location only → oppmøte; both → hybrid; neither → digitalt); no capacity (Åpen for
  alle). Editors can correct values afterwards in the back-office.
- **FR-011**: Editors with Contributor role or above MUST be able to set all new fields in the
  back-office; capacity/seats-taken are maintained editorially (no employee-facing registration
  or RSVP in this feature). Access rules are otherwise unchanged: employees see published events
  only, and write access remains Contributor+ and server-enforced.
- **FR-012**: Seats taken MUST NOT be accepted above the set capacity, and capacity/seats taken
  MUST be validated as whole numbers within their ranges at save time.
- **FR-013**: The events list page and the event detail page MUST be restyled with the kihub
  token layer (white ground, single accent, established type roles) with all copy in Norwegian
  (bokmål), replacing the current English copy and the stale "Back to catalog" link with a link
  back to the events overview. Styling MUST come exclusively from the shared token layer.
- **FR-014**: The event detail page MUST additionally present the event-type badge, form of
  participation, delivery channel, and seat availability, and MUST offer the "Legg til i
  kalender" calendar-file download for the event.
- **FR-015**: The existing calendar-file export address for an event MUST keep working
  unchanged, and the frontpage "Hva skjer i BOD" section MUST keep functioning; its event cards
  MUST show the event-type name where they previously showed the first free-form tag.
- **FR-016**: Both views MUST never expose draft events, directly or via address manipulation
  (defense in depth in both the read layer and the access layer, as established by the original
  events feature).
- **FR-017**: All dates, times, groupings, and day boundaries MUST use the Europe/Oslo timezone
  and nb-NO formatting conventions, including across DST transitions and UTC day-boundary
  crossings.
- **FR-018**: Invalid address state MUST degrade gracefully: unknown view values fall back to
  the list view, malformed months to the current month, unknown filter values are ignored.

### Key Entities

- **Event** (existing, extended): an internal happening with title, address-friendly identifier,
  description, start (required) and optional end, optional location, optional online link,
  organizer, publication status, free-form tags, featured flag — extended with **event type**
  (one of five), **form** (digitalt/oppmøte/hybrid), optional **channel**, optional **capacity**,
  and **seats taken**.
- **Event type**: closed set of five categories (Webinar, Verksted, Kurs, Konferanse, Internt),
  each with a stable Norwegian display name and a distinct calendar color drawn from the
  sanctioned palette.
- **Events page view state**: the shareable combination of active view (liste/kalender),
  displayed month (calendar), and active filters (list), carried in the page address.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An employee can go from opening the events page to the detail page of a specific
  upcoming event (known by name and rough date) in under 30 seconds using grouping or filters.
- **SC-002**: 100% of published upcoming events appear in the list view, and 100% of the
  displayed month's published events appear in the calendar view, on correct Oslo-time days.
- **SC-003**: Draft events are never visible to employees in either view, under any combination
  of address parameters — 100% of access-control checks pass.
- **SC-004**: Filtering, switching views, and paging months each require exactly one user action
  and work with client-side scripting disabled.
- **SC-005**: Every pre-existing event renders correctly in both views after the change, with no
  editorial intervention required (backfill success rate 100%).
- **SC-006**: All employee-facing copy on the events surfaces is Norwegian (bokmål); no English
  strings remain on the list or detail pages.
- **SC-007**: Type is never conveyed by color alone: every colored entry or legend swatch has a
  visible or accessible text equivalent (100% of instances).

## Assumptions

- **Default view is the list** ("Liste"): it is the denser, more informative entry point and
  matches the current page's role; the calendar is one click away. (The old app's default is
  not documented.)
- **Filters belong to the list view only**; the calendar view uses the type legend instead of
  filters, matching the old app's layout.
- **Backfill defaults**: type internt, form inferred as per FR-010. "Internt" is the safest
  neutral category for historical internal events; editors can recategorize.
- **Capacity is editorial**: seat counts are maintained by editors in the back-office. A real
  registration/RSVP flow is a separate future feature; nothing in this design should preclude
  it (capacity/seats-taken are modeled so a registration flow could later write seats taken).
- **No recurring events**: out of scope, unchanged from the original events feature.
- **The existing month-grid deferral list** (specs/009-calendar-events) is partially resolved by
  this feature: month-grid view ships; RSVP/registration and recurrence remain deferred.
- **Existing read behavior is reused**: published-only reads, slug-addressed detail pages, and
  the calendar-file export contract from the frontpage feature stay as-is.
- **The site navigation already links to the events page** ("Arrangementer"); no navigation
  changes are needed.
- **Seat data quality is the editors' responsibility**; the system only guards ranges (FR-012),
  not real-world accuracy.
