---
description: "Task list for Phase 8 — Calendar / Events implementation"
---

# Tasks: Phase 8 — Calendar / Events

**Input**: Design documents from `/specs/009-calendar-events/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included where the constitution's new-module testing gate applies — the authoring access matrix
+ published-only visibility have a Payload integration test, and the pure date logic (end≥start validation
+ the upcoming predicate) has a unit test. The employee pages (server components) and the Payload admin UI
are validated via quickstart, not unit tests.

**Organization**: By user story — US1=P1 employees browse upcoming events (MVP), US2=P2 editors author &
publish, US3=P3 publication-visibility invariant. Builds on Phases 1-7. **One new `events` collection; no
new dependency, datastore, external service, or DB migration.** Entra auth, the five-role model, the
Phase 6 back-office, the Phase 7 `slugify` helper, the lexical editor, and the Payload/PostgreSQL data
layer are reused **unchanged**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete deps)
- **[Story]**: US1 / US2 / US3 (setup/foundational/polish carry no story label)
- Paths relative to the `kihub` repo root

## Path Conventions

Monorepo: all Phase 8 code lives in `apps/web/`. Employee pages under `app/(app)/events/`; the collection
under `src/collections/`; the read layer + pure date helpers under `src/lib/`; tests under `tests/`.
`packages/*` unchanged. Authoring reuses the Phase 6 Payload admin (`/cms`) — Events appears there as
another editable collection, gated to Contributor+.

---

## Phase 1: Setup

- [X] T001 [P] Create the pure date-helper module `apps/web/src/lib/event-dates.ts` per contracts/events-read.md + data-model.md: `validateEventInterval(start, end?)` (throws a friendly error when an end is present and precedes start — FR-011), `isUpcoming(event, now)` (returns true when `(endDateTime ?? startDateTime) >= now` so in-progress events stay upcoming — FR-004), and `formatEventWhen(start, end?)` (renders start + optional end in `nb-NO` / `Europe/Oslo` via `Intl.DateTimeFormat` — FR-015). Pure functions only — MUST NOT import `@payload-config` or any Payload runtime, so they are unit-testable in isolation (mirrors how `lib/slug.ts` is separate from `lib/news.ts`)
- [X] T002 Create the Events collection `apps/web/src/collections/Event.ts` per contracts/events-collection.md + data-model.md: fields (`title`; `slug` unique+indexed; `description` richText/lexical; `startDateTime` date **required**; `endDateTime` date; `location` text; `onlineUrl` text; `organizer` text; `status` select `draft|published` default `draft`; `tags` hasMany text; `featured` checkbox), `admin.useAsTitle: 'title'` + `defaultColumns: ['title','status','startDateTime','featured','location']`, a `beforeValidate` hook that (a) derives a URL-safe `slug` from `title` when empty by reusing `slugify` from `lib/slug.ts` and (b) calls `validateEventInterval(startDateTime, endDateTime)` to reject end<start, and `access` (read: Contributor+ → `true`, else `{ status: { equals: 'published' } }`; create/update/delete: `isEditor` = `Boolean(req.user) && (req.user.role as Role) !== 'reader'`). Events is NOT wired into `@kihub/governance-core`'s permission matrix, has NO `author`/`users` relationship and NO `publishDate` (organizer is free-text; ordering is by `startDateTime` — research §3/§7/§8) (depends on T001)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Make the `events` collection live so it is authorable in `/cms` and queryable by the employee
read layer. Nothing in the user stories can be exercised until the collection is registered.

**⚠️ CRITICAL**: Blocks all user stories

- [X] T003 Register `Event` in `apps/web/src/payload.config.ts` (`collections` array) and regenerate Payload types (`pnpm --filter web payload generate:types`); confirm dev schema push creates the `events` table and the collection appears (editable, Contributor+) in `/cms` (depends on T002). **No migration** — the repo has no `migrations/` directory and runs push-only, as in every prior phase (News included); a one-off migration would break that convention (research §10)

**Checkpoint**: `events` collection exists, authorable at `/cms`; read layer + pages can be built against it

---

## Phase 3: User Story 1 - Employees browse upcoming internal events (Priority: P1) 🎯 MVP

**Goal**: Employees open the app and browse published upcoming events — a `/events` list (soonest-first,
featured surfaced) and an `/events/<slug>` detail page — with a friendly empty state when none are upcoming,
plus an "Events" link in the app header.

**Independent Test**: With one or more published upcoming events present (authored in `/cms`), sign in as
any employee (incl. a Reader), open `/events`, confirm published upcoming events appear soonest-first with
featured surfaced, open one, confirm title/when(Oslo)/location/organizer/description render; confirm past
events are absent and the empty state shows when none upcoming.

### Implementation for User Story 1

- [X] T004 [US1] Create `apps/web/src/lib/events.ts` — `listUpcomingEvents()` (filter `status: published` AND upcoming via a `where` matching `isUpcoming` — `endDateTime >= now` OR (`endDateTime` unset AND `startDateTime >= now`); sort ascending by `startDateTime`; featured surfaced with a stable featured-first sort) and `getPublishedEventBySlug(slug)` (published only, NOT filtered by past/upcoming so a published past event is still reachable by direct URL; else `null`), using the Payload local API (`getPayload({ config })`) with `overrideAccess: true`, mirroring `lib/news.ts` (depends on T003)
- [X] T005 [P] [US1] Create `apps/web/src/components/EventCard.tsx` — a Designsystemet list card (title, when via `formatEventWhen`, a location hint from `location`/`onlineUrl`, tags, featured marker) linking to `/events/<slug>`
- [X] T006 [US1] Create `apps/web/src/app/(app)/events/page.tsx` — the employee events list (published + upcoming, soonest-first, featured surfaced) using `listUpcomingEvents()` + `EventCard`, with a friendly Designsystemet empty state when none are upcoming (FR-004/012) (depends on T004, T005)
- [X] T007 [US1] Create `apps/web/src/app/(app)/events/[slug]/page.tsx` — the event detail: title, when (start + end if set, in Europe/Oslo via `formatEventWhen`), location and/or online-meeting link (rendered as a link when `onlineUrl` set), organizer, rich-text description rendered with `RichText` from `@payloadcms/richtext-lexical/react`, optional tags; call `notFound()` for a draft/unknown slug (FR-005/006/015) (depends on T004)
- [X] T008 [P] [US1] Add an "Events" link beside the existing "News" link in the employee home page header block (`apps/web/src/app/(app)/page.tsx`) pointing at `/events`, so employees can reach the list (FR-014)
- [X] T009 [US1] Run quickstart.md Scenarios 2 & 3 end-to-end: with a published upcoming event present, `/events` lists it (soonest-first, featured surfaced), the detail page renders title/when(Oslo)/location/organizer/description; a fully-past published event is absent from the list but still reachable by direct URL; an in-progress event is listed; the empty state shows when none are upcoming

**Checkpoint**: US1 functional — employees browse the events list + detail; deployable MVP (content authored via `/cms`)

---

## Phase 4: User Story 2 - Editors author and publish events in the back-office (Priority: P2)

**Goal**: Contributor+ editors create, edit, publish/unpublish, and delete events in `/cms` (server-side
gated), with end<start rejected at save; Reader/anonymous cannot author or publish.

**Independent Test**: As a Contributor+ persona, create an event in `/cms`, save as draft, publish; confirm
it persists and (published + upcoming) becomes visible in `/events`. Confirm end<start is refused, and a
Reader/anonymous cannot author.

### Tests for User Story 2 ⚠️

- [X] T010 [P] [US2] Integration test `apps/web/tests/integration/events-access.test.ts` (write first, must fail): with the Payload local API (`overrideAccess: false` + explicit `user`) — a Contributor+ can create/update/publish/delete an `events` doc; a Reader and an anonymous request are refused on create/update; a two-same-title create surfaces a slug uniqueness error; an event created with `endDateTime` before `startDateTime` is refused (FR-011); and an employee-scoped read (Reader `user`) returns only `published` docs and never a draft (incl. by slug) — proving the access matrix + published-only visibility (FR-002/003/006/007/011, and the US3 invariant). Mirror the structure of `tests/integration/news-access.test.ts` (lexical `description` builder, `testId`-scoped cleanup)
- [X] T011 [P] [US2] Unit test `apps/web/tests/unit/event-dates.test.ts` (write first, must fail): `validateEventInterval` rejects end<start, accepts end≥start and a missing end; `isUpcoming` returns false for a fully-past event, true for an in-progress event (started, not yet ended) and a future event, at a fixed `now`; and `formatEventWhen` renders in Europe/Oslo (FR-004/011/015)

### Implementation / Verification for User Story 2

- [X] T012 [US2] Run quickstart.md Scenarios 1 & 5: a Contributor+ authors and publishes an event in `/cms` (slug auto-derived from the title; end<start rejected; publish makes it visible in `/events` if upcoming); a Reader is refused authoring at `/cms` (Phase 6 gate) — no code beyond T001/T002/T003 expected

**Checkpoint**: US1 + US2 — editors populate the list; authoring is Contributor+ only, enforced server-side; invalid date ranges refused

---

## Phase 5: User Story 3 - Publication visibility is controlled and safe (Priority: P3)

**Goal**: Only published events are ever visible to employees; unpublishing immediately removes an event
from every employee surface — list, detail, and direct URL.

**Independent Test**: Reach a draft's `/events/<slug>` directly as an employee (not found); publish it (now
reachable); set it back to draft (gone from the list and its detail URL no longer accessible).

### Verification for User Story 3

- [X] T013 [US3] Run quickstart.md Scenario 4: a draft is absent from `/events` and its `/events/<slug>` returns not-found; unpublishing a published event removes it from the list and 404s its detail — confirming the `lib/events.ts` published-only reads + the collection `read` access constraint hold (the automated invariant is covered by T010; no code beyond T002/T004 expected)

**Checkpoint**: US1 + US2 + US3 — drafts never leak; the list shows only published, upcoming content

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T014 [P] Update `README.md`: document the Calendar/Events module — the `/events` employee list (published, upcoming, soonest-first, featured) and event detail; authoring in the `/cms` back-office by Contributor+; native content per Principle II (no Git source, not an artifact); Europe/Oslo datetimes; and that recurring events, RSVP/registration, ICS export, a month-grid calendar view, and a home-page events widget are deferred to later phases
- [X] T015 Workspace typecheck + lint (`npx tsc --noEmit` from `apps/web` + `pnpm -r lint`) and the full test suite green — including the new `events-access` + `event-dates` tests and no regression in the existing suites (baseline 82/82 across 20 files; the suite may only grow). Run from `apps/web`: `set -a; . ./.env; set +a; NODE_OPTIONS=--no-deprecation npx vitest run`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 (pure date helpers) — start immediately; T002 (collection file) depends on T001.
- **Foundational (Phase 2)**: T003 (register + types) depends on T002; **BLOCKS all user stories**.
- **User Stories (Phase 3-5)**: depend on Foundational (the live collection).
  - US1 is the read surface (lib + pages + card + nav).
  - US2 is largely delivered by the collection (Foundational) + the Phase 6 back-office; adds the failing-first tests and authoring verification.
  - US3 is delivered by the published-only reads (T004) + `read` access rule (T002); adds verification (its automated invariant rides in T010).
- **Polish (Phase 6)**: after the stories.

### User Story Dependencies

- **US1 (P1)**: Foundational → `lib/events.ts` (T004) → list (T006) + detail (T007); EventCard (T005) and nav (T008) parallel. MVP.
- **US2 (P2)**: builds on the same collection/access; adds tests (T010/T011) + authoring verification (T012).
- **US3 (P3)**: builds on the published-only read + access rule; verification (T013).

### Within Each User Story

- US2 tests (T010/T011) are written first and must fail before the behavior is relied upon.
- The date helpers (T001) + collection (T002) + registration (T003) are the shared prerequisites for every story.

### Parallel Opportunities

- Setup: T001 alone (T002 depends on it).
- US1: T005 (EventCard) ∥ T008 (nav) ∥ T004 (lib) — different files; T006/T007 follow T004 (+T005 for T006).
- US2 tests: T010 ∥ T011 (different files).
- Polish: T014 ∥ (before T015); T015 last, once code is final.

---

## Parallel Example: User Story 1

```bash
# After T003 (collection live):
Task: "Create read layer in apps/web/src/lib/events.ts"                  # T004
Task: "Create EventCard in apps/web/src/components/EventCard.tsx"         # T005 (parallel)
Task: "Add an Events nav link in app/(app)/page.tsx header"              # T008 (parallel)
# then T006 (list) + T007 (detail)
```

## Parallel Example: User Story 2 tests

```bash
Task: "Integration test the access matrix + visibility in apps/web/tests/integration/events-access.test.ts"  # T010
Task: "Unit test the date helpers in apps/web/tests/unit/event-dates.test.ts"                                 # T011
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup (T001 date helpers → T002 collection) → 2. Phase 2 Foundational (T003: register + types)
   → 3. Phase 3 US1 (read layer + pages + card + nav + Scenarios 2 & 3) → 4. **STOP & VALIDATE**: an
   employee browses the `/events` list and event detail (content authored in `/cms`), past events absent,
   drafts absent. Deploy/demo (MVP).

### Incremental Delivery

1. Setup + Foundational → `events` collection live, authorable at `/cms`.
2. US1 → employees browse the upcoming list + detail (MVP).
3. US2 → authoring role gate + date validation proven (tests + verification).
4. US3 → publication-visibility invariant verified (drafts never leak).
5. Polish → docs, typecheck/lint, full suite.

---

## Notes

- [P] = different files, no incomplete dependencies.
- Reuse is deliberate: Entra auth, the five-role model, the Phase 6 back-office entry gate, the Phase 7
  `slugify` helper, the lexical editor, and the Payload/PostgreSQL data layer are **unchanged**; net-new is
  one `events` collection, a `lib/events.ts` read layer, a pure `lib/event-dates.ts`, two employee pages +
  a card + a nav link, and two tests.
- Published-only visibility is enforced twice (read query + `read` access rule) for defense in depth; the
  employee pages are correct by construction and the API path cannot leak drafts to a Reader. Past-event
  hiding is **list-only** — a published past event stays reachable by direct URL (research §2).
- No new collection beyond `events`; no new field on existing collections, no new datastore/service/
  dependency, **no migration** (push-only repo). Recurring events, RSVP/registration, ICS export, a
  month-grid view, and a home-page widget are deferred.
- Commit after each task or logical group; stop at any checkpoint to validate independently.
