# Research: Events Page Redesign (Kalender + Liste)

**Feature**: 012-events-page-redesign | **Date**: 2026-08-05

## §1 View + filter state: URL search params, server-rendered, link-based controls

**Decision**: The events page stays a server component reading `searchParams`
(`Promise<SearchParams>`, awaited — the established Next 15 pattern from
`(app)/registry/page.tsx`). Params: `view=kalender` (absent/anything else → liste, FR-018),
`month=YYYY-MM` (calendar only; malformed → current month), `type=<eventType>` (repeatable,
multi-select), `form=digitalt|oppmote|hybrid` (single; absent/unknown → Alle). Filter and toggle
controls are **link-based** (anchors that re-render the page with a new query string), exactly
like `CatalogFilters.tsx` — no client JS, works with scripting disabled (SC-004).

**Rationale**: Matches the repo's only existing filter precedent; shareable/bookmarkable state
falls out for free; zero client bundles added.

**Alternatives considered**: (a) GET `<form>` with real checkbox/radio inputs — also JS-free but
needs an explicit submit button, diverging from the old app's instant-apply feel and from the
CatalogFilters precedent. (b) Client component with `useRouter` — violates the no-client-JS goal
and adds hydration cost for no benefit. Rejected.

The filter sidebar *renders* as checkbox/radio-styled rows (decorative box/dot + label, matching
the old app's look) but each row is an `<a>` with `aria-pressed`; assistive tech gets the toggle
semantics, and the visual affordance comes from the kihub token layer.

## §2 Calendar month model: 6-week Monday-first Oslo grid, pure and unit-testable

**Decision**: A new pure module `apps/web/src/lib/events-view.ts` (no Payload imports, mirroring
`lib/event-dates.ts` / `lib/frontpage-select.ts`) owns all view math:

- `buildMonthGrid(year, month, todayKey)` → 6 weeks × 7 days of cells
  `{ dayKey: 'YYYY-MM-DD', dayNumber, inMonth, isToday }`, weeks starting Monday
  (`MAN TIR ONS TOR FRE LØR SØN` headers from `Intl` nb-NO, dot-stripped, uppercased).
  A fixed 6-week grid keeps layout stable across months (Aug 2026 in the reference screenshot
  is 6 rows) and automatically includes the dimmed leading/trailing adjacent-month days.
- `osloDayKey(isoDateTime)` → the event's calendar day **in Europe/Oslo** via
  `Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo' })` (yields `YYYY-MM-DD` directly).
  This is the DST/UTC-boundary-safe way to bucket events (FR-017; same trick the 011 helpers
  use per-part).
- `eventDayKeys(event)` → every Oslo day the event spans (start day → end day inclusive; no
  end → just the start day), used to place multi-day events in every spanned cell (FR-007).
- `groupEventsByDay(events)` → ordered `[dayKey, events[]][]` for the list view's date chips.
- `formatDateChip(dayKey)` → "Fredag 3. juli" (nb-NO long weekday capitalized + `d. MMMM`).
- `formatMonthTitle(year, month)` → "August 2026"; `prevMonth`/`nextMonth` arithmetic.
- `parseEventsSearchParams(sp)` → validated `{ view, year, month, types, form }` with the
  FR-018 fallbacks, so graceful degradation is a tested pure function, not page logic.
- `seatsText(capacity, seatsTaken)` → "X av Y plasser igjen" / "Fullt" / "Åpen for alle"
  (FR-004, floored at zero).

**Rationale**: Everything the two views compute is deterministic date math — putting it in a
pure lib makes the tricky parts (DST, month boundaries, multi-day spans) unit-testable without
a database, the pattern every prior phase used.

**Alternatives considered**: a calendar library (date-fns, dayjs) — prohibited (no new deps) and
unnecessary; `Intl` + `Date.UTC` arithmetic covers a Monday-first month grid in ~40 lines.

## §3 Calendar colors: categorical aliases over the existing token palette

**Decision**: Five categorical tokens are defined as **aliases of existing theme tokens** in the
feature's stylesheet block (not in the synced `styles/kihub/` folder, which mirrors the design
project verbatim):

| Event type | Categorical token | Aliases | Tinted surface |
|---|---|---|---|
| Webinar | `--ev-cat-webinar` | `--kihub-accent` (#0062BA) | `--kihub-surface-accent` |
| Verksted | `--ev-cat-verksted` | `--kihub-warning` (#EA9B1B) | `--kihub-warning-surface` |
| Kurs | `--ev-cat-kurs` | `--kihub-success` (#068718) | `--kihub-success-surface` |
| Konferanse | `--ev-cat-konferanse` | `--kihub-danger` (#C01B1B) | `--kihub-danger-surface` |
| Internt | `--ev-cat-internt` | `--kihub-text-subtle` (neutral) | `--kihub-bg-tinted` |

Usage rules: the strong color is a small **marker** (legend swatch, calendar-entry dot/edge);
the tinted surface backs the type **badge**, whose text stays `--kihub-text` (near-black on the
pale tints — AA everywhere). Color is never the sole carrier: the type name always accompanies
the color in text (legend labels, badge text, entry `aria-label`) — FR-008/SC-007.

**Rationale**: This is categorical *data encoding* (which type is this event?), not status
semantics and not decoration — the same distinction data-viz practice draws. The palette
question is "five distinguishable hues with one value source": accent blue, orange, green, red,
neutral gray are the five distinct hues the generated Designsystemet theme already provides, and
aliasing keeps a single source of truth (the aliases resolve through `kihub-ds-bridge.css` to
`--ds-*`). Info blue was skipped — #0A71C0 is not reliably distinguishable from accent #0062BA.

**Alternatives considered**: (a) minting five new hex values — violates the token-only rule and
adds a second value source; rejected. (b) accent-family shades only (like the frontpage timeline
dots) — not distinguishable enough to *identify* five categories in a dense grid; the timeline
dots are decorative, these are informational; rejected. (c) hard-coding the old app's pink/
purple palette — off-theme; rejected.

**Constitution note**: the kihub layer's "status colors never decorate" rule is respected in
spirit and letter: this is not decoration, no status *meaning* is implied, and the mapping is
documented in the legend contract. Recorded in plan.md Complexity Tracking for visibility.

## §4 Data model: five new fields + one production migration with in-migration backfill

**Decision**: Extend the `events` collection (contracts/events-collection-v2.md):

- `eventType`: select, required, `defaultValue: 'internt'`, options
  `webinar | verksted | kurs | konferanse | internt`.
- `format`: select, required, `defaultValue: 'digitalt'`, options
  `digitalt | oppmote | hybrid` (value `oppmote` — enum values stay ASCII; labels carry "Oppmøte").
- `channel`: text, optional ("Teams", "Zoom", auditorium AV …).
- `capacity`: number, optional, integer ≥ 1.
- `seatsTaken`: number, optional, integer ≥ 0, only meaningful with `capacity`;
  validated `seatsTaken ≤ capacity` (FR-012) in the existing `beforeValidate` hook via a new
  pure `validateSeatCapacity(capacity, seatsTaken)` in `lib/event-dates.ts`'s sibling style
  (lives in `lib/events-view.ts` to keep event-dates date-only).

Local dev runs Payload **push mode** (schema syncs automatically). Production runs bundled
`prodMigrations` at boot (Phase B), so ship one new migration created with
`pnpm --filter web migrate:create events_type_format_capacity`, hand-extended with the FR-010
backfill (new columns are added with defaults, so only `format` inference needs SQL):

```sql
UPDATE "events" SET "format" =
  CASE WHEN "location" IS NOT NULL AND "online_url" IS NOT NULL THEN 'hybrid'
       WHEN "location" IS NOT NULL THEN 'oppmote'
       ELSE 'digitalt' END;
```

(`eventType` backfills itself via the column default `'internt'`; capacity stays NULL → "Åpen
for alle".) Register the migration in `src/migrations/index.ts`. Regenerate `payload-types.ts`
with `pnpm --filter web payload generate:types`.

**Rationale**: Follows the Phase B migration seam exactly (baseline + boot-time prodMigrations);
in-migration backfill guarantees SC-005 (100% legacy events render correctly with no editorial
intervention) atomically with the schema change.

**Alternatives considered**: runtime fallbacks in the read layer (treat missing type as internt
in code) — leaves the DB permanently inconsistent and pushes conditionals into every consumer;
rejected in favor of real defaults + one-time backfill.

## §5 Read layer: filtered upcoming list + month-range query

**Decision**: Extend `apps/web/src/lib/events.ts` (contracts/events-read.md):

- `listUpcomingEvents(filters?: { types?: EventType[]; form?: EventFormat })` — same
  published+upcoming query, plus `eventType in [...]` when types are given and
  `format equals` when form is given (server-side filtering, FR-005). Featured-first stable
  re-sort unchanged (frontpage still relies on it).
- `listEventsInRange(fromIso: string, toIso: string): Promise<Event[]>` — published events
  **overlapping** the range: `startDateTime ≤ to AND (endDateTime ≥ from OR (no endDateTime
  AND startDateTime ≥ from))`, sorted by start. The calendar page queries the *full 6-week
  grid range*, so adjacent-month cells show their events too (spec edge case) and past events
  within the month appear (FR-007).

**Rationale**: Mirrors the existing query style (draft exclusion in the query itself,
`overrideAccess: true`, collection access rule as second defense — FR-016).

**Alternatives considered**: fetching all 200 upcoming events and filtering in JS — breaks for
the calendar (needs past events of the month) and wastes the database's index; rejected.

## §6 Components & styling: kihub-token components, styles in portal.css

**Decision**: New server components in `apps/web/src/components/` (all presentational, styled
exclusively via `--kihub-*`/`--ev-cat-*` tokens):

- `EventTypeBadge` — uppercase Inter label on the type's tinted surface (list rows, detail).
- `EventsViewToggle` — segmented Kalender | Liste link pair, `aria-current` on the active one.
- `EventsFilters` — TYPE checkbox-style multi-select + FORM radio-style single-select +
  "Nullstill filtre"; link-based (§1).
- `EventsDayList` — the grouped list: date chips ("Fredag 3. juli") + rows
  (time / title / meta / badge / arrow), replacing `EventCard` on this page.
- `EventsMonthCalendar` — legend + weekday header + 6×7 grid; entries are links (dot + time +
  title, truncated), cap 3 per cell with "+N flere" (plain text — the remainder is reachable
  via the list view).
- The old `EventCard.tsx` becomes unused and is deleted (it was only used by `/events`).

Page-level layout classes (`.ev-*`: toggle, sidebar+list grid, date chips, rows, month grid,
legend) are added to `apps/web/src/styles/portal.css`, which already owns page-composition CSS
(`.fp-*` frontpage sections) and is imported once in `themed-html.tsx`. The `--ev-cat-*`
aliases live at the top of that block. Responsive: sidebar collapses above the list < ~900px;
the month grid gets horizontal scroll on narrow viewports rather than squeezing.

**Detail page** (FR-013/014): restyled with `kihub-container`/`kihub-section`, `kihub-h1`,
`kihub-prose` for the rich text, Norwegian labels, `EventTypeBadge`, form/channel/seats meta,
"+ Legg til i kalender" → existing `/events/<slug>/ics`, "← Til arrangementer" back link.

**Frontpage** (FR-015): `NextEventCard` and `EventsTimeline` swap `event.tags?.[0]` for the
event-type label (`EVENT_TYPE_LABELS[event.eventType]`); everything else untouched.

**Rationale**: Constitution v3.0.0 sanctions custom presentational components on the token
layer; no Designsystemet primitive offers a month grid or this list treatment, and the filter
controls are navigation links (not form controls), so no DS form components are bypassed.

## §7 Testing strategy

**Decision**:

- **Unit** (`tests/unit/events-view.test.ts`): month grid shape (Monday-first, 6 weeks, Feb +
  DST-transition months, today-flag), `osloDayKey` across UTC midnight and DST changes,
  multi-day `eventDayKeys`, `groupEventsByDay` ordering, `parseEventsSearchParams` fallbacks
  (FR-018 matrix), `seatsText` (open/for-alle/fullt/floor-at-zero), `formatDateChip` /
  `formatMonthTitle`, `validateSeatCapacity`.
- **Integration** (`tests/integration/events-access.test.ts`, extended): new-field defaults on
  create (type internt / format digitalt), `seatsTaken > capacity` rejected, negative/fractional
  capacity rejected, filtered `listUpcomingEvents` (type + form + combination), and
  `listEventsInRange` returning past-in-month + spanning events while excluding drafts (FR-016).
- Existing suites (141 tests) must stay green; `payload-types.ts` regeneration is the only
  cross-cutting touch. Tests run with `source apps/web/.env` + local docker DB, as established.

**Rationale**: Same split every phase used — pure logic exhaustively unit-tested, Payload
behavior integration-tested with `overrideAccess: false` + explicit users.

## §8 Out of scope (confirmed)

RSVP/registration (capacity is editorial, modeled so a future flow can write `seatsTaken`),
recurring events, week/day calendar views, event search integration, pagination (limit 200
matches News/Events precedent), and any Payload admin UI customization.
