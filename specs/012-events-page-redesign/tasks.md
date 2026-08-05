# Tasks: Events Page Redesign (Kalender + Liste)

**Input**: Design documents from `/specs/012-events-page-redesign/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — the constitution mandates automated tests for access control and
state/validation rules, and the pure view module is the feature's risk center (date/DST math).

**Organization**: Grouped by user story; US1 (list) is the MVP increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 = list view, US2 = calendar view, US3 = editor fields, US4 = detail restyle

## Phase 1: Setup

**Purpose**: Confirm the working baseline before touching schema or pages.

- [X] T001 Start local DB (`colima start && docker compose up -d`) and verify the existing suite
      is green: `source apps/web/.env && pnpm --filter web test` (expect 141 passing)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data model, pure view math, read layer, and shared tokens that every story needs.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Create pure view module `apps/web/src/lib/events-view.ts` per
      contracts/events-read.md: `EVENT_TYPES`/`EVENT_TYPE_LABELS`,
      `EVENT_FORMATS`/`EVENT_FORMAT_LABELS`, `parseEventsSearchParams` (FR-018 fallbacks),
      `buildMonthGrid` (6×7 Monday-first), `osloDayKey`, `eventDayKeys`, `groupEventsByDay`,
      `formatDateChip`, `formatMonthTitle`, `prevMonth`/`nextMonth`, `gridRange`, `seatsText`,
      `placeText`, `validateSeatCapacity` — no Payload imports
- [X] T003 [P] Unit tests `apps/web/tests/unit/events-view.test.ts`: grid shape (Feb, DST
      months, Monday-first, today flag), `osloDayKey` across UTC midnight + DST, multi-day
      `eventDayKeys`, grouping order, param-parse fallback matrix, `seatsText`
      (åpen/fullt/floor-at-zero), `formatDateChip`/`formatMonthTitle`, `validateSeatCapacity`
- [X] T004 Extend `apps/web/src/collections/Event.ts` per contracts/events-collection-v2.md:
      `eventType` (select, required, default `internt`), `format` (select, required, default
      `digitalt`, label "Oppmøte" for `oppmote`), `channel` (text), `capacity` (number, min 1),
      `seatsTaken` (number, min 0); call `validateSeatCapacity` in the existing
      `beforeValidate` hook
- [X] T005 Regenerate Payload types: `pnpm --filter web payload generate:types` →
      `apps/web/src/payload-types.ts`
- [X] T006 Create production migration `pnpm --filter web migrate:create
      events_type_format_capacity`, hand-add the `format` inference backfill UPDATE
      (data-model.md Backfill), and register it in `apps/web/src/migrations/index.ts`
- [X] T007 Extend `apps/web/src/lib/events.ts` per contracts/events-read.md:
      `listUpcomingEvents(filters?: { types?; form? })` (query-side filtering, featured re-sort
      kept) and new `listEventsInRange(fromIso, toIso)` (published, range-overlap, asc)
- [X] T008 Extend `apps/web/tests/integration/events-access.test.ts`: create without new fields
      → defaults internt/digitalt; `seatsTaken > capacity` rejected; fractional/zero capacity
      rejected; draft exclusion still holds for both read functions
- [X] T009 Add the events style block to `apps/web/src/styles/portal.css`: `--ev-cat-*` alias
      tokens (contracts/events-page-ui.md) and shared `.ev-head` (h1 + toggle row) styles

**Checkpoint**: Schema + libs + tokens ready — user stories can start.

---

## Phase 3: User Story 1 — Browse and filter the list view (Priority: P1) 🎯 MVP

**Goal**: `/events` renders upcoming published events grouped under Norwegian date chips with a
TYPE/FORM filter sidebar and reset, all URL-driven, no client JS.

**Independent Test**: Publish events across days/types/formats → open `/events`: grouping,
row content (time/title/meta/badge/arrow), each filter, combinations, reset, empty states,
draft/past exclusion (spec US1 acceptance scenarios 1–8).

### Implementation for User Story 1

- [X] T010 [P] [US1] Create `apps/web/src/components/EventTypeBadge.tsx` — uppercase label on
      the type's `--ev-cat-*-surface`, text `--kihub-text`
- [X] T011 [P] [US1] Create `apps/web/src/components/EventsViewToggle.tsx` — Kalender | Liste
      segmented links, `aria-current` on active
- [X] T012 [P] [US1] Create `apps/web/src/components/EventsFilters.tsx` — link-based TYPE
      checkboxes (multi, `aria-pressed`) + FORM radios (single, Alle default) + "Nullstill
      filtre", CatalogFilters URL-toggle pattern, kihub-styled
- [X] T013 [P] [US1] Create `apps/web/src/components/EventsDayList.tsx` — date chips via
      `formatDateChip` + rows (formatTimeHM · linked title · `placeText · channel? ·
      seatsText` · EventTypeBadge · → affordance); empty-state variants (ingen kommende /
      ingen treff + reset link)
- [X] T014 [US1] Rebuild `apps/web/src/app/(app)/events/page.tsx` — await `searchParams`,
      `parseEventsSearchParams`, list branch: `listUpcomingEvents({ types, form })` →
      `groupEventsByDay` → sidebar + `EventsDayList`; Norwegian copy; kihub container/heading
- [X] T015 [US1] Add list-view styles to `apps/web/src/styles/portal.css`: `.ev-layout`
      (~260px sidebar | 1fr, collapses < 900px), `.ev-datechip`, `.ev-row`, filter rows
- [X] T016 [US1] Delete `apps/web/src/components/EventCard.tsx` (only consumer was the old
      `/events` page); verify with a repo-wide import search
- [X] T017 [US1] Extend `apps/web/tests/integration/events-access.test.ts`: filtered
      `listUpcomingEvents` — single type, multi type, form, type+form, no-filter = all

**Checkpoint**: List view fully functional — MVP shippable.

---

## Phase 4: User Story 2 — Month-grid calendar view (Priority: P2)

**Goal**: `?view=kalender` renders the Monday-first Oslo month grid with type-colored entries,
legend, today highlight, dimmed adjacent days, and `?month=` navigation.

**Independent Test**: Publish events across two adjacent months incl. one past-in-month, one
multi-day, 4 on one day → verify grid shape, placement, colors+legend, today, "+N flere",
month nav both directions, malformed `month` fallback (spec US2 scenarios 1–7).

### Implementation for User Story 2

- [X] T018 [US2] Create `apps/web/src/components/EventsMonthCalendar.tsx` — legend (5 swatch +
      label pairs), weekday header MAN–SØN, 6×7 grid from `buildMonthGrid`, entries as links
      (type dot + HH:mm + truncated title, `aria-label` with type), cap 3 + "+N flere",
      `.ev-cell--dim`/`--today` states
- [X] T019 [US2] Extend `apps/web/src/app/(app)/events/page.tsx` — kalender branch:
      `gridRange` → `listEventsInRange`, place events via `eventDayKeys`, month title +
      `‹`/`›` links (`prevMonth`/`nextMonth`, aria-labels "Forrige/Neste måned")
- [X] T020 [US2] Add calendar styles to `apps/web/src/styles/portal.css`: `.ev-cal` grid,
      header row, cell min-height, entry chips, legend, today disc, dim state, horizontal
      scroll wrapper for narrow viewports
- [X] T021 [US2] Extend `apps/web/tests/integration/events-access.test.ts`:
      `listEventsInRange` — past-in-month included, span-overlap included, outside-range and
      draft excluded, ascending order

**Checkpoint**: Both views work; toggle switches between them.

---

## Phase 5: User Story 3 — Editors maintain type/form/capacity (Priority: P3)

**Goal**: Contributor+ sets the new fields in `/cms`; legacy events render via defaults +
backfill.

**Independent Test**: In `/cms`, create an event setting every new field → published values
drive list row, calendar color, detail; clear fields → defaults; Reader writes still refused
(spec US3 scenarios 1–4; write-access cases already covered by existing tests + T008).

### Implementation for User Story 3

- [X] T022 [US3] Polish the admin config in `apps/web/src/collections/Event.ts`: Norwegian
      option labels (incl. "Oppmøte"), field descriptions (channel/capacity/seatsTaken
      editorial guidance), add `eventType` + `format` to `admin.defaultColumns`
- [X] T023 [US3] Validate the migration path: run `pnpm --filter web migrate` against a scratch
      database seeded with pre-012 rows and confirm `event_type='internt'`, inferred `format`
      (hybrid/oppmote/digitalt matrix), NULL capacity (quickstart "Production migration check")

**Checkpoint**: Editorial workflow complete end-to-end.

---

## Phase 6: User Story 4 — Restyled Norwegian detail page (Priority: P4)

**Goal**: `/events/[slug]` in kihub tokens with badge, full meta, ICS action, and Norwegian
copy.

**Independent Test**: Open a fully-populated published event → verify badge, when/where/form/
channel/seats/organizer, "+ Legg til i kalender" downloads ICS, "← Til arrangementer" link;
draft slug → 404 (spec US4 scenarios 1–4).

### Implementation for User Story 4

- [X] T024 [US4] Restyle `apps/web/src/app/(app)/events/[slug]/page.tsx` per
      contracts/events-page-ui.md: kihub container/h1/prose, `EventTypeBadge`,
      `formatEventWhen` + organizer, meta block (`placeText`, channel, onlineUrl "Delta
      digitalt" link, `seatsText`), "+ Legg til i kalender" → `/events/[slug]/ics`,
      "← Til arrangementer"; keep 404 behavior; any needed styles into the portal.css
      `.ev-detail` block

**Checkpoint**: All four stories functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T025 [P] Frontpage FR-015: swap `event.tags?.[0]` for
      `EVENT_TYPE_LABELS[event.eventType]` in `apps/web/src/components/NextEventCard.tsx` and
      `apps/web/src/components/EventsTimeline.tsx` (meta/type lines only; ICS + selection
      untouched)
- [X] T026 Full verification: `source apps/web/.env && pnpm --filter web test` (all suites
      green), `pnpm --filter web lint`, `pnpm --filter web build`
- [X] T027 Manual quickstart validation (quickstart.md scenarios 1–8) against the dev server,
      including the no-JS check and a browser screenshot of both views
- [X] T028 Update CLAUDE.md SPECKIT block status to implemented + final suite count

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (P1)** → **Foundational (P2)** → user stories.
- **US1 (Phase 3)**: only needs Foundational. **MVP**.
- **US2 (Phase 4)**: needs Foundational; shares `page.tsx`/`portal.css` with US1 → run after
  T014/T015 (or coordinate on those two files).
- **US3 (Phase 5)**: needs Foundational only (T004/T006); independent of US1/US2.
- **US4 (Phase 6)**: needs Foundational + T010 (EventTypeBadge).
- **Polish (Phase 7)**: after all desired stories; T025 needs only Foundational (T002/T005).

### Within Foundational

T002 → T003; T004 → T005 → T006; T007 needs T005 (types); T008 needs T004+T007; T009 free.

### Parallel Opportunities

- T003, T004, T009 in parallel after T002.
- T010–T013 (four new component files) in parallel after Foundational.
- T022, T023, T025 in parallel with US2/US4 work (different files).

## Implementation Strategy

Sequential single-agent order: T001 → T002–T009 → US1 (T010–T017, validate = MVP) → US2
(T018–T021) → US3 (T022–T023) → US4 (T024) → Polish (T025–T028). Stop-and-validate at each
checkpoint; commit per phase.
