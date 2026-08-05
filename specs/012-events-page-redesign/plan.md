# Implementation Plan: Events Page Redesign (Kalender + Liste)

**Branch**: `main` (repo works trunk-based; feature dir `012-events-page-redesign`) | **Date**: 2026-08-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-events-page-redesign/spec.md`

## Summary

Rebuild `/events` from a flat English-copy list into the full "Arrangementer" experience from
the old KI HUB app, restyled on the kihub token layer: a segmented **Kalender | Liste** toggle;
a **list view** of upcoming published events grouped under Norwegian date chips with a
link-based TYPE/FORM filter sidebar; a **calendar view** rendering any month as a Monday-first
6×7 Oslo-time grid with type-colored entries, legend, today-highlight, and prev/next month
navigation — all server-rendered, URL-param driven, zero client JS and zero new dependencies.
The Payload `events` collection gains `eventType`, `format`, `channel`, `capacity`, and
`seatsTaken` (one production migration with in-migration backfill), the detail page is
kihub-restyled in Norwegian with the new metadata and an ICS link, and the frontpage event
cards switch from `tags[0]` to the event-type label.

## Technical Context

**Language/Version**: TypeScript 5 / Node 22, React 19 server components

**Primary Dependencies**: Next.js 15 (App Router), Payload CMS 3 (Postgres adapter),
`@digdir/designsystemet-react` + generated kihub theme, kihub token layer
(`apps/web/src/styles/kihub/`). **No new dependencies** (spec constraint; date math via `Intl`).

**Storage**: PostgreSQL via Payload (`events` collection extended; migration
`events_type_format_capacity` bundled into boot-time `prodMigrations` — Phase B seam; local dev
stays push-mode)

**Testing**: Vitest — `tests/unit/` for the pure view module, `tests/integration/` (Payload
local API, `overrideAccess: false`) for collection validation + read-layer filters; suite must
stay green (141 existing tests)

**Target Platform**: Server-rendered web (Azure Container Apps in production), employee surface
behind `(app)` session gate

**Project Type**: Web application (existing `apps/web` monorepo app)

**Performance Goals**: Server-rendered pages with 1–2 Payload queries per request (limit 200,
indexed sorts); no client JS added

**Constraints**: Europe/Oslo + nb-NO everywhere (FR-017); no-JS operability (SC-004); token-only
styling (constitution Design System constraint); draft-leak defense in depth (FR-016)

**Scale/Scope**: Internal portal (~hundreds of employees, tens of events/month); 1 page rebuilt,
1 page restyled, 5 new components, 1 pure lib, 2 read-lib functions, 1 migration, 2 test files

## Constitution Check

*GATE: v3.0.0. Evaluated pre-Phase 0 and re-checked post-Phase 1 — PASS (one documented
interpretation, see Complexity Tracking).*

- **I. Git source of truth for AI artifacts** — N/A: Events is native content, no artifact
  content touched.
- **II. Payload owns native content** — PASS: events (incl. new fields) live wholly in Payload;
  no external source of truth introduced.
- **III. Every AI asset is an artifact / IV. Stable artifact identity / V. APM distribution** —
  N/A: no Registry changes.
- **VI. Governance is Registry core value** — N/A: Events stays outside the governance matrix
  (009 decision, unchanged).
- **VII. Start simple, design for growth** — PASS: no new deps, pure `Intl` date math,
  link-based filters; capacity modeled editorially but shaped so a future RSVP flow writes
  `seatsTaken` (documented seam, no speculative machinery).
- **VIII. Two surfaces** — PASS: employee app gets read-only browsing; authoring of the new
  fields happens in `/cms`; role gating unchanged and server-enforced (collection access rules
  + published-only queries).
- **Design System constraint** — PASS: custom presentational components (toggle, filters, day
  list, month grid, badge) are sanctioned on the token layer; styling exclusively via
  `--kihub-*` (+ `--ev-cat-*` aliases that resolve to `--ds-*` through the bridge); no
  Designsystemet primitive is restyled or forked; filter controls are navigation links (the
  CatalogFilters precedent), not form controls, so no DS form component is bypassed.
- **Workflow gates** — PASS: access control and validation rules get automated tests
  (research §7); collection shape change is contract-versioned
  (contracts/events-collection-v2.md).

## Project Structure

### Documentation (this feature)

```text
specs/012-events-page-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 — 8 resolved decisions
├── data-model.md        # Phase 1 — Event v2, enums, backfill, view state
├── quickstart.md        # Phase 1 — validation guide
├── checklists/requirements.md
├── contracts/
│   ├── events-collection-v2.md   # collection fields + migration contract
│   ├── events-read.md            # read lib v2 + pure view module API
│   └── events-page-ui.md         # URL contract, components, colors, a11y
└── tasks.md             # Phase 2 (/speckit-tasks — not created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/web/src/
├── collections/Event.ts                    # + eventType/format/channel/capacity/seatsTaken,
│                                           #   seat validation in beforeValidate
├── migrations/
│   ├── 2026XXXX_XXXXXX_events_type_format_capacity.ts  # new (+ .json), with format backfill
│   └── index.ts                            # register the migration
├── lib/
│   ├── events.ts                           # listUpcomingEvents(filters?), listEventsInRange()
│   └── events-view.ts                      # NEW pure module: enums/labels, param parsing,
│                                           #   month grid, Oslo day math, seatsText, placeText,
│                                           #   validateSeatCapacity, chip/title formatting
├── components/
│   ├── EventTypeBadge.tsx                  # NEW
│   ├── EventsViewToggle.tsx                # NEW
│   ├── EventsFilters.tsx                   # NEW (link-based, CatalogFilters pattern)
│   ├── EventsDayList.tsx                   # NEW (date chips + rows; replaces EventCard here)
│   ├── EventsMonthCalendar.tsx             # NEW (legend + 6×7 grid)
│   ├── EventCard.tsx                       # DELETE (only consumer was /events)
│   ├── NextEventCard.tsx                   # tags[0] → EVENT_TYPE_LABELS[eventType]
│   └── EventsTimeline.tsx                  # tags[0] → EVENT_TYPE_LABELS[eventType]
├── app/(app)/events/
│   ├── page.tsx                            # REBUILD: searchParams → toggle + liste/kalender
│   └── [slug]/page.tsx                     # RESTYLE: kihub tokens, Norwegian, badge/meta/ICS
├── styles/portal.css                       # + .ev-* block and --ev-cat-* aliases
└── payload-types.ts                        # regenerated

apps/web/tests/
├── unit/events-view.test.ts                # NEW
└── integration/events-access.test.ts       # EXTEND: field validation, filters, range query
```

**Structure Decision**: Everything stays inside `apps/web` following the module pattern every
phase used: collection + pure lib + read lib + presentational components + page + tests. No new
packages; no client components.

## Complexity Tracking

| Deviation/Interpretation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Five categorical calendar colors reuse severity + accent + neutral hues (`--ev-cat-*` aliases), despite the kihub note "status colors never decorate" | The calendar legend must make five event types distinguishable at a glance (FR-008); the generated theme provides exactly five distinct hues with one value source | Accent-family shades only: not mutually distinguishable in a dense grid (identification, not decoration); new hex values: breaks the token-only/one-value-source rule. Use is categorical data encoding, always paired with text (SC-007) — not status semantics, not decoration |
