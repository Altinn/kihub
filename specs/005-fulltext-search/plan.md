# Implementation Plan: Phase 5 — Full-Text Search

**Branch**: `feat/new-architecture` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-fulltext-search/spec.md`

## Summary

Give employees a keyword/phrase search over the catalog, on the PostgreSQL the platform already
runs — no new datastore, service, package, or collection field. A new query helper in
`apps/web/src/lib` runs a PostgreSQL full-text query (`to_tsvector('english', name ‖ description ‖
readme) @@ websearch_to_tsquery('english', $q)`, ranked by `ts_rank`) over the **live** `artifacts`
rows, using the pg pool the app already accesses (the same `payload.db.pool` used by Phase 4's
advisory lock). The ranked stable `artifactId`s are **resolved and authorized against the existing
catalog helpers** (active + visibility) so governance stays authoritative, then the existing
type/tag/category filters combine on top. The catalog page gains a search box (`q` URL param);
present → full-text results, absent → the unchanged Phase 2 browse. Because search reads the live
rows that Phase 4 discovery already keeps current, it is fresh by construction — nothing to index,
sync, or rebuild. Embeddings / semantic (vector) search / Qdrant are explicitly deferred to a later
phase (Constitution Principle VII: "full-text first").

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ (Phase 1–4 toolchain, unchanged).

**Primary Dependencies**:
- Next.js 16 (App Router) + Payload CMS 3.85 (`@payloadcms/db-postgres`) — carried over.
- Digdir Designsystemet (`@digdir/designsystemet-react` + `-css`) — the search box, result list, and
  empty-state UI.
- **No new dependency**: full-text search uses PostgreSQL's built-in FTS via a parameterized raw
  query on the existing pg pool (`node-postgres`, already a transitive dep of the Postgres adapter).
- `@kihub/discovery-core`, `@kihub/github-client`, `@kihub/artifact-schema`, `@kihub/governance-core`
  — all **unchanged**; no new package.

**Storage**: PostgreSQL (unchanged). **No schema change**: the query builds the `tsvector` inline
from the existing `artifacts` columns (`name`, `description`, `readme`) at query time. No new column,
no generated column, no migration, no new collection. A GIN index is intentionally *not* added this
phase (a sequential scan is instant at tens of rows; indexing is a documented later step if the
catalog grows — research §4).

**Testing**: Vitest. Integration (Payload + live Postgres): a query returns the expected ranked
artifacts (term in name / description / README each match); a no-match query returns empty; a
deactivated / not-visible artifact never appears; query + type + tag filters combine; special
characters / long query don't error (safe `websearch_to_tsquery`); results reflect a re-index
(freshness by construction). Unit: the tsquery-building / result-mapping helper against a faked query
runner.

**Target Platform**: Local dev (`AUTH_MODE=mock`) and Azure — identical, since search needs only the
existing PostgreSQL. Integration tests require the local Postgres (docker `kihub-postgres` on 55432)
already used by the Phase 2–4 suites.

**Project Type**: Web app monorepo — `apps/web` (Next.js + Payload). `packages/` is **untouched**.

**Performance Goals**: A keyword query returns ranked results within ~1s for the expected small
internal catalog (SC-006). No throughput/index target this phase.

**Constraints**:
- Search covers only already-indexed free-text (`name`, `description`, `readme`); **no artifact
  bodies** (Principle I, FR-002/FR-007-content). `tags`/`type`/`category` stay structured filters.
- **No new datastore/service** — reuse the existing PostgreSQL (FR-017, Principle VII "full-text
  first"; semantic/Qdrant deferred).
- Governance is **authoritative at query time**: ranked ids are resolved/authorized against the live
  catalog (active + `visibility`), reusing existing rules — no parallel access model, no new tiers
  (FR-009/FR-010).
- The query MUST be injection-safe and syntax-error-safe: parameterized, and `websearch_to_tsquery`
  (which never throws on arbitrary user text) rather than `to_tsquery` (FR-008, research §2).
- `english` text-search configuration (the searched content is English; the Norwegian UI is not
  searchable content) so English stemming improves recall; cross-lingual matching is deferred with the
  semantic phase (FR-018, research §3).
- Freshness by construction — search reads live rows; no index to sync (FR-014).
- All search UI from Designsystemet, integrated into the existing catalog surface (FR-015).
- Search stays behind the Phase 1 employee gate (FR-007-auth).

**Scale/Scope**: Same small internal catalog (tens of artifacts), single source (`ai-artifacts`).
One new query lib, a small change to `lib/catalog.ts`, a search box + result rendering on the
existing catalog page. No package, collection, migration, or discovery change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Constraint | Phase 5 compliance | Status |
|------------------------|--------------------|--------|
| I. Git is source of truth | Search only *reads* already-indexed metadata (name/description/README snapshot) from the live catalog rows; stores nothing new; no artifact bodies. | ✅ PASS |
| II. Payload owns context not content | No new field/collection; search reads existing technical-metadata columns. Boundary untouched. | ✅ PASS |
| III. Everything is an Artifact | One query path over all `type`s; no per-type search. | ✅ PASS |
| IV. Stable artifact identity | Results keyed and resolved by stable `artifactId`; ranking is transient. | ✅ PASS |
| V. Git-centric, APM-compatible distribution | Untouched — search is a discovery surface; install/distribution unchanged. | ✅ PASS |
| VI. Governance is the core value | Results resolved/authorized against live governance (active + visibility) at query time; nothing bypasses lifecycle/visibility. | ✅ PASS |
| VII. Start simple, design for growth | Implements the literal "**PostgreSQL full-text search first**" step; adds no datastore/service/package/schema; no GIN index until scale needs it. Semantic/embeddings/Qdrant ("later") explicitly deferred. Maximally simple. | ✅ PASS |
| Design System (MANDATORY) | Search box, ranked result list, and "no results" state from Designsystemet, integrated into the Phase 2 catalog page. | ✅ PASS |
| Auth (employees only) | Search behind the Phase 1 employee gate; results additionally governance-filtered (FR-007). | ✅ PASS |
| Testing gate | Payload integration tests (ranked match, no-match, governance-safe, filter-combine, injection/long-query safety, freshness); unit test for tsquery build/result mapping. | ✅ PASS |
| Contract-first | The full-text query contract (query shape, ranking, governance resolution, safety) and the catalog UI integration are documented in `contracts/`. No manifest/collection contract changes. | ✅ PASS |

**Result**: No violations. This is the simplest option that satisfies the phase and the exact step
Principle VII sequences first. Complexity Tracking intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/005-fulltext-search/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── fulltext-query.md         # lib/search.ts full-text query: tsvector/tsquery, ranking, safety, governance resolution
│   └── search-ui.md              # catalog page `q` branch, filter combination, empty state, Designsystemet
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/
  web/
    src/
      app/
        (app)/
          page.tsx                  # CHANGED: read `q`; branch to full-text search vs Phase 2 browse
      components/
        SearchBar.tsx               # NEW: query input (client) — sets/clears the `q` URL param, preserving filters
      lib/
        catalog.ts                  # CHANGED: add `resolveByArtifactIds(ids, filters)` helper (active + tag filter),
                                     #          reused by search to authorize + order results
        search.ts                   # NEW: searchArtifacts(payload, q, filters) — parameterized FTS query on the
                                     #      pg pool → ranked artifactIds → resolve/authorize via catalog helpers
    tests/
      integration/
        search.test.ts              # NEW: ranked match (name/description/readme), no-match empty, governance-safe,
                                     #      filter-combine, injection/long-query safety, freshness-by-construction
    (packages/ unchanged — no new package)
```

**Structure Decision**: Keep everything in the thin Payload-aware app layer — there is no
Payload-agnostic core to extract, because the whole mechanism is a PostgreSQL query over the existing
`artifacts` rows. `lib/search.ts` issues one parameterized full-text query on the pg pool the app
already reaches via `payload.db.pool` (the pattern Phase 4's `lib/discovery.ts` established for the
advisory lock), returning ranked stable `artifactId`s. It then reuses the existing `lib/catalog.ts`
resolution (which already enforces `active = true`, the read/visibility access rules, and tag
AND-filtering) so governance is authoritative and defined once. The catalog page branches on a `q`
param so there is one catalog surface, not two. `reconcile`, discovery, packages, and every
collection are untouched — search is purely additive and fresh by construction.

## Complexity Tracking

> No constitution violations — section intentionally empty.
