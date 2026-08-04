# Implementation Plan: Home-Page Widgets

**Branch**: `feat/new-architecture` (single-branch workflow) | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-home-widgets/spec.md`

## Summary

Turn the employee-app landing page into a real portal **home**. Today `/` is the Registry catalog
(Phase 2 browse + Phase 5 full-text search). This feature makes `/` a **dashboard** of three
read-only widgets — latest published **News** (3), next upcoming **Events** (3), and
featured/recommended **Registry** artifacts (3) — each a Designsystemet card list with a "View all →"
link, and each with a friendly empty state. The Registry catalog (browse + search) **moves verbatim
to `/registry`** with its own header nav link; its logic is unchanged, so the route move is a file
relocation plus link retargeting, not a rewrite.

The work is **additive and read-only**: it reuses the existing published-only read libraries
(`lib/news.ts::listPublishedNews`, `lib/events.ts::listUpcomingEvents`) and the existing catalog +
governance read layer (`lib/catalog.ts::listArtifacts`, `lib/governance.ts::getGovernance`, which
already exposes `featured`/`recommended`), plus the existing cards (`NewsCard`, `EventCard`,
`ArtifactCard`). It adds **no new Payload collection, no schema change, no migration, and no new
dependency**. New code is confined to the employee-app landing + navigation surface: the dashboard
page, the moved `/registry` page, a small shared header/nav component, two thin read helpers, and one
pure (unit-tested) selection module. Access reuses the existing `(app)/layout.tsx` `requireSession()`
gate. Drafts, past events, and inactive artifacts never reach the widgets — guaranteed by the read
layers, not a new rule.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ (unchanged).

**Primary Dependencies**:
- Next.js 16 (App Router) + Payload CMS 3.85 — already present; **no new dependency**.
- `@digdir/designsystemet-react` — all employee-facing widgets/dashboard/header use it (Principle VIII).
- Existing read layers reused unchanged: `lib/news.ts`, `lib/events.ts`, `lib/catalog.ts`,
  `lib/governance.ts`. Existing cards reused as-is: `NewsCard`, `EventCard`, `ArtifactCard`
  (+ `LifecycleBadge`, which `ArtifactCard` already renders from `governance`).

**Storage**: PostgreSQL (unchanged). **No collection, field, index, or migration change.** No
`payload generate:types` run is required (no schema delta).

**Testing**: Vitest. **Unit (failing-first)**: a new pure selection module `lib/home-select.ts` —
`takeTopN` (cap a pre-ordered list) and `selectRecommendedArtifacts` (filter featured/recommended,
featured-first, cap N). **Existing integration reused as-is**: `tests/integration/news-access.test.ts`
and `tests/integration/events-access.test.ts` already guarantee the published-only / upcoming-only
visibility invariant the widgets depend on — no new integration access test is added (needing one
would signal scope growth). **Route-agnostic**: existing catalog/search tests
(`catalog-filters.test.ts`, `search.test.ts`, unit `search.test.ts`) exercise the read libs
(`listArtifacts`/`searchArtifacts`), not the `/` route, so the catalog move does **not** touch them.
Dashboard/registry pages are server components validated via quickstart + browser.

**Target Platform**: Local dev (`AUTH_MODE=mock`) and Azure (Entra). Employees land on `/`
(dashboard); the catalog lives at `/registry`.

**Project Type**: Web app monorepo — `apps/web` only. `packages/*` unchanged.

**Performance Goals**: None specific — a small internal dashboard at portal scale. The Registry
widget resolves governance for active artifacts by reusing the exact pattern the current catalog page
already uses (`listArtifacts` + per-artifact `getGovernance`); at portal scale (tens of artifacts)
this is ample, and a targeted `catalog-entries` query is a deferred optimization (research §2).

**Constraints**:
- `/` MUST NOT render the catalog and MUST NOT branch on the `q` search param (FR-001/010); it always
  shows the three widgets.
- Widgets show only published news, published+upcoming events, and active featured/recommended
  artifacts — enforced by the existing read layers (FR-004); each capped at 3 (FR-002).
- Full-text search + catalog browse move to `/registry`, logic unchanged (FR-009/010).
- Header nav exposes News, Events, Registry consistently on every employee-app page (FR-012, US3-AS3);
  "← Back to catalog" links on `/news` and `/events` (and the artifact detail page) point to
  `/registry`.
- Employee UI is Designsystemet throughout (FR-007, Principle VIII); cards reused as-is (no compact
  variant this feature).
- No new collection/schema/migration/dependency (FR-008); no change to News/Events/Registry
  internals, governance, or shared packages beyond the landing + navigation surface.

**Scale/Scope**: One rewritten page (`/` dashboard), one moved page (`/registry`), one shared header
component, one generic widget wrapper, two thin read helpers (`lib/home.ts`), one pure selection
module (`lib/home-select.ts`) + its unit test, and retargeting of six `/`→`/registry` links across
existing pages/components. No new data.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Constraint | Compliance | Status |
|------------------------|------------|--------|
| I. Git is source of truth (AI artifacts) | No artifact content stored/changed; the Registry widget only *reads* existing catalog metadata + governance. No Git path touched. | ✅ PASS |
| II. Payload owns context & native content | Reads existing native News/Events + Registry metadata; adds no collection and stores nothing new. | ✅ PASS |
| III. Every AI asset is an Artifact | No new asset type; the Registry widget reads existing `Artifact`s via `listArtifacts`. | ✅ PASS |
| IV. Stable artifact identity | Registry widget links via existing `artifactId` (`ArtifactCard` → `/artifacts/<id>`). Unchanged. | ✅ PASS |
| V. Git-centric, APM distribution | Untouched. | ✅ PASS |
| VI. Governance is the core value (Registry) | Surfaces governance **state** read-only (the `featured`/`recommended` flags) on the home page; performs no governance action and bypasses no rule. The catalog + its governance display move to `/registry` unchanged. | ✅ PASS |
| VII. Start simple, design for growth | Simplest useful home: reuse existing read libs + cards; three capped widgets; catalog relocated, not rewritten. Personalization/dismissable/reorderable/real-time/pagination all deferred. No new dep/datastore/migration. | ✅ PASS |
| VIII. Two surfaces | Purely an employee-app read surface, built with Designsystemet; the back-office is untouched. One auth/role/data layer. | ✅ PASS |
| Design System (employee app) | Dashboard, widgets, and shared header are Designsystemet; cards reused as-is. | ✅ PASS |
| Auth (employees only, roles) | Reuses `requireSession()`; every employee (incl. Reader) sees the dashboard; no new access rule. | ✅ PASS |
| Testing gate (new module) | **No new module/collection** → heavy access-matrix test not mandated. Light failing-first **unit** test on the pure selection logic; existing news/events access integration tests cover the visibility invariant. | ✅ PASS |
| Contract-first | The dashboard read contract and the catalog-route-move contract are documented in `contracts/`. No schema contract changes. | ✅ PASS |

**Result**: No violations. Complexity Tracking intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/010-home-widgets/
├── plan.md              # This file
├── research.md          # Phase 0 output (decisions: route move, Registry curation, shared header, testing)
├── data-model.md        # Phase 1 output (NO new entities — read shapes + pure selection contracts)
├── quickstart.md        # Phase 1 output (end-to-end validation scenarios)
├── contracts/
│   ├── home-dashboard.md    # dashboard read contract: widgets, caps, ordering, empty states, view-all targets, gate
│   └── registry-route.md    # catalog move to /registry (logic unchanged) + the /→/registry link/nav retargets
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/
  web/
    src/
      app/
        (app)/
          page.tsx                  # CHANGED (rewrite): NOW the dashboard — 3 widgets (News/Events/Registry), no catalog
          registry/
            page.tsx                # NEW (moved): the former catalog page — browse + full-text search, logic unchanged
          news/page.tsx             # CHANGED: "← Back to catalog" now → /registry (uses shared header)
          events/page.tsx           # CHANGED: "← Back to catalog" now → /registry (uses shared header)
          artifacts/[artifactId]/page.tsx  # CHANGED: "← Back to catalog" now → /registry
      components/
        PortalHeader.tsx            # NEW: shared employee-app header — brand/home link, nav (Registry/News/Events), user + role + sign out, admin link (server component; hosts the signOut server action)
        HomeWidget.tsx              # NEW: generic Designsystemet widget wrapper — heading, "View all →" link, children, empty-state slot
        SearchBar.tsx               # CHANGED: accept a `basePath` prop (default "/registry") instead of hardcoding "/"
        CatalogFilters.tsx          # CHANGED: accept a `basePath` prop for toggle/clear hrefs instead of hardcoding "/"
        NewsCard.tsx                # (unchanged; reused in the news widget)
        EventCard.tsx               # (unchanged; reused in the events widget)
        ArtifactCard.tsx            # (unchanged; reused in the Registry widget)
      lib/
        home.ts                     # NEW (impure): getHomeNews(n), getHomeEvents(n), getHomeRecommendedArtifacts(n) — compose existing reads
        home-select.ts              # NEW (pure): takeTopN(items,n); selectRecommendedArtifacts(entries,n) — unit-tested
        news.ts / events.ts / catalog.ts / governance.ts   # (unchanged; reused)
    tests/
      unit/
        home-select.test.ts         # NEW: takeTopN cap/ordering + selectRecommendedArtifacts filter/featured-first/cap (failing-first)
      integration/
        news-access.test.ts         # (unchanged; already guarantees published-only news visibility)
        events-access.test.ts       # (unchanged; already guarantees published+upcoming events visibility)
        catalog-filters.test.ts / search.test.ts  # (unchanged; route-agnostic — exercise the read libs, not `/`)
```

**Structure Decision**: Same monorepo, same `(app)` route group behind `requireSession()`. The
landing page is rewritten into a dashboard that composes three `HomeWidget`s over three thin reads in
`lib/home.ts`; the pure selection logic those reads use is factored into `lib/home-select.ts` so it
unit-tests without loading the Payload config (mirroring how `lib/event-dates.ts` is split from
`lib/events.ts`). The Registry catalog page moves wholesale to `(app)/registry/page.tsx` with its
browse+search logic byte-for-byte unchanged — only its own internal `/`→`/registry` links and its
`SearchBar`/`CatalogFilters` `basePath` change. A new shared `PortalHeader` centralizes the nav
(Registry/News/Events) + user/sign-out that today lives inline in the catalog page, and is reused
across the dashboard, `/registry`, `/news`, `/events`, and the artifact detail page so navigation is
consistent on every employee-app page (FR-012, US3-AS3). No config, schema, or dependency changes.

## Complexity Tracking

> No constitution violations — section intentionally empty.
