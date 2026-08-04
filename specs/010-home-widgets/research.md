# Phase 0 Research: Home-Page Widgets

All "NEEDS CLARIFICATION" from the spec were resolved in `/speckit-clarify` (Session 2026-07-24).
This document records the resulting technical decisions and the alternatives weighed.

## §1 — What `/` becomes, and moving the catalog to `/registry`

**Decision**: `/` becomes a pure portal **dashboard** (three widgets, no catalog). The Registry
catalog (Phase 2 browse + Phase 5 full-text search) moves verbatim to a new `/registry` route with
its own header nav link. Full-text search moves with it (the `q` param now lives on `/registry`); the
dashboard never branches on `q`.

**Rationale**:
- Directly delivers the charter's everyday value — an "internal home" — instead of burying widgets
  above or beside a long catalog. It also resolves the search-coexistence question for free: with the
  catalog gone from `/`, search simply belongs to `/registry`.
- **The move is low-risk.** The existing catalog/search tests are library-level, not route-level:
  `tests/integration/catalog-filters.test.ts` and `tests/integration/search.test.ts` (and unit
  `tests/unit/search.test.ts`) exercise `listArtifacts` / `searchArtifacts` directly and never assert
  that `/` is the catalog. So relocating the page needs **no test rewrite** — it is a file move plus
  link retargeting. `tests/integration/route-protection.test.ts` tests `requireSession` + the
  `/signin` redirect, also unaffected.
- Catalog logic is unchanged, so behavior (results, filters, governance state) is identical — just at
  a new URL.

**Link/route retargets required** (the full mechanical surface of the move):
- `components/SearchBar.tsx` — currently `router.push('/…')`; add a `basePath` prop (default
  `/registry`) so it navigates within the catalog route.
- `components/CatalogFilters.tsx` — `toggleHref`/"Clear filters" currently build `'/…'`; add a
  `basePath` prop.
- `app/(app)/registry/page.tsx` (the moved page) — its internal "clear the search" / "Clear filters"
  links → `/registry`; it passes `basePath="/registry"` to `SearchBar`/`CatalogFilters`.
- `app/(app)/news/page.tsx`, `app/(app)/events/page.tsx`, `app/(app)/artifacts/[artifactId]/page.tsx`
  — "← Back to catalog" `href="/"` → `/registry`.
- News/Events **detail** pages already back-link to `/news` / `/events` (not `/`) — unchanged.

**Alternatives considered**:
- *(a) Dashboard on top, catalog below on `/`*: least disruptive but produces a long mixed page and
  leaves search coexistence awkward. Rejected in clarify.
- *(b) Widgets in a sidebar beside the catalog*: keeps catalog primary, undersells the "home"
  framing, adds responsive-layout fiddliness. Rejected in clarify.

## §2 — Registry widget curation signal

**Decision**: The Registry widget surfaces artifacts whose governance is **`featured` OR
`recommended`** (both booleans already exposed by `lib/governance.ts::getGovernance` →
`Governance.featured` / `Governance.recommended`, sourced from the `catalog-entries` collection),
featured-first, capped at 3. It composes the **existing** reads — `listArtifacts()` (active-only) then
per-artifact `getGovernance()` — exactly as the current catalog page already does when it builds its
`governanceByArtifactId` map, then applies the pure `selectRecommendedArtifacts` helper. It renders
with the existing `ArtifactCard` (which already shows the `LifecycleBadge` from `governance`).

**Rationale**:
- `featured`/`recommended` is a **real, existing curation signal** — no new "featured" concept, no
  schema change. It is the natural editorial answer to "which tools should the home page promote."
- Reusing `listArtifacts` + `getGovernance` introduces **zero new query shapes** and mirrors an
  accepted in-repo pattern (the catalog page). Selection is a pure, testable function over the result.

**Alternatives considered**:
- *Targeted `catalog-entries` query* (`where featured OR recommended`, then resolve artifacts): fewer
  reads (avoids the N+1 governance lookups), but adds a new data-access function coupled to the
  `catalog-entries` shape. **Deferred** as a future optimization — at portal scale (tens of artifacts)
  the reuse-based approach is ample and simpler (Principle VII / YAGNI). Documented so it is an easy
  follow-up if artifact volume grows.
- *`lifecycleState === 'recommended'` as the signal*: overlaps with the explicit `recommended`
  boolean; using the dedicated flags (`featured`/`recommended`) is clearer and editor-controlled.

## §3 — Shared header / navigation

**Decision**: Extract a small shared **`PortalHeader`** server component: a brand/home link, primary
nav (**Registry** `/registry` · **News** `/news` · **Events** `/events`), the signed-in user's
name + role tag + email, the admin-only "Manage roles" link, and the sign-out server action. Reuse it
on the dashboard, `/registry`, `/news`, `/events`, and the artifact detail page.

**Rationale**:
- FR-012 and US3 (AS-3) require News/Events/Registry links to be present and consistent on **every**
  employee-app page. Today that header exists only inline on the catalog page (`/`), and the other
  pages have only a bare "← Back" link. A shared component is the clean, DRY way to satisfy the
  requirement and it *reduces* duplication rather than adding it.
- The sign-out control is currently an inline `'use server'` action in the catalog page; a shared
  server component hosts it unchanged.

**Scope note**: this touches the headers of `/news`, `/events`, and the artifact detail page — but
strictly within the **navigation surface** the spec authorizes (FR-012). It changes no data, access
rule, or module internals. It is the one part of the feature that reaches slightly beyond the two new
pages, and is called out in the plan Summary and Structure Decision so it is a conscious, reviewable
choice.

**Alternative considered**: duplicate the header only on the dashboard + `/registry` and leave
`/news`/`/events` with just a retargeted back-link. Rejected: fails US3-AS3 ("any employee-app page")
and perpetuates three divergent header treatments.

## §4 — Testing strategy

**Decision**:
- **Unit, failing-first** — `tests/unit/home-select.test.ts` over the pure `lib/home-select.ts`:
  - `takeTopN(items, n)` — returns at most `n`, preserves input order, handles `< n` and empty.
  - `selectRecommendedArtifacts(entries, n)` — keeps only `featured || recommended`, orders
    featured-first, caps at `n`, and yields the empty list when none qualify.
- **Reuse existing integration** — the published-only / upcoming-only visibility guarantee the
  widgets rely on is already proven by `tests/integration/news-access.test.ts` and
  `tests/integration/events-access.test.ts`. No new integration access test is written; the widgets
  add no new access path (they call the same read libs). **If a new integration access test appears
  necessary, that is a signal scope has grown — stop and flag it** (per the spec's testing posture).
- **No route-level test churn** — catalog/search tests are route-agnostic (see §1).

**Rationale**: Matches the constitution's testing gate (heavy access-matrix tests are for *new
modules/collections*; this adds none) and Principle VII. Logic that is genuinely new (the selection
helpers) is tested where it lives, purely, without Payload.

## §5 — No schema / dependency / migration change

**Decision & rationale**: The feature reads existing collections through existing libraries and
renders with existing components. There is **no collection, field, index, or migration change** and
**no new dependency**, so `payload generate:types` is not needed and no `migrations/` file is created
(the repo is push-only, as in every prior phase). This is asserted as SC-006 and verified in
quickstart (no schema diff, no new package).

## §6 — Items per widget & card style (confirmed in clarify)

- **3 items** per widget (latest 3 news, next 3 upcoming events, top 3 featured/recommended
  artifacts), honoring each module's existing ordering (featured-first; news newest-first, events
  soonest-first). A single shared cap constant keeps the three widgets consistent.
- **Cards reused as-is** — `NewsCard`, `EventCard`, `ArtifactCard`. No compact "home" variant is built
  this feature; the `HomeWidget` wrapper supplies the per-widget heading, "View all →" link, and
  empty-state, so the cards need no change.
