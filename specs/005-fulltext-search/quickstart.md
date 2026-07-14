# Quickstart: Full-Text Search (validation guide)

Proves Phase 5 end-to-end: employees find artifacts by keyword over the existing catalog, results are
ranked, governance is respected, filters combine, and everything runs on the PostgreSQL the platform
already uses. Assumes Phase 1–4 running locally (`AUTH_MODE=mock`) with a seeded catalog.

## Prerequisites

- `apps/web` dev server running against local Postgres (`kihub-postgres` on 55432; Phase 1–4 setup).
- A catalog seeded via a discovery run or the CLI, so artifacts exist to search:
  `AI_ARTIFACTS_PATH=../ai-artifacts pnpm --filter web index`.
- **No new services, env, or datastore** — full-text search uses the existing database (FR-017, SC-008).

## Scenario 1 — Find by keyword (US1, FR-001/002/003)

1. As any employee, open the catalog and enter a keyword that appears in a target artifact's **name**
   (e.g. "security") → the artifact appears, ranked.
2. Enter a term that appears only in an artifact's **description** or **README** (not its name) →
   the artifact is still returned (FR-003).
3. Enter a phrase in quotes (e.g. `"data processing"`) → phrase matching works (via
   `websearch_to_tsquery`).
4. Enter a query that matches nothing → the "no results" state (FR-004, SC-002).

## Scenario 2 — Governance-safe results (FR-009/010, SC-003)

1. Deactivate an artifact (remove it from the source and re-run discovery), then search a term that
   previously matched it.
2. **Expect**: it does **not** appear (query-time resolution enforces `active` + visibility).
3. Confirm search never surfaces an artifact the employee could not already see in browse.

## Scenario 3 — Combine with filters + clear (US2, FR-012/013)

1. With a query active, apply a `type` filter → results match the query **and** are limited to that
   type; add a `tag` filter → results narrow further (all filters AND the query).
2. Clear the query → the listing reverts to the **unchanged** Phase 2 browse/filter; clear filters →
   pure keyword results.

## Scenario 4 — Freshness by construction (FR-014, SC-004)

1. Edit an artifact's description/README in the source and re-run discovery.
2. Search for a term from the **new** text → the artifact is found; search for a removed term → it is
   not — with **no** separate search-index build/sync step (search reads the live rows).

## Scenario 5 — Query safety (FR-008)

1. Enter queries with punctuation/operators and a very long string (e.g. `a:b:c )( "unterminated`,
   a 1000-character string).
2. **Expect**: sensible results or an empty state — **no** query syntax error surfaced, no server
   error (proves `websearch_to_tsquery` + parameter binding).

## Automated checks

- Integration: `pnpm --filter web test` — `search.test.ts`: ranked match for a term in
  name/description/README each; no-match empty; deactivated/not-visible excluded; query+type+tag
  combination; special-character/long-query safety; freshness after a re-index. Existing Phase 2–4
  suites remain green.
- Unit: the `lib/search.ts` helper's query-parameter building and row→result mapping via a faked
  query runner (no DB).

## Content & infra boundary (Principles I & VII, SC-007/SC-008)

- Search reads only `name`/`description`/`readme` from existing rows — **no** artifact body, **no**
  new persisted data.
- **No** new datastore or external service is deployed — the query runs on the existing PostgreSQL.
  (Semantic/embeddings/Qdrant remain deferred to a later phase.)
