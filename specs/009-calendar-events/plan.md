# Implementation Plan: Phase 8 — Calendar / Events

**Branch**: `feat/new-architecture` (single-branch workflow) | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-calendar-events/spec.md`

## Summary

Deliver the third and final native-content module of the portal charter (Registry + News + **Calendar**;
Constitution Principle II / Product Modules): internal events authored in the `/cms` editor back-office by
Contributor+ users and read by all employees in the Designsystemet app. The work is additive and reuses
everything the foundation already provides — it is a near-exact structural clone of Phase 7 News. It adds
a new `events` Payload collection (native content, owned fully by Payload — no Git source, not an
artifact), a thin server-side read library (`lib/events.ts`) with pure, unit-testable date helpers
(`lib/event-dates.ts`), and two employee pages (`/events` list + `/events/<slug>` detail). Authoring
happens in the Phase 6 back-office through Payload's own admin UI (already gated to Contributor+); the
employee surfaces show only **published, upcoming** events in the list, enforced both by the read query
and by the collection's `read` access rule (defense in depth for the draft-leak invariant). Datetimes are
interpreted and displayed in **Europe/Oslo**. No new dependency, datastore, external service, or DB
migration (the repo is push-only, as in every prior phase).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ (unchanged).

**Primary Dependencies**:
- Next.js 16 (App Router) + Payload CMS 3.85 — already present.
- `@payloadcms/richtext-lexical` — already a dependency; the event `description` is a `richText` (lexical)
  field, and the detail page renders it with `RichText` from `@payloadcms/richtext-lexical/react`. **No
  new dependency.**
- `@digdir/designsystemet-react` — the employee events pages/components (list, detail, card) use it, per
  the Design-System mandate for the employee app.
- `@kihub/governance-core` — reused for the `Role` type only (the `isEditor` predicate); Events is
  intentionally NOT wired into the Registry permission matrix / lifecycle (research §3). No change to the
  package.
- `lib/slug.ts` (Phase 7) — the existing Norwegian-aware `slugify` is reused unchanged for the event slug.

**Storage**: PostgreSQL (unchanged) — one new collection/table `events`. Dev uses Payload's schema push;
**no migration is created** (the repo has no `migrations/` directory — every prior phase, News included,
shipped push-only). Types are regenerated with `pnpm --filter web payload generate:types`. No new datastore.

**Testing**: Vitest. Integration (Payload local API, `overrideAccess:false` + explicit `user`): events
access matrix (Contributor+ create/edit/publish/delete; Reader/anonymous refused) and the published-only
visibility guarantee (employee-scoped read returns only `published`; drafts unreachable including by slug)
— mirrors `tests/integration/news-access.test.ts`. Unit: pure date logic in `lib/event-dates.ts` — the
`endDateTime ≥ startDateTime` validation and the "upcoming" predicate (`(end ?? start) ≥ now`), written
failing-first. The employee pages are server components validated via quickstart; the Payload admin UI is
Payload's own (validated via quickstart, not unit-tested — Principle VIII).

**Target Platform**: Local dev (`AUTH_MODE=mock`) and Azure (Entra). Employees read at `/events`; editors
author at `/cms` (Payload admin, Contributor+).

**Project Type**: Web app monorepo — `apps/web` only. `packages/*` unchanged.

**Performance Goals**: None specific — a small internal events list at portal scale; a simple
upcoming-first query with an index on `(status, startDateTime)` is ample.

**Constraints**:
- Only **published** events are ever visible to employees — enforced in the read library AND in the
  collection `read` access rule (FR-003/006, US3). The list additionally hides **past** events (FR-004).
- Authoring/publishing gated to **Contributor+** server-side, reusing the Phase 6 posture (FR-002/007).
- Native content only — Events is not an artifact and has no Git source (FR-008; Principles I/II/III).
- Employee events UI uses Designsystemet; the back-office is Payload's own admin (Principle VIII, FR-009).
- New employee routes `/events`, `/events/<slug>` must not collide with existing routes (`/`,
  `/artifacts/*`, `/news/*`, `/admin/*`, `/signin`) or the back-office (`/cms`) — they don't.
- `endDateTime`, when present, MUST NOT precede `startDateTime` (FR-011); all-day events out of scope.
- Datetimes are single-timezone **Europe/Oslo** (FR-015); no per-event timezone stored.
- No new datastore/service/dependency/migration; employee app behavior otherwise unchanged.

**Scale/Scope**: One collection, one read library + one pure date-helper module, two employee pages + a
card component, a nav link, and tests. Small internal editorial audience; tens of events.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Constraint | Phase 8 compliance | Status |
|------------------------|--------------------|--------|
| I. Git is source of truth (AI artifacts) | Events is native content with no Git source and is explicitly out of the artifact model — the principle's own carve-out (Principle II). No `artifacts`/Git path touched. | ✅ PASS |
| II. Payload owns context & native content | Events is native Payload-owned content — authored and stored in KI Hub, no external source of truth (the constitution names Calendar/Events as exactly this). | ✅ PASS |
| III. Every AI asset is an Artifact | Events is NOT an AI asset; correctly modeled as its own `events` collection, never forced into `Artifact`. | ✅ PASS |
| IV. Stable artifact identity | N/A — an event is not an artifact; it has its own slug, no `artifactId`. | ✅ PASS |
| V. Git-centric, APM distribution | Untouched. | ✅ PASS |
| VI. Governance is the core value (Registry) | Events is deliberately outside the Registry's governance lifecycle/reviews — it does not bypass or weaken Registry governance; it is a separate module (mirrors News). | ✅ PASS |
| VII. Start simple, design for growth | Simplest correct module: one collection, reuse of auth/roles/back-office/data layer + the Phase 7 slug helper + the lexical editor, no new dependency/datastore/migration. Recurring/RSVP/ICS/month-grid/home-widget all deferred. | ✅ PASS |
| VIII. Two surfaces | Authored in the back-office (`/cms`, Contributor+), read in the employee app (Designsystemet) — one auth/role/data layer across both. | ✅ PASS |
| Design System (employee app) | The `/events` list and detail pages are built with Designsystemet; the back-office is Payload's own admin (exempt). | ✅ PASS |
| Auth (employees only, roles) | Reuses Entra + the five-role model; only signed-in employees read; authoring gated to Contributor+ server-side. | ✅ PASS |
| Testing gate (new module) | New module tests access control + the state/validation rules (published-only visibility, end≥start, upcoming predicate) per the Dev-Workflow gate. | ✅ PASS |
| Contract-first | The collection shape + access matrix and the employee read contract are documented in `contracts/`. | ✅ PASS |

**Result**: No violations. Complexity Tracking intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/009-calendar-events/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (the Events collection shape + access/visibility matrix)
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── events-collection.md   # events collection: fields, slug rule, date validation, access matrix
│   └── events-read.md         # employee read contract: /events list (upcoming) + /events/<slug> detail
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/
  web/
    src/
      payload.config.ts             # CHANGED: register the Event collection (add to `collections`)
      collections/
        Event.ts                    # NEW: the `events` collection — fields, slug hook, date validation, access
      lib/
        events.ts                   # NEW: server-side reads — listUpcomingEvents(), getPublishedEventBySlug(slug)
        event-dates.ts              # NEW: pure helpers — isUpcoming(), validateEventInterval(), formatEventWhen()
        slug.ts                     # (unchanged; reused for the event slug)
      app/
        (app)/
          events/
            page.tsx                # NEW: employee events list (published + upcoming, soonest-first, featured surfaced)
            [slug]/page.tsx         # NEW: employee event detail (published only; 404 for draft/unknown slug)
          page.tsx                  # CHANGED: add an "Events" nav link beside the existing "News" link
      components/
        EventCard.tsx               # NEW: Designsystemet list-item card (title, when, location, featured, tags)
    tests/
      integration/
        events-access.test.ts       # NEW: Contributor+ author/publish; Reader/anon refused; publish visibility
      unit/
        event-dates.test.ts         # NEW: end≥start validation + upcoming predicate (failing-first)
```

**Structure Decision**: Same monorepo, same two route groups. Events is a new native collection surfaced by
a thin `lib/events.ts` (mirroring `lib/news.ts`/`lib/catalog.ts`'s local-API read pattern) and two server
components under the existing employee `(app)` group (protected by `(app)/layout.tsx`'s `requireSession()`),
plus one Designsystemet card component and one nav link added to the existing home page (where the "News"
link already lives — there is no separate shared header component). Pure date logic is factored into
`lib/event-dates.ts` so it can be unit-tested without loading the Payload config (exactly as `lib/slug.ts`
is separate from `lib/news.ts`). Authoring reuses the Phase 6 Payload admin unchanged (Events appears as
another editable collection there, gated to Contributor+). The only config change is registering the
collection; types are regenerated (no migration — push-only repo). This mirrors how every prior module was
added on the shared foundation.

## Complexity Tracking

> No constitution violations — section intentionally empty.
