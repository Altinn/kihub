# Quickstart: Calendar / Events (validation guide)

Proves Phase 8 end-to-end: Contributor+ editors author and publish events in `/cms`, all employees read
published **upcoming** events at `/events` and any published event at `/events/<slug>`, and drafts never
leak. Assumes Phases 1–7 running locally (`AUTH_MODE=mock`) against the local Postgres.

## Prerequisites

- `apps/web` dev server running against local Postgres (Phases 1–7 setup; docker `kihub-postgres` on 55432).
- The `events` collection registered; the dev server's schema push has created the `events` table.
  **No new datastore, env, external service, or migration.**
- Types regenerated: `pnpm --filter web payload generate:types`.
- Browser verification: `preview_start` name `kihub-web` (port 3000); mock login at `/signin`
  (personas: Ada Employee=reader, Cara Contributor, Rita Reviewer, Aksel Approver, Aria Admin).

## Scenario 1 — Author & publish in the back-office (US2, FR-001/002/011/013)

1. Sign in via `/signin` as **Aria Admin** (or any Contributor+ persona); open `http://localhost:3000/cms`.
2. Open the **Events** collection → **Create New**. Enter a title, write a rich-text description, set a
   **start** datetime in the future, optionally an **end** datetime, a location and/or online URL, an
   organizer, (optionally) tags / featured. Leave slug blank.
3. **Expect**: on save, `slug` is auto-derived from the title; the record saves as **draft**.
4. Try setting **end before start** and save. **Expect**: a friendly validation error; the save is refused
   (FR-011).
5. Fix the dates, set **status = published**, Save. **Expect**: the event is now published.

## Scenario 2 — Employees read the events list & detail (US1, FR-004/005/012/014/015)

1. As any employee (including **Ada Employee (Reader)**), open `http://localhost:3000/`.
2. **Expect**: an **Events** link in the header block (beside News). Click it (→ `/events`).
3. **Expect**: the published upcoming event appears, soonest-first, featured surfaced, with its title,
   when (start/end in Europe/Oslo), and a location hint.
4. Click it (or open `/events/<slug>`).
5. **Expect**: the detail page shows title, when (Oslo), location + online link (if set), organizer, and
   the rendered rich-text description (plus tags if set).
6. With no upcoming events published, open `/events`. **Expect**: a friendly empty state, not an error.

## Scenario 3 — Past events drop off the list, detail still reachable (US1, FR-004; research §2)

1. As an editor, publish an event whose start **and** end are in the past.
2. As an employee, open `/events`. **Expect**: the past event is **absent** from the list.
3. Open that event's `/events/<slug>` directly. **Expect**: it still renders (it is published; only the
   list hides past events).
4. Publish an event that started earlier today but ends later today (in progress). Open `/events`.
   **Expect**: it **is** listed (upcoming = `(end ?? start) ≥ now`).

## Scenario 4 — Drafts never leak (US3, FR-003/006, SC-002)

1. As an editor in `/cms`, create an event and leave it **draft** (note its slug).
2. As **Ada Employee (Reader)**, open `/events`. **Expect**: the draft is absent from the list.
3. Request the draft's `/events/<slug>` directly. **Expect**: not found (`notFound()`), no draft exposed.
4. As the editor, set a published event back to **draft**; as the employee, reload `/events`.
   **Expect**: the event is gone and its detail URL now 404s.

## Scenario 5 — Authoring is role-gated (US2, FR-007, SC-004)

1. As **Ada Employee (Reader)**, attempt to reach the Events authoring in `/cms`.
2. **Expect**: refused by the Phase 6 back-office entry gate (Reader has no admin access).
3. (API path) A create/update against the Events REST endpoint as a Reader is refused server-side.

## Automated checks

- Integration: `tests/integration/events-access.test.ts` — Contributor+ can create/update/publish/delete;
  Reader/anonymous are refused; slugs are unique; an event with end<start is refused; a Reader-scoped read
  returns only `published` events (draft excluded, including by slug). Mirrors `news-access.test.ts`.
- Unit: `tests/unit/event-dates.test.ts` — `validateEventInterval` (rejects end<start, accepts end≥start
  and missing end) and `isUpcoming` (past hidden, in-progress and future shown). Written failing-first.
- Regression: the existing suites (baseline **82/82 across 20 files**) remain green — Events is additive and
  touches no Registry, governance, or News code. Run from `apps/web`:
  `set -a; . ./.env; set +a; NODE_OPTIONS=--no-deprecation npx vitest run`
  (the `.env:21 tenant-id` sourcing warning is harmless.)

## Final gates

- Full suite green (may only grow from 82, never regress).
- `npx tsc --noEmit` clean (from `apps/web`).
- `pnpm -r lint` clean.

## Boundary & infra (Principles II/VII/VIII)

- Events is native Payload-owned content — no Git source, not an artifact; no Registry/News collection is
  touched.
- No new datastore/service/dependency/migration; the employee UI is Designsystemet, the back-office is
  Payload's own admin (exempt). Recurring events, RSVP/registration, ICS export, a month-grid calendar
  view, and a home-page events widget are all deferred.
