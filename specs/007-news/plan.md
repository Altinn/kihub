# Implementation Plan: Phase 7 — News

**Branch**: `feat/new-architecture` (single-branch workflow) | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-news/spec.md`

## Summary

Deliver the first **native-content** module (Constitution Principle II / Product Modules): internal news
articles authored in the `/cms` editor back-office by Contributor+ users and read by all employees in the
Designsystemet app. The work is additive and reuses everything the foundation already provides: a new
`news` Payload collection (native content, owned fully by Payload — no Git source, not an artifact), a
thin server-side read library, and two employee pages (`/news` list + `/news/<slug>` detail). Authoring
happens in the Phase 6 back-office through Payload's own admin UI (already gated to Contributor+); the
employee surfaces show only **published** articles, enforced both by the read query and by the
collection's `read` access rule (defense in depth). Rich-text body uses the existing lexical editor +
its React renderer; the hero image is an optional URL for now (a managed upload store / Azure Blob is
deferred). No new dependency, datastore, or external service.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ (unchanged).

**Primary Dependencies**:
- Next.js 16 (App Router) + Payload CMS 3.85 — already present.
- `@payloadcms/richtext-lexical` — already a dependency; the collection body is a `richText` (lexical)
  field, and the employee detail page renders it with `RichText` from
  `@payloadcms/richtext-lexical/react`. **No new dependency.**
- `@digdir/designsystemet-react` — the employee news pages/components (list, detail, cards) use it, per
  the Design-System mandate for the employee app.
- `@kihub/governance-core` — reused for the `Role` type only; News is intentionally NOT wired into the
  Registry permission matrix / lifecycle (see research §3). No change to the package.

**Storage**: PostgreSQL (unchanged) — one new collection/table `news`. Dev uses Payload's schema push;
a migration is generated for prod parity (`payload migrate:create`). No new datastore.

**Testing**: Vitest. Integration (Payload local API): news access matrix (Contributor+ create/edit/
publish/delete; Reader/anonymous refused) and the published-only visibility guarantee (employee read
returns only `published`; drafts unreachable including by slug). Unit: slug derivation + uniqueness. The
employee pages are server components validated via quickstart; the Payload admin UI is Payload's own
(validated via quickstart, not unit-tested — Principle VIII).

**Target Platform**: Local dev (`AUTH_MODE=mock`) and Azure (Entra). Employees read at `/news`; editors
author at `/cms` (Payload admin, Contributor+).

**Project Type**: Web app monorepo — `apps/web` only. `packages/*` unchanged.

**Performance Goals**: None specific — a small internal news feed at portal scale; a simple newest-first
query with an index on `(status, publishDate)` is ample.

**Constraints**:
- Only **published** articles are ever visible to employees — enforced in the read library AND in the
  collection `read` access rule (FR-003/006, US3).
- Authoring/publishing gated to **Contributor+** server-side, reusing the Phase 6 posture (FR-002/007).
- Native content only — News is not an artifact and has no Git source (FR-008; Principles I/II/III).
- Employee news UI uses Designsystemet; the back-office is Payload's own admin (Principle VIII, FR-009).
- New employee routes `/news`, `/news/<slug>` must not collide with existing routes (`/`, `/artifacts/*`,
  `/admin/*`, `/signin`) or the back-office (`/cms`) — they don't.
- No new datastore/service/dependency; employee app behavior otherwise unchanged.

**Scale/Scope**: One collection, one read library, two employee pages + a card component, a nav link, and
tests. Small internal editorial audience; tens of articles.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Constraint | Phase 7 compliance | Status |
|------------------------|--------------------|--------|
| I. Git is source of truth (AI artifacts) | News is native content with no Git source and is explicitly out of the artifact model — the principle's own carve-out (Principle II). No `artifacts`/Git path touched. | ✅ PASS |
| II. Payload owns context & native content | News is the canonical example of native Payload-owned content — authored and stored in KI Hub, no external source of truth. | ✅ PASS |
| III. Every AI asset is an Artifact | News is NOT an AI asset; correctly modeled as its own `news` collection, never forced into `Artifact`. | ✅ PASS |
| IV. Stable artifact identity | N/A — news is not an artifact; it has its own slug/id, no `artifactId`. | ✅ PASS |
| V. Git-centric, APM distribution | Untouched. | ✅ PASS |
| VI. Governance is the core value (Registry) | News is deliberately outside the Registry's governance lifecycle/reviews (clarified) — it does not bypass or weaken Registry governance; it is a separate module. | ✅ PASS |
| VII. Start simple, design for growth | Simplest correct module: one collection, reuse of auth/roles/back-office/data layer, lexical body via existing editor, hero image as a URL (managed uploads deferred), no new dependency/datastore. | ✅ PASS |
| VIII. Two surfaces | Authored in the back-office (`/cms`, Contributor+), read in the employee app (Designsystemet) — one auth/role/data layer across both. | ✅ PASS |
| Design System (employee app) | The `/news` list and detail pages are built with Designsystemet; the back-office is Payload's own admin (exempt). | ✅ PASS |
| Auth (employees only, roles) | Reuses Entra + the five-role model; only signed-in employees read; authoring gated to Contributor+ server-side. | ✅ PASS |
| Testing gate (new module) | New module tests access control + the state/validation rules (visibility, slug) per the Dev-Workflow gate. | ✅ PASS |
| Contract-first | The collection shape + access matrix and the employee read contract are documented in `contracts/`. | ✅ PASS |

**Result**: No violations. Complexity Tracking intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/007-news/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (the News collection shape + access/visibility matrix)
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── news-collection.md   # news collection: fields, slug rule, access matrix, publish visibility
│   └── news-read.md         # employee read contract: /news list + /news/<slug> detail, published-only
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/
  web/
    src/
      payload.config.ts             # CHANGED: register the News collection (add to `collections`)
      collections/
        News.ts                     # NEW: the `news` collection — fields, slug hook, access, publish visibility
      lib/
        news.ts                     # NEW: server-side reads — listPublishedNews(), getPublishedNewsBySlug(slug)
      app/
        (app)/
          news/
            page.tsx                # NEW: employee news list (published, newest-first, featured surfaced)
            [slug]/page.tsx         # NEW: employee article detail (published only; 404 for draft/unknown slug)
          page.tsx / layout.tsx     # (unchanged; add a "News" nav link in the app header/shell)
      components/
        NewsCard.tsx                # NEW: Designsystemet list-item card (title, summary, date, featured, tags)
    tests/
      integration/
        news-access.test.ts         # NEW: Contributor+ author/publish; Reader/anon refused; publish visibility
      unit/
        news-slug.test.ts           # NEW: slug derivation from title + uniqueness rule
    migrations/                     # (if present) generated migration adding the `news` table for prod parity
```

**Structure Decision**: Same monorepo, same two route groups. News is a new native collection surfaced by
a thin `lib/news.ts` (mirroring `lib/catalog.ts`'s local-API read pattern) and two server components under
the existing employee `(app)` group (protected by `(app)/layout.tsx` `requireSession()`), plus one
Designsystemet card component. Authoring reuses the Phase 6 Payload admin unchanged (News appears as
another editable collection there, gated to Contributor+). The only config change is registering the
collection. This mirrors how every prior module was added on the shared foundation.

## Complexity Tracking

> No constitution violations — section intentionally empty.
