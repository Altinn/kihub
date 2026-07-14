# Quickstart: Semantic Search (validation guide)

Proves Phase 5 end-to-end: employees find artifacts by meaning, the vector index stays in sync via
discovery, governance stays authoritative, and search degrades gracefully. Assumes Phase 1–4 running
locally (`AUTH_MODE=mock`) with a seeded catalog.

## Prerequisites

- `apps/web` dev server running against local Postgres (Phase 1–4 setup).
- A **Qdrant** container running for dev, e.g.:
  `docker run -p 56333:6333 qdrant/qdrant` (or add it to the project compose alongside `kihub-postgres`).
- Env in `apps/web/.env` (see `.env.example` additions):
  - `QDRANT_URL=http://localhost:56333`, `QDRANT_API_KEY=` (empty for local).
  - `SEARCH_MODE=mock` for a no-credentials run (deterministic mock embedder), **or**
    `SEARCH_MODE=azure` + `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`,
    `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` for real embeddings.
- A catalog seeded via a discovery run or the CLI (below), so artifacts exist to embed.

## Seed / build the search index (US2, FR-011/013/015)

1. Run discovery (any trigger) or the CLI:
   `AI_ARTIFACTS_PATH=../ai-artifacts pnpm --filter web index`.
2. **Expect**: after reconcile, each valid artifact gets a Qdrant point and `searchIndexedAt` set;
   the console/logs report the index step. Re-running is idempotent (points keyed by `artifactId`).
3. Drop the Qdrant collection, re-run discovery → the index is **rebuilt from Git** with no manual
   reconstruction (FR-013, SC-005).

## Scenario 1 — Find by meaning (US1, FR-001/002/003)

1. As any employee, open the catalog and enter a natural-language query that shares **no** keywords
   with the target artifact's name/tags (e.g. "check my code for security issues before release").
2. **Expect**: the intended artifact ranks in the top results; an unrelated query
   returns the "no relevant results" state (FR-004, SC-002); each result links to the existing detail
   page (FR-005).
3. Enter a **Norwegian** query for an artifact whose metadata is **English** → it still surfaces
   (cross-lingual, FR-003a, SC-001).

## Scenario 2 — Governance-safe results (FR-008/009/010, SC-003)

1. Deactivate an artifact (remove it from the source and re-run discovery), then search for a query
   that previously matched it.
2. **Expect**: it does **not** appear, even immediately after removal (query-time resolution drops it
   regardless of any lingering vector).
3. Confirm search never surfaces an artifact the employee could not already see in browse.

## Scenario 3 — Combine with filters + clear (US3, FR-016/017)

1. With a query active, apply a `type` filter → results are relevant **and** limited to that type;
   add a `tag` filter → results narrow further (all filters AND the query).
2. Clear the query → the listing reverts to the **unchanged** Phase 2 browse/filter; clear filters →
   pure meaning-based results.

## Scenario 4 — Best-effort indexing on embedding outage (FR-011a, SC-004)

1. Force the embedder to fail (e.g. `SEARCH_MODE=azure` with a bad key) and run discovery.
2. **Expect**: the `discovery-runs` doc is still `success`, the catalog updates normally, and the
   affected artifacts have null/stale `searchIndexedAt` ("not yet searchable") — still visible in
   browse.
3. Restore the embedder and re-run discovery → the stragglers are embedded and become searchable.

## Scenario 5 — Degraded query fallback (FR-018, SC-007)

1. Stop Qdrant (or point `QDRANT_URL` at an unreachable host) and issue a text query.
2. **Expect**: keyword-matched results plus a visible "meaning-based search temporarily unavailable"
   notice; browse and attribute filters still work; **no** broken page or empty catalog.

## Automated checks

- Unit: `pnpm --filter @kihub/search-core test` — `buildSearchText` composition, `search()` ranking /
  min-score threshold / limit (mock embedder + in-memory store), and the Azure/Qdrant adapters against
  a faked `fetch`.
- Integration: `pnpm --filter web test` — `search-index-on-discovery`, `search-query` (ranked +
  governance-safe + deactivated-drop), `search-best-effort`, `search-degraded`, and the existing
  `reindex-preserves` (still green).

## Content boundary (Principle I, SC-009)

- Inspect a Qdrant point and the `artifacts` record: only the vector + `artifactId`/`type`/`tags` and
  a `searchIndexedAt` timestamp — **no** artifact body anywhere.
