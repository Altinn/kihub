# Feature Specification: Frontpage Redesign

**Feature Branch**: `011-frontpage-redesign`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "Frontpage redesign: rebuild the portal frontpage (/) to match the old KI HUB site's layout (reference screenshots provided), restyled with the new KI Hub design system (direction 1a: white ground, one Digdir-blue accent, near-black ink — NOT the old dark theme). Sections top to bottom: site header with CMS-managed nav; hero/heading component; two hero navigation tiles (CMS content); 'Tilgjengelige abonnementer' banner (CMS content); calendar/events section integrated with the existing Events backend; news section with the latest 4 published news; CMS-managed footer. Responsive on desktop and mobile. The home-page widgets dashboard (specs/010) is replaced by this richer frontpage."

**Reference visuals**: The three screenshots of the old KI HUB site (header/hero/tiles/subscriptions page, events + news sections, footer) stored in the "KIHub Design System" design project (`uploads/`). Layout and content structure follow those screenshots; **colors, type and spacing follow the new design system** (white ground, one Digdir-blue accent `#0062BA`, near-black ink, Source Serif 4 / Inter) — not the old dark theme.

## Clarifications

### Session 2026-08-03

- Q: Where should the "Meld deg på" (sign up) button on the next-event card lead? → A: Drop the
  registration concept entirely (organizers may run their own invitation systems). The primary
  action is labeled **"Se arrangementet"** and links to the event's detail page.
- Q: Should the hero text be editable in the CMS or maintained in code? → A: **CMS-managed** —
  eyebrow, headline (incl. accent word), lead paragraph and both CTA labels/links are
  editor-managed.
- Q: Should the new CMS-driven header and footer replace the current portal chrome on all
  employee-facing pages, or only the frontpage? → A: **All pages** — they become the shared shell
  for every employee page; the current simpler header is retired.
- Q: Which events should the "Utover måneden" timeline list show? → A: The **next 4 upcoming
  events** after the featured one, regardless of calendar month.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Frontpage core: hero, navigation tiles, subscriptions banner (Priority: P1)

An employee opens the portal frontpage and immediately understands what KI HUB is and where to go:
an eyebrow line ("DIGDIR / BOD / KITT-TEAMET"), a large serif headline with one accent-colored word
("Kunstig intelligens i BOD"), a short lead paragraph, a primary and a secondary call-to-action
button, and an illustration beside the text. Below the hero sit two large navigation tiles (in the
old site: "Katalog → Verktøy" and "Oversikt → KI Prosjekter i BOD") and a full-width "Tilgjengelige
abonnementer" banner listing the AI subscriptions available to employees (e.g. GitHub Copilot,
Claude Teams). The hero, tiles and banner are fixed sections of the page, but their text content
(hero eyebrow, headline, accent word, lead, CTA labels/links; tile tag, title, destination; banner
eyebrow, heading, description, subscription chips) is managed by editors in the back-office — a
content change appears on the frontpage without a code change or deployment.

**Why this priority**: This is the identity of the portal — the first screen every employee sees.
Without it there is no frontpage to attach the other sections to.

**Independent Test**: Visit `/` signed in as an employee; the hero, two tiles and subscriptions
banner render with editor-managed content in the new visual style. Change the hero headline or a
tile title in the back-office and reload — the new text shows.

**Acceptance Scenarios**:

1. **Given** a signed-in employee, **When** they open `/`, **Then** they see the hero (eyebrow,
   headline with accent word, lead, two CTA buttons, illustration slot), two navigation tiles and
   the subscriptions banner, in that order, styled per the new design system.
2. **Given** an editor changes the hero copy, a tile's tag/title/link or a subscription chip in
   the back-office, **When** an employee reloads `/`, **Then** the updated content is shown
   without any deployment.
3. **Given** a tile has a destination link, **When** the employee clicks anywhere on the tile,
   **Then** they navigate to that destination.
4. **Given** frontpage content has not been configured yet, **When** an employee opens `/`,
   **Then** the page renders sensible seeded defaults (no empty/broken sections).

---

### User Story 2 - "Hva skjer i BOD" events section (Priority: P2)

Below the subscriptions banner, the employee sees what is happening: a section titled "Hva skjer i
BOD" with an "ARRANGEMENTER" eyebrow and a "Se kalender →" action. The left side is a "Neste
arrangement" card for the next upcoming published event: a large date numeral with month/year,
weekday and time, a category tag (e.g. WEBINAR), the event title, a meta line (e.g. "Digitalt ·
Teams · KITT-teamet"), a prominent "Se arrangementet" action and a "+ Legg til i kalender" action.
The right side ("Utover måneden") is a vertical timeline of the next 4 upcoming events after the
featured one, regardless of calendar month — each row a colored dot, date + time, title, and a
"type · location" line.

**Why this priority**: Events drive recurring visits and are already fully authored in the
back-office (Phase 8); this section replaces the plain events widget with the richer design.

**Independent Test**: With several published future events in the system, open `/` — the nearest
event appears in the left card with correct date parts, the rest appear in the timeline in
chronological order; "Se kalender →" goes to the events page.

**Acceptance Scenarios**:

1. **Given** published upcoming events exist, **When** an employee opens `/`, **Then** the
   soonest-starting event is shown in the "Neste arrangement" card with date numeral, weekday,
   time, tag, title and meta line.
2. **Given** the next-event card is shown, **When** the employee activates "Se arrangementet" or
   the event title, **Then** they reach the event's detail page.
3. **Given** the next-event card is shown, **When** the employee activates "+ Legg til i
   kalender", **Then** they receive the event as a calendar entry they can add to their own
   calendar.
4. **Given** more upcoming events exist beyond the next one, **When** the section renders,
   **Then** the next 4 of them (regardless of calendar month) are listed in the timeline
   chronologically with date, time, title and type · location.
5. **Given** no published upcoming events exist, **When** an employee opens `/`, **Then** the
   section shows a friendly empty state (with the "Se kalender →" link still available).

---

### User Story 3 - "Siste nytt" news section (Priority: P2)

Below events, the employee sees the four most recent published news articles under an "AKTUELT"
eyebrow and "Siste nytt" heading, with an "Alle nyheter →" action. Each news card shows the
article's image, its date, a serif title and a short summary, and links to the full article.

**Why this priority**: News is the other recurring-visit driver; content and read APIs already
exist (Phase 7) — this is a presentation upgrade from 3 plain cards to 4 designed cards.

**Independent Test**: With at least four published news articles, open `/` — exactly the four most
recent appear as image cards, newest first; "Alle nyheter →" goes to the news listing.

**Acceptance Scenarios**:

1. **Given** four or more published news articles, **When** an employee opens `/`, **Then**
   exactly the 4 most recently published are shown, newest first, each with image, date, title and
   summary, linking to the article.
2. **Given** an article has no image, **When** its card renders, **Then** a design-system
   placeholder media well is shown instead of a broken/empty image.
3. **Given** fewer than four published articles exist, **When** the section renders, **Then** the
   available articles are shown without layout breakage; **Given** none exist, **Then** a friendly
   empty state is shown.

---

### User Story 4 - Site header with CMS-managed navigation (Priority: P3)

Every page of the employee app shows a site header: the kitt/KI HUB brand lockup on the left
(linking to `/`), a horizontal primary navigation whose items (label, destination, order) are
managed by editors in the back-office, and a search affordance on the right that takes the employee
to the portal's search. On narrow screens the navigation collapses into an accessible menu toggle.

**Why this priority**: The header is shared chrome — valuable, but the frontpage sections above
deliver the visible redesign; the current simpler header keeps working until this lands. When it
does land, it replaces the current header on every employee page (per clarification).

**Independent Test**: Add/reorder a nav item in the back-office; reload any page — the header
reflects it. Shrink the viewport — items collapse into a working menu.

**Acceptance Scenarios**:

1. **Given** nav items configured in the back-office, **When** any employee page renders, **Then**
   the header shows them in the configured order, and each navigates to its destination.
2. **Given** an editor adds, edits, reorders or removes a nav item, **When** a page is reloaded,
   **Then** the change is live without deployment.
3. **Given** a narrow (mobile) viewport, **When** the header renders, **Then** navigation is
   reachable via a menu toggle operable by keyboard and screen reader.
4. **Given** any viewport, **When** the employee activates the search affordance, **Then** they
   reach the portal search.

---

### User Story 5 - Site footer with CMS-managed content (Priority: P3)

Every page ends with a footer on an inverted (dark ink) surface: the kitt/KI HUB brand lockup, a
contact block ("Kontakt oss:" with a mailto link), and a column of footer links (e.g. Om KITT,
Verktøy, Prosjekter, Nyheter) — all editor-managed in the back-office.

**Why this priority**: Completes the page frame; same CMS mechanism as the header.

**Independent Test**: Change the contact email or a footer link in the back-office; reload — the
footer reflects it. The footer renders correctly on desktop (three zones) and stacks on mobile.

**Acceptance Scenarios**:

1. **Given** footer content configured in the back-office, **When** any employee page renders,
   **Then** the footer shows brand lockup, contact block and link list per configuration.
2. **Given** an editor changes footer content, **When** a page is reloaded, **Then** the change is
   live without deployment.

---

### Edge Cases

- Frontpage CMS content (nav, tiles, banner, footer) not yet configured → seeded defaults render;
  no section appears empty or broken.
- No upcoming events / no published news → per-section friendly empty states; the rest of the page
  is unaffected.
- Exactly one upcoming event → the "Neste arrangement" card renders and the timeline side shows an
  appropriate quiet state.
- An event without a location or online link → meta line and timeline row omit the missing part
  gracefully (no dangling separators).
- Very long titles (events, news, tiles) → wrap without breaking layout on any viewport.
- News image URL is broken → placeholder media well is shown.
- All content must remain usable at small mobile widths (~360 px) and large desktop widths.
- Keyboard-only use: every interactive element is reachable and shows the design system's focus
  ring; tiles and cards are single, well-labeled links (no nested/duplicate tab stops).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The frontpage `/` MUST present, in order: site header, hero, two navigation tiles,
  subscriptions banner, events section ("Hva skjer i BOD"), news section ("Siste nytt"), footer —
  replacing the current widgets dashboard from specs/010.
- **FR-002**: All frontpage sections MUST be styled with the new KI Hub design system (white
  ground, single blue accent, near-black ink, serif display type, Inter labels), NOT the old dark
  theme, while matching the old site's layout structure from the reference screenshots.
- **FR-003**: The hero MUST show an eyebrow, a headline with one accent-colored word, a lead
  paragraph, a primary and a secondary CTA, and an illustration slot; eyebrow, headline, accent
  word, lead and both CTAs (label + destination) are editor-managed in the back-office.
- **FR-004**: The two navigation tiles MUST each render an editor-managed tag, title and
  destination; the whole tile is one link. Tile positions/count (2) are fixed by the page design.
- **FR-005**: The subscriptions banner MUST render an editor-managed eyebrow, heading, description
  and an ordered list of subscription chips (name, optional link).
- **FR-006**: The events section MUST source only published events with a future start from the
  existing events backend; the soonest event populates the "Neste arrangement" card (date numeral,
  month/year, weekday, time, tag, title, meta line); the next 4 further events — regardless of
  calendar month — populate the "Utover måneden" timeline chronologically (date, time, title,
  type · location, colored dot).
- **FR-007**: The "Neste arrangement" card MUST provide a "Se arrangementet" action leading to the
  event's detail page, a "+ Legg til i kalender" action that yields an importable calendar entry,
  and the section MUST link to the full events page ("Se kalender →"). No registration/sign-up
  concept is introduced (per clarification).
- **FR-008**: The news section MUST show the 4 most recently published news articles, newest
  first, each with image (or placeholder), date, title and summary, linking to the article; the
  section MUST link to the full news listing ("Alle nyheter →").
- **FR-009**: The site header MUST show the brand lockup (linking to `/`), primary navigation
  items managed by editors (label, destination, order), and a search affordance leading to the
  portal search; it MUST be shared across all employee-facing pages, replacing the current
  simpler portal header everywhere in this feature.
- **FR-010**: The site footer MUST show the brand lockup, an editor-managed contact block
  (label + email link) and an editor-managed ordered link list; it MUST be shared across all
  employee-facing pages and rendered on the inverted (dark ink) surface.
- **FR-011**: Header navigation, hero, tiles, subscriptions banner and footer content MUST be
  manageable by editors in the back-office without code changes or deployments; the
  employee-facing app reads this content read-only. Editing rights follow the existing
  editor/admin role model, enforced server-side.
- **FR-012**: The system MUST provide seeded default content for nav, hero, tiles, banner and
  footer so the frontpage renders completely before editors touch anything.
- **FR-013**: Every section MUST be responsive: multi-column layouts collapse to single-column on
  mobile, the header collapses to an accessible menu toggle, and no horizontal page scrolling
  occurs at mobile widths.
- **FR-014**: All interactive elements MUST be keyboard-operable with the design system's visible
  focus ring; images MUST have appropriate alternative text; sections MUST use proper landmark/
  heading structure.
- **FR-015**: The frontpage MUST remain read-only toward News/Events (no authoring on the
  employee surface) and MUST NOT introduce any storage of AI-artifact content.

### Key Entities

- **Navigation item**: label, destination URL/path, sort order. Editor-managed; consumed by the
  site header.
- **Hero content**: eyebrow, headline, accent word, lead paragraph, primary/secondary CTA
  (label + destination). Editor-managed; one per frontpage.
- **Frontpage tile**: tag text, title, destination. Exactly two on the frontpage; editor-managed.
- **Subscriptions banner**: eyebrow, heading, description, ordered subscription chips (name,
  optional link). Editor-managed.
- **Footer content**: contact label + email, ordered footer links (label, destination).
  Editor-managed.
- **News article** *(existing)*: title, slug, summary, publish date, hero image, status. Read-only
  here; latest 4 published shown.
- **Event** *(existing)*: title, slug, start/end date-time, location, online URL, organizer, tags,
  status. Read-only here; upcoming published shown.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An employee opening `/` sees all seven sections (header → footer) rendered in the
  new visual style on the first screen-load, with no broken/empty section, even on a freshly
  seeded environment.
- **SC-002**: An editor can change any nav item, tile, subscription chip or footer link in the
  back-office and see it live on the frontpage within one reload — zero deployments.
- **SC-003**: With published content available, the frontpage always shows the chronologically
  next event and exactly the 4 newest news articles — verified against the same data the events
  and news pages show.
- **SC-004**: The frontpage is fully usable at 360 px and 1440 px widths: no horizontal scrolling,
  all actions reachable, header menu operable on mobile.
- **SC-005**: 100% of interactive elements on the frontpage are keyboard-reachable and show the
  focus ring; automated accessibility checks on the frontpage report no critical issues.
- **SC-006**: All existing test suites keep passing; the replaced widgets dashboard's user-facing
  guarantees (latest news, upcoming events reachable from `/`) remain covered by the new sections.

## Assumptions

- **"+ Legg til i kalender"** reuses the Phase 8 calendar-entry capability (downloadable calendar
  file per event) if present; otherwise a per-event calendar file download is added as part of the
  events section work.
- **Event category tag** (e.g. "WEBINAR") renders from the event's first tag; events without tags
  show no tag chip.
- **Timeline dot colors** are decorative variation within the design system's palette and carry no
  semantic meaning.
- **Search affordance** points at the existing portal search on the registry page (the portal's
  only search today).
- **Recommended/featured Registry artifacts widget** from specs/010 is retired from the frontpage;
  the Registry is reached via a navigation tile and the header nav instead.
- **The old site's illustration** (line-drawn figure with "KI" badge) is replaced by a slot that
  can hold a decorative illustration/graphic; final artwork is provided later and is not a
  blocker.
- **Editors** use the existing back-office roles (editor/admin); no new roles are introduced.
- **Norwegian (bokmål)** remains the UI language, matching the rest of the portal.
