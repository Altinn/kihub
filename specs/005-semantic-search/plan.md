# Implementation Plan: Phase 5 — Semantic Search

**Branch**: `feat/new-architecture` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-semantic-search/spec.md`

## Summary

Let employees find catalog artifacts by *meaning*, not just exact `type`/`tag`/`category` filters.
A new pure package `@kihub/search-core` defines the seam — an `Embedder` interface, a `VectorStore`
interface, a `buildSearchText(record)` composer (name + description + tags + type + README snapshot),
and a storage-agnostic `search()` orchestration (embed query → vector query → threshold → ranked
`{artifactId, score}`). Concrete adapters (Azure OpenAI multilingual embeddings, a Qdrant vector
store, and a deterministic **mock** embedder for local dev/tests) are pure `fetch`-based factories,
mirroring `@kihub/github-client`. Embeddings are (re)generated **inside the existing Phase 4
`runDiscovery` flow** right after `reconcile` succeeds — best-effort so an embedding-service outage
never fails catalog reconcile; artifacts that couldn't be embedded stay browseable and are marked
"not yet searchable" (a new nullable `searchIndexedAt` on `artifacts`) and retried on the next run.
At query time the catalog page gains a search box; a query embeds, hits Qdrant for ranked candidate
`artifactId`s, and results are **resolved and authorized against the live catalog** (active +
visibility) so governance is authoritative and deactivated/hidden artifacts never surface — then the
existing type/tag/category filters combine on top. If the vector backend is unavailable, a text
query degrades to a simple keyword match over indexed fields with a visible notice (no PostgreSQL
full-text engine is built). Vectors are derived, rebuildable-from-Git data (Principle I/VII); no
artifact bodies are stored anywhere.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ (Phase 1–4 toolchain, unchanged).

**Primary Dependencies**:
- Next.js 16 (App Router) + Payload CMS 3.85 (`@payloadcms/db-postgres`) — carried over.
- Digdir Designsystemet (`@digdir/designsystemet-react` + `-css`) — the search box, result list, and
  degraded-state notice.
- New workspace package `@kihub/search-core` (pure, Payload-agnostic): `Embedder`/`VectorStore`
  interfaces, `buildSearchText`, `search()` ranking/threshold orchestration, plus pure factories
  `createAzureOpenAIEmbedder`, `createQdrantStore`, `createMockEmbedder` (all `fetch`-injected).
- **Qdrant** vector store (the "Qdrant later" named in Principle VII) — a single `artifacts`
  collection, cosine distance; run as a container in dev (like `kihub-postgres`), Azure-hosted in
  deploy (research §2).
- **Azure OpenAI** embeddings (`text-embedding-3-large`, multilingual → Norwegian↔English
  cross-lingual, research §1); endpoint/key/deployment via env, referenced Phase-4-style.
- `@kihub/discovery-core` `reconcile` — **unchanged**; the search-index step runs *after* it in
  `lib/discovery.ts`, keyed off the `IndexReport` (created/updated/deactivated ids).

**Storage**: PostgreSQL (unchanged) + **Qdrant** (new). Payload stores only a derived readiness
marker (`artifacts.searchIndexedAt`) — the vectors themselves live in Qdrant. Qdrant holds, per
point, the embedding vector + the stable `artifactId` (+ `type`/`tags` for optional pre-filtering) —
never artifact content (Principle I). Both are rebuildable from Git by re-running discovery.

**Testing**: Vitest. Unit (`@kihub/search-core`): `buildSearchText` composition, `search()` ranking
+ min-score threshold + limit against a fake embedder + in-memory `VectorStore`; Azure/Qdrant
adapters against a faked `fetch`. Integration (Payload): a discovery run indexes created/updated
artifacts into an in-memory store and removes deactivated ones; a query returns governance-safe
ranked results; a deactivated artifact is dropped even if its vector lingers; embedding-service
failure leaves reconcile green and marks artifacts not-searchable; degraded query falls back to
keyword match.

**Target Platform**: Local dev baseline (`AUTH_MODE=mock`, `SEARCH_MODE=mock` embedder + a local
Qdrant container) so the feature runs with no external AI credentials; Azure (Container Apps +
Azure OpenAI + hosted Qdrant) in deploy.

**Project Type**: Web app monorepo — `apps/web` (Next.js + Payload) + `packages/` (adds
`search-core`; `discovery-core`, `github-client`, `artifact-schema`, `governance-core` untouched in
shape — `discovery-core` `reconcile` reused as-is).

**Performance Goals**: A meaning-based query returns ranked results within ~2s for the expected
small internal catalog (SC-008). No re-embedding throughput target — a full re-scan embeds only the
handful of changed artifacts per run (tens of artifacts total).

**Constraints**:
- Vectors + query embeddings are derived representations of already-indexed metadata only; **no
  artifact bodies** anywhere; the search index is fully rebuildable by re-running discovery
  (FR-002/FR-013/FR-021, Principles I & VII).
- Embedding generation is **best-effort inside `runDiscovery`** and MUST NOT fail catalog reconcile;
  un-embedded artifacts are marked not-searchable and retried (FR-011a, research §3).
- Governance is **authoritative at query time**: candidates are resolved/authorized against the live
  catalog (active + `visibility`), reusing existing rules — no parallel access model, no new
  visibility tiers (FR-008/FR-009/FR-010, research §4).
- Degraded path is a **simple keyword/substring match** over indexed fields with a visible notice;
  no PostgreSQL full-text engine this phase (FR-018, research §5).
- Norwegian↔English **cross-lingual** matching, best-effort via a multilingual embedding model
  (FR-003a, research §1).
- All search UI from Designsystemet, integrated into the existing catalog surface (FR-019).
- Search access stays behind the Phase 1 employee gate (FR-007).

**Scale/Scope**: Same small internal catalog (tens of artifacts), initial single source
(`ai-artifacts`). One new package, one changed collection field, one changed service module
(`lib/discovery.ts`), one new query/index lib, one search box + result rendering on the existing
catalog page, plus the CLI reusing the same index step.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Constraint | Phase 5 compliance | Status |
|------------------------|--------------------|--------|
| I. Git is source of truth | Embeddings are a *derived* mathematical representation of already-indexed metadata (manifest + README snapshot); Qdrant holds vectors + `artifactId`, never artifact bodies; the whole index is rebuildable by re-running discovery. | ✅ PASS |
| II. Payload owns context not content | Payload gains only a derived readiness marker (`searchIndexedAt`); vectors live in Qdrant (derived, rebuildable). No content crosses the boundary. | ✅ PASS |
| III. Everything is an Artifact | Search is type-agnostic — one embedding pipeline and one query path over all `type`s; no per-type search subsystem. | ✅ PASS |
| IV. Stable artifact identity | Vector points and search results are keyed by stable `artifactId`; re-embedding updates the same point; deletion by `artifactId`. | ✅ PASS |
| V. Git-centric, APM-compatible distribution | Untouched — search is a discovery surface; install/distribution unchanged. | ✅ PASS |
| VI. Governance is the core value | Results are resolved/authorized against live governance (active + visibility) at query time; nothing bypasses lifecycle/visibility; a freshly discovered artifact is findable but carries its existing (default) governance state. | ✅ PASS |
| VII. Start simple, design for growth | This is the exact deferred item ("PostgreSQL full-text first; **semantic search / Qdrant later**"). Simplest satisfying build: one Qdrant collection, one multilingual model, re-embed changed ids + retry stragglers, mock embedder for dev, keyword (not FTS) fallback. Re-ranking / hybrid-fusion tuning / multi-model deferred. | ✅ PASS |
| Design System (MANDATORY) | Search box, ranked result list, empty ("no relevant results") and degraded notices all from Designsystemet, integrated into the Phase 2 catalog page. | ✅ PASS |
| Auth (employees only) | Search behind the Phase 1 employee gate; results additionally governance-filtered (FR-007/FR-008). | ✅ PASS |
| Testing gate | `search-core` unit tests (composition, ranking/threshold, adapters via faked `fetch`); Payload integration tests for index-on-discovery, governance-safe query, deactivated-drop, best-effort failure, degraded fallback. | ✅ PASS |
| Contract-first | `@kihub/search-core` interfaces, the Qdrant collection shape, the discovery index step, and the query/UI integration are documented in `contracts/`. | ✅ PASS |

**Result**: No violations. New infra (Qdrant, Azure OpenAI) is the named subject of the phase
(Principle VII), not speculative complexity. Complexity Tracking intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/005-semantic-search/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── search-core.md            # @kihub/search-core: Embedder, VectorStore, buildSearchText, search()
│   ├── vector-store.md           # Qdrant collection shape + query/upsert/delete semantics
│   ├── discovery-embedding.md    # the best-effort index step added to runDiscovery + searchIndexedAt
│   └── search-query-ui.md        # catalog query flow, governance resolution, filters, degraded fallback
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/
  web/
    src/
      collections/
        Artifact.ts                 # CHANGED: add nullable `searchIndexedAt` (search readiness marker)
        DiscoverySource.ts          # unchanged (Phase 4)
        DiscoveryRun.ts             # unchanged (Phase 4)
        ...                         # all other collections unchanged
      app/
        (app)/
          page.tsx                  # CHANGED: read `q`; branch to semantic search vs Phase 2 browse
      components/
        SearchBar.tsx               # NEW: query input (client) — sets/clears the `q` URL param
        SearchStatusNotice.tsx      # NEW: degraded / no-relevant-results notice (Designsystemet)
      lib/
        catalog.ts                  # CHANGED: add a keyword-fallback query + resolve-by-ids helper
        search.ts                   # NEW: searchCatalog(query, filters, user) — embed→Qdrant→resolve
                                     #      + authorize (active/visibility) + tag filter; keyword fallback
        search-index.ts             # NEW: indexForSearch(payload, report) — build text, embed, upsert,
                                     #      remove deactivated, stamp searchIndexedAt; best-effort
        search-adapters.ts          # NEW: construct Embedder + VectorStore from env (mock when creds absent)
        discovery.ts                # CHANGED: call indexForSearch(report) after a successful reconcile
      scripts/
        index-artifacts.ts          # CHANGED: after reconcile, run the same indexForSearch step (seeding)
    tests/
      integration/
        search-index-on-discovery.test.ts  # NEW: run indexes created/updated, removes deactivated
        search-query.test.ts                # NEW: ranked, governance-safe; deactivated dropped
        search-degraded.test.ts             # NEW: backend down → keyword fallback + notice
        search-best-effort.test.ts          # NEW: embed failure → reconcile still green, marked unsearchable
        reindex-preserves.test.ts           # EXISTING (Phase 3): still green

packages/
  search-core/                      # NEW: pure, Payload-agnostic semantic-search core
    src/
      types.ts                      # Embedder, VectorStore, VectorPoint, SearchHit interfaces
      text.ts                       # buildSearchText(record) — compose fields to embed
      search.ts                     # search(query, {embedder, store, limit, minScore, filter})
      azure.ts                      # createAzureOpenAIEmbedder({ endpoint, apiKey, deployment, fetch })
      qdrant.ts                     # createQdrantStore({ url, apiKey, collection, fetch })
      mock.ts                       # createMockEmbedder() — deterministic vector for dev/tests
      index.ts
    tests/
      text.test.ts                  # composition + missing-README handling
      search.test.ts                # ranking, min-score threshold, limit (fake embedder + in-memory store)
      azure.test.ts / qdrant.test.ts# adapters against a faked fetch
    package.json                    # @kihub/search-core

infra/ (or docker-compose.yml)      # CHANGED: add a Qdrant service alongside kihub-postgres (dev)
```

**Structure Decision**: Reuse the established pure-core + thin-Payload-layer pattern. `@kihub/search-core`
owns everything Payload-agnostic and unit-testable (interfaces, text composition, ranking/threshold,
and `fetch`-based Azure/Qdrant/mock factories) exactly as `@kihub/github-client` does for remote
fetch. The Phase 4 `reconcile` and `runDiscovery` mutex/run-recording stay intact; the only change to
`lib/discovery.ts` is a **best-effort** `indexForSearch(report)` call after a successful reconcile
(and a symmetric removal of deactivated ids), so the vector index tracks the catalog through the same
single discovery path that already serializes runs. Query lives in `lib/search.ts` and resolves
candidates against the existing catalog helpers so governance stays authoritative and defined once.
The catalog page branches on a `q` param — present → semantic (or degraded keyword) search; absent →
the unchanged Phase 2 browse — so there is one catalog surface, not two.

## Complexity Tracking

> No constitution violations — section intentionally empty.
