---
description: "Task list for Home-Page Widgets implementation"
---

# Tasks: Home-Page Widgets

**Input**: Design documents from `/specs/010-home-widgets/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included per the plan (§4) and the constitution's testing gate — the genuinely-new logic
is the pure widget-selection module, which gets a **failing-first unit test**. The published-only /
upcoming-only visibility invariant the widgets rely on is **already** covered by the existing
`news-access` and `events-access` integration tests; **no new integration test is added** (needing
one would signal scope growth — stop and flag it). The dashboard + moved catalog page are server
components validated via quickstart + browser.

**Organization**: By user story — US1=P1 employees see the dashboard widgets (MVP); US2=P2 widgets
never leak drafts/past/inactive and degrade gracefully when empty; US3=P3 the Registry catalog stays
fully reachable at `/registry` with consistent nav.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete deps)
- **[Story]**: US1 / US2 / US3 (setup/foundational/polish carry no story label)
- Paths relative to the `kihub` repo root

## Path Conventions

Monorepo: all code lives in `apps/web/`. The dashboard is `app/(app)/page.tsx`; the moved catalog is
`app/(app)/registry/page.tsx`; shared UI in `src/components/`; read + selection logic in `src/lib/`;
tests under `tests/`. `packages/*` and all Payload collections are **unchanged**. **Zero new
collections, schema changes, migrations, or dependencies.**

---

## Phase 1: Setup

**Purpose**: The pure, unit-testable widget-selection logic (no Payload runtime), TDD-style.

- [X] T001 [P] Write failing-first unit test `apps/web/tests/unit/home-select.test.ts` per data-model.md: `takeTopN(items, n)` returns at most `n` items in input order, returns all when `items.length <= n`, returns `[]` for `n <= 0` or empty input, and does not mutate input; `selectRecommendedArtifacts(entries, n)` keeps only entries where `governance.featured === true || governance.recommended === true`, orders featured entries first (stable within groups), caps at `n`, and returns `[]` when none qualify. Must FAIL initially (module absent)
- [X] T002 Implement the pure selection module `apps/web/src/lib/home-select.ts` to make T001 pass: `takeTopN<T>(items: T[], n: number): T[]` and `selectRecommendedArtifacts(entries: RecommendedArtifact[], n: number): RecommendedArtifact[]` (filter featured/recommended, stable featured-first, cap `n`). Pure functions only — MUST NOT import `@payload-config` or any Payload runtime (mirrors how `lib/event-dates.ts` is separate from `lib/events.ts`) (depends on T001)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Free the `/` route for the dashboard by moving the Registry catalog to `/registry`
(logic unchanged), and create the shared header/nav. Nothing at `/` (US1) can exist until the catalog
has moved off it, and every page needs the shared nav.

**⚠️ CRITICAL**: Blocks US1 (the dashboard cannot live at `/` until the catalog moves) and underpins US3.

- [X] T003 [P] Add a `basePath` prop to `apps/web/src/components/SearchBar.tsx` (default `"/registry"`) and replace the hardcoded `router.push('/…')` navigation with `${basePath}…`, preserving all existing `q`/filter query-param behavior (contracts/registry-route.md)
- [X] T004 [P] Add a `basePath` prop to `apps/web/src/components/CatalogFilters.tsx` (default `"/registry"`) and build the `toggleHref` results and the "Clear filters" link from `${basePath}…` instead of `'/…'`, preserving existing filter-toggle behavior (contracts/registry-route.md)
- [X] T005 [P] Create the shared `apps/web/src/components/PortalHeader.tsx` (server component) per contracts/registry-route.md: a brand/home link (→ `/`), primary nav **Registry** (`/registry`) · **News** (`/news`) · **Events** (`/events`), the signed-in user's name + role `Tag` + email, the admin-only "Manage roles" (`/admin/roles`) link, and the sign-out form hosting the existing `'use server'` `signOut({ redirectTo: '/signin' })` action — all Designsystemet, lifting the block currently inline in `app/(app)/page.tsx`
- [X] T006 Create `apps/web/src/app/(app)/registry/page.tsx` by moving the current catalog page from `app/(app)/page.tsx` **verbatim** (browse via `listArtifacts`, search via `searchArtifacts`, facets, governance badges, empty/no-results states — logic byte-for-byte unchanged): render `PortalHeader` in place of the old inline header, pass `basePath="/registry"` to `SearchBar`/`CatalogFilters`, and retarget its internal "clear the search" / "Clear filters" links from `/` to `/registry` (contracts/registry-route.md) (depends on T003, T004, T005)

**Checkpoint**: The catalog now lives at `/registry` (unchanged behavior) and `/` is free; the shared header exists. `app/(app)/page.tsx` will be replaced by the dashboard in US1.

---

## Phase 3: User Story 1 - Employee sees news, events, and recommended tools on the home page (Priority: P1) 🎯 MVP

**Goal**: `/` is a dashboard of three read-only widgets — latest 3 published news, next 3 upcoming
events, top 3 featured/recommended artifacts — each a Designsystemet card list with a "View all →"
link.

**Independent Test**: With ≥1 published news article, ≥1 published upcoming event, and ≥1
featured/recommended artifact present, sign in as any employee (incl. a Reader), open `/`, and confirm
the three widgets render their items (featured surfaced, capped at 3) with working "View all →" links
to `/news`, `/events`, `/registry`.

### Implementation for User Story 1

- [X] T007 [US1] Create the impure read layer `apps/web/src/lib/home.ts` per data-model.md: export `HOME_WIDGET_LIMIT = 3`; `getHomeNews(limit = HOME_WIDGET_LIMIT)` → `takeTopN(await listPublishedNews(), limit)`; `getHomeEvents(limit)` → `takeTopN(await listUpcomingEvents(), limit)`; `getHomeRecommendedArtifacts(limit)` → resolve `listArtifacts()`, attach `getGovernance(artifactId)` per artifact (the pattern the current catalog page uses), then `selectRecommendedArtifacts(entries, limit)`. Reuse existing libs only — no new query path (depends on T002)
- [X] T008 [P] [US1] Create the generic `apps/web/src/components/HomeWidget.tsx` wrapper per contracts/home-dashboard.md: Designsystemet section with a heading (`title`), a "View all →" link (`viewAllHref`), a friendly empty-state slot (`isEmpty` + `emptyMessage`, never an error/blank), and a `children` slot for the card list
- [X] T009 [US1] Rewrite `apps/web/src/app/(app)/page.tsx` as the dashboard: render `PortalHeader`, then three `HomeWidget`s — News (`getHomeNews` → `NewsCard`, view-all `/news`), Events (`getHomeEvents` → `EventCard`, view-all `/events`), Registry (`getHomeRecommendedArtifacts` → `ArtifactCard` with its `governance`, view-all `/registry`). Do NOT branch on the `q` param; always render the widgets (FR-001/010) (depends on T005, T007, T008)
- [X] T010 [US1] Run quickstart.md §3 "Dashboard (`/`)": as Ada (reader), confirm `/` shows the three widgets (not the catalog), each capped at 3 with featured surfaced, and each "View all →" lands on the right module list

**Checkpoint**: US1 functional — an employee lands on the dashboard and sees news/events/recommended-tools widgets; deployable MVP (content authored via `/cms` / seeded).

---

## Phase 4: User Story 2 - Widgets never leak drafts/past/inactive and degrade gracefully when empty (Priority: P2)

**Goal**: The widgets show only published news, published+upcoming events, and active
featured/recommended artifacts; each widget shows a friendly empty state when its slice is empty.

**Independent Test**: With a draft article, a past/draft event, and non-featured artifacts present,
confirm none appear in the widgets; with no published news / no upcoming events / no
featured-recommended artifacts, confirm each widget shows a friendly empty state (not an error/blank).

### Verification for User Story 2

- [X] T011 [US2] Run quickstart.md §3 "Empty states" and the exclusion checks: draft news, draft/past events, and non-featured/non-recommended artifacts are absent from the widgets; with each source empty the corresponding widget shows a friendly empty state and all-three-empty still renders cleanly. No code beyond US1 is expected — visibility rides on the existing read libs and the `selectRecommendedArtifacts` filter (unit-covered by T001); if any new access/query code seems necessary here, STOP and flag scope growth

**Checkpoint**: US1 + US2 — widgets are safe (no draft/past/inactive leak) and resilient (per-widget empty states).

---

## Phase 5: User Story 3 - The Registry catalog remains fully reachable at `/registry` (Priority: P3)

**Goal**: The catalog browse + full-text search behave exactly as before at `/registry`; header nav
(News/Events/Registry) is consistent on every employee-app page; "← Back to catalog" links land on
`/registry`.

**Independent Test**: Navigate to `/registry`, confirm browse + `?q=` search + filters + governance
state are identical to the old `/`; confirm the header nav is present/consistent on `/`, `/registry`,
`/news`, `/events`, and an artifact detail page; confirm the back-links on `/news`, `/events`, and the
artifact detail page land on `/registry`.

### Implementation for User Story 3

- [X] T012 [US3] In `apps/web/src/app/(app)/news/page.tsx`, `apps/web/src/app/(app)/events/page.tsx`, and `apps/web/src/app/(app)/artifacts/[artifactId]/page.tsx`: render the shared `PortalHeader` and retarget the "← Back to catalog" link `href="/"` → `/registry` (FR-012, US3-AS3/AS4). News/Events **detail** pages already back-link to `/news`/`/events` — leave them unchanged (depends on T005)
- [X] T013 [US3] Run quickstart.md §3 "Registry route" + "Consistent navigation": `/registry` browse + full-text search + filters + governance badges are identical to the old `/`; the nav (Registry/News/Events) is present and consistent on `/`, `/registry`, `/news`, `/events`, and an artifact detail page; the three back-links land on `/registry`

**Checkpoint**: US1 + US2 + US3 — dashboard live at `/`, catalog fully functional at `/registry`, nav consistent everywhere, no regression.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T014 [P] Update `README.md`: `/` is now the portal **dashboard** (three read-only widgets — latest news, upcoming events, featured/recommended Registry tools — each with a "View all →" link); the Registry catalog browse + full-text search now live at `/registry`; note that personalization/per-user config, dismissable/reorderable widgets, real-time updates, and in-widget pagination are deferred
- [X] T015 Workspace typecheck + lint + full suite green: `npx tsc --noEmit` (from `apps/web`) and `pnpm -r lint` clean; full test suite green including the new `home-select` unit test and **no regression** in the existing suites (baseline 97/97 across 22 files; the suite may only grow). Run from `apps/web`: `set -a; . ./.env; set +a; NODE_OPTIONS=--no-deprecation npx vitest run`. Then confirm quickstart.md §4 scope assertions: no `migrations/` file, no schema/collection/`payload-types` diff, no new dependency, changes confined to the landing + navigation surface

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 (failing test) → T002 (pure module). Independent of everything else.
- **Foundational (Phase 2)**: T003 ∥ T004 ∥ T005, then T006 (moves the catalog, depends on all three). **BLOCKS US1** (`/` must be freed) and underpins US3 (shared header).
- **US1 (Phase 3)**: depends on Foundational (freed `/` + `PortalHeader`) and T002 (selection). T007 → T009; T008 ∥ T007; then T010.
- **US2 (Phase 4)**: verification only; depends on US1.
- **US3 (Phase 5)**: T012 depends on T005 (PortalHeader); then T013 verification. Independent of US1's widgets (the catalog move itself happened in Foundational).
- **Polish (Phase 6)**: after the stories; T015 last.

### User Story Dependencies

- **US1 (P1)**: Foundational + T002 → `lib/home.ts` (T007) + `HomeWidget` (T008) → dashboard (T009). MVP.
- **US2 (P2)**: rides on US1 + the existing read libs + the T001-covered selection filter; verification only.
- **US3 (P3)**: the catalog move is Foundational; US3 adds consistent-nav application (T012) + verifies reachability (T013).

### Within Each User Story

- The unit test (T001) is written first and must fail before T002 implements the module.
- `PortalHeader` (T005) precedes every page that renders it (T006, T009, T012).
- The catalog move (T006) must precede the dashboard rewrite (T009) — both concern `/`-vs-`/registry`.

### Parallel Opportunities

- Setup: T001 then T002 (sequential — TDD).
- Foundational: T003 ∥ T004 ∥ T005 (different files); T006 follows.
- US1: T008 (HomeWidget) ∥ T007 (lib/home) — different files; T009 follows both.
- Polish: T014 ∥ (before T015); T015 last, once code is final.

---

## Parallel Example: Foundational

```bash
# Different files, no incomplete deps:
Task: "Add basePath prop to apps/web/src/components/SearchBar.tsx"        # T003
Task: "Add basePath prop to apps/web/src/components/CatalogFilters.tsx"   # T004
Task: "Create apps/web/src/components/PortalHeader.tsx"                    # T005
# then T006 moves the catalog to /registry using all three
```

## Parallel Example: User Story 1

```bash
# After Foundational + T002:
Task: "Create read layer apps/web/src/lib/home.ts"                        # T007
Task: "Create apps/web/src/components/HomeWidget.tsx"                      # T008 (parallel)
# then T009 rewrites app/(app)/page.tsx into the dashboard
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup (T001 test → T002 pure module) → 2. Phase 2 Foundational (move catalog to
   `/registry` + shared header) → 3. Phase 3 US1 (read layer + HomeWidget + dashboard + validate) →
   4. **STOP & VALIDATE**: an employee lands on `/` and sees the three widgets with working "View
   all →" links; catalog still reachable at `/registry`. Deploy/demo (MVP).

### Incremental Delivery

1. Setup + Foundational → catalog at `/registry`, `/` freed, shared header ready.
2. US1 → dashboard widgets live at `/` (MVP).
3. US2 → verify no draft/past/inactive leak + friendly empty states.
4. US3 → consistent nav on every page + catalog-reachability verified.
5. Polish → README, typecheck/lint, full suite, scope assertions.

---

## Notes

- [P] = different files, no incomplete dependencies.
- Reuse is deliberate: the published-only read libs (`lib/news.ts`, `lib/events.ts`), the catalog +
  governance read layer (`lib/catalog.ts`, `lib/governance.ts`, incl. its `featured`/`recommended`
  flags), and the cards (`NewsCard`, `EventCard`, `ArtifactCard`) are **unchanged**. Net-new is a pure
  `lib/home-select.ts`, an impure `lib/home.ts`, a `HomeWidget` wrapper, a shared `PortalHeader`, the
  dashboard rewrite of `(app)/page.tsx`, and the moved `(app)/registry/page.tsx`.
- **Zero new collections, schema changes, migrations, or dependencies** — no `payload generate:types`
  run needed. The catalog move is a relocation, not a rewrite; existing catalog/search tests are
  route-agnostic and untouched.
- The only change reaching beyond the two new pages is applying the shared `PortalHeader` to
  `/news`/`/events`/artifact-detail (T012) — strictly the navigation surface FR-012 authorizes. If any
  task seems to require touching a collection, access rule, schema, module internals, governance, or a
  shared package, **STOP and flag scope growth**.
- Commit after each task or logical group; stop at any checkpoint to validate independently.
