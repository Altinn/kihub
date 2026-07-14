---
description: "Task list for Phase 5 — Full-Text Search implementation"
---

# Tasks: Phase 5 — Full-Text Search

**Input**: Design documents from `/specs/005-fulltext-search/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included where the constitution's testing gate applies — the search query behavior
(ranking, governance-safe results, query safety, freshness) has Payload integration tests against the
local Postgres, and the pure query-param/result-mapping helper has a unit test. Search UI is verified
via quickstart.

**Organization**: By user story — US1=P1 find by keyword, US2=P2 combine with existing filters.
Builds on Phase 1 (auth/employee gate), Phase 2 (`artifacts` collection + `lib/catalog.ts` helpers),
Phase 3 (governance visibility/active rules) and Phase 4 (discovery keeps rows fresh). **No new
package, collection, field, migration, or external service.** The `artifacts` shape, `reconcile`,
discovery, and all `packages/*` are reused **unchanged**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete deps)
- **[Story]**: US1 / US2 (setup/foundational/polish carry no story label)
- Paths relative to the `kihub` repo root

## Path Conventions

Monorepo: all Phase 5 code lives in `apps/web/` (Next.js + Payload). `packages/*` are untouched. The
full-text query runs on the existing PostgreSQL via the pg pool the app already reaches at
`payload.db.pool` (the accessor Phase 4's `lib/discovery.ts` established).

---

## Phase 1: Setup

- [ ] T001 Scaffold `apps/web/src/lib/search.ts` with the Phase 5 config constants and transient types per data-model.md (`SEARCH_RESULT_LIMIT = 50`, `TS_CONFIG = 'english'` — searched content is English, per research §3, and the `SearchQuery`/`RankedId` types) — confirming in a top comment that Phase 5 adds **no** new dependency, env var, collection, field, or migration (search reuses the existing PostgreSQL)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared, governance-safe resolver that turns ranked `artifactId`s into displayable
catalog docs — used by every search path — must exist before either story can return results.

**⚠️ CRITICAL**: Blocks all user stories

- [ ] T002 Add `resolveByArtifactIds(ids, filters)` to `apps/web/src/lib/catalog.ts` per contracts/fulltext-query.md: load `artifacts` where `artifactId ∈ ids` **and** `active = true`, honoring the same read/visibility access rules `listArtifacts` already uses, apply the existing tag AND-filter and type-derived category, and return docs ordered to match the input `ids` (i.e. relevance order); dedupe by `artifactId` (this is the single, reused governance-authoritative gate — FR-009/FR-010)

**Checkpoint**: Ranked ids can be resolved to governance-safe, filter-respecting artifact docs

---

## Phase 3: User Story 1 - Find artifacts by keyword (Priority: P1) 🎯 MVP

**Goal**: An employee types a keyword/phrase and gets artifacts whose name/description/README match,
ranked by relevance, limited to what they may see — with a "no results" state when nothing matches.

**Independent Test**: Query a term that appears only in an artifact's README → that artifact is
returned and ranked; an unrelated query → "no results" (not an error); a deactivated/not-visible
artifact never appears; odd punctuation / a very long query never errors.

### Tests for User Story 1 ⚠️

- [ ] T003 [US1] Integration test `apps/web/tests/integration/search.test.ts` (write first, must fail): seed artifacts, then assert — a term in `name`, in `description`, and in `readme` **each** returns the target artifact ranked (FR-001/003); an unrelated query returns an empty result (FR-004, SC-002); a deactivated (`active=false`) artifact and one the user may not see are **excluded** (FR-009/010, SC-003); a query with quotes/`-negation`/punctuation and a ~1000-char query return without error (FR-008); each artifact appears at most once (FR-006); an English morphological variant matches via stemming (e.g. a "reviews"/"reviewing" query matches content containing "review") (FR-018)

### Implementation for User Story 1

- [ ] T004 [US1] Implement `searchArtifacts(payload, q, filters)` in `apps/web/src/lib/search.ts` per contracts/fulltext-query.md: return `[]` for empty/whitespace `q`; else run the parameterized `to_tsvector('english', coalesce(name,'')||' '||coalesce(description,'')||' '||coalesce(readme,'')) @@ websearch_to_tsquery('english', $1)` query with `ts_rank` ordering and `LIMIT SEARCH_RESULT_LIMIT` on `payload.db.pool` (active rows only), then pass the ranked `artifactId`s to `resolveByArtifactIds(ids, filters)` and return the resolved docs in rank order (depends on T001, T002)
- [ ] T005 [P] [US1] Unit test `apps/web/tests/unit/search.test.ts`: with a faked query runner (no DB), assert `searchArtifacts` binds the user text as a parameter (never string-interpolated), uses `websearch_to_tsquery`/`english`, short-circuits empty/whitespace `q` to `[]`, and maps result rows → ranked `artifactId`s in order (depends on T004)
- [ ] T006 [P] [US1] Create `apps/web/src/components/SearchBar.tsx` (client, Designsystemet only): a text input + submit prefilled from the current `q` that navigates to the catalog URL with `q` set (or removed when cleared), preserving the other URL params — mirroring the URL-composition approach of `components/CatalogFilters.tsx`
- [ ] T007 [US1] Wire `apps/web/src/app/(app)/page.tsx` per contracts/search-ui.md: extend `SearchParams` with `q`; when `q` is non-empty call `searchArtifacts(payload, q, {})` and render the ranked results with the existing `ArtifactCard` (+ `getGovernance`), showing a "no results" empty state when none match; when `q` is empty keep the unchanged Phase 2 browse; render `SearchBar` above the listing; the search entry point MUST stay within the `(app)` route group so the existing `(app)/layout.tsx` `requireSession()` gate applies unchanged (unauthenticated → `/signin`; FR-007) — the `q` param is added to the existing catalog page, no new route is introduced (depends on T004, T006)

**Checkpoint**: US1 fully functional — employees can find artifacts by keyword, governance-safe; deployable MVP

---

## Phase 4: User Story 2 - Combine search with existing filters (Priority: P2)

**Goal**: A keyword query combines with the existing type/tag/category filters (AND); clearing the
query reverts to the unchanged Phase 2 browse; results stay fresh automatically as discovery updates
the rows.

**Independent Test**: Query + `type` filter → results match the query and are limited to that type;
add a `tag` → narrower; clear the query → unchanged Phase 2 browse; edit an artifact via discovery →
search reflects the new text with no extra index step.

### Tests for User Story 2 ⚠️

- [ ] T008 [US2] Extend `apps/web/tests/integration/search.test.ts`: a query combined with a `type` filter returns only that type in rank order (FR-012); a query combined with `tag`(s)/category satisfies all filters AND the query (FR-012); after updating an artifact's `description`/`readme` in place (simulating a discovery re-index) a search reflects the new text and stops matching removed text with no separate index step (FR-014, SC-004)

### Implementation for User Story 2

- [ ] T009 [US2] Combine filters through the catalog page in `apps/web/src/app/(app)/page.tsx`: read the active `type`/`tag`/`category` params alongside `q` and pass them as `filters` to `searchArtifacts` (which forwards them to `resolveByArtifactIds`), so search results respect all active facets; ensure clearing `q` falls back to the unchanged `listArtifacts(filters)` browse and clearing filters yields pure keyword results (depends on T004, T007)
- [ ] T010 [P] [US2] Ensure `apps/web/src/components/SearchBar.tsx` and the surrounding catalog layout keep the search box and `CatalogFilters` as one coherent Designsystemet surface (search + filters visible together; "no results" vs Phase 2 "catalog is empty" states are distinct), per contracts/search-ui.md (depends on T006)

**Checkpoint**: US1 + US2 both work — keyword search that composes with filters and stays fresh by construction

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T011 [P] Run all quickstart.md scenarios 1–5 end-to-end (find by keyword, governance-safe, combine+clear, freshness, query safety) and confirm expected outcomes
- [ ] T012 [P] Update `apps/web` docs/README: a keyword full-text search over name/description/README was added, running on the existing PostgreSQL with **no** new env/deps/datastore; note that semantic/embeddings/Qdrant remain deferred to a later phase (Principle VII)
- [ ] T013 Workspace typecheck + lint (`tsc --noEmit` + linter across `apps/web`) to confirm the new search lib and catalog page changes are clean and no existing consumer broke

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup — **BLOCKS all user stories** (the shared resolver T002).
- **User Stories (Phase 3–4)**: depend on Foundational. US2 builds on US1's `searchArtifacts`/page
  wiring (it adds filter composition), so US2 follows US1.
- **Polish (Phase 5)**: depends on the targeted user stories being complete.

### User Story Dependencies

- **US1 (P1)**: `searchArtifacts` (T004) atop the resolver (T002) + page/SearchBar wiring — the
  independently testable MVP.
- **US2 (P2)**: filter composition (T009) atop US1; independently testable by adding facets to a query,
  but shares the US1 search path (not a separate mechanism).

### Within Each User Story

- Tests written first and failing before implementation.
- The resolver (T002) is the shared prerequisite; `searchArtifacts` (T004) precedes the UI wiring.

### Parallel Opportunities

- Foundational: T002 is a single blocking task.
- US1: after T004, the unit test T005 ∥ the `SearchBar` component T006; T007 (page wiring) after T004+T006.
- US2: T009 (page) then T010 (layout polish) ∥ possible; T008 test written first.
- Polish: T011 ∥ T012 (T013 after code is final).

---

## Parallel Example: User Story 1

```bash
# After T004 (searchArtifacts) lands, in parallel:
Task: "Unit test searchArtifacts param-binding/mapping in apps/web/tests/unit/search.test.ts"   # T005
Task: "Create SearchBar.tsx (Designsystemet) in apps/web/src/components/SearchBar.tsx"           # T006
# then wire the page:
Task: "Wire q-branch + results + no-results state in apps/web/src/app/(app)/page.tsx"            # T007
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup (T001) → 2. Phase 2 Foundational (T002 resolver) → 3. Phase 3 US1 (T003 test →
   T004 search lib → T005 unit → T006 SearchBar → T007 page) → 4. **STOP & VALIDATE**: employees can
   search by keyword, governance-safe, with a no-results state. Deploy/demo (MVP).

### Incremental Delivery

1. Setup + Foundational → the resolver exists.
2. US1 keyword search → findable catalog (MVP).
3. US2 filter composition → search + facets as one surface, fresh by construction.
4. Polish → quickstart validation, docs, typecheck/lint.

---

## Notes

- [P] = different files, no incomplete dependencies.
- Reuse is deliberate: the `artifacts` shape, `reconcile`, discovery, and every `packages/*` are
  **unchanged**; governance (active + visibility) is enforced once, in the reused `lib/catalog.ts`
  resolver (T002) — search never invents a parallel access model.
- FR-007 (employee gate) is satisfied by the inherited `(app)/layout.tsx` `requireSession()` gate: the
  search box only adds a `q` param to the existing catalog page (no new route), so no bypass exists —
  already covered by `tests/integration/route-protection.test.ts`; T007 keeps the search path inside
  the `(app)` group.
- No new dependency, env var, collection, field, migration, GIN index, or external service this phase;
  a persisted `tsvector` column + GIN index and semantic/embeddings/Qdrant are documented later steps.
- The query is injection-safe and syntax-error-safe (`websearch_to_tsquery` + bound parameter).
- Commit after each task or logical group; stop at any checkpoint to validate independently.
