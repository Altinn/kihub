# Phase 0 Research: Full-Text Search

Resolves the Technical Context decisions for Phase 5. This phase deliberately implements the *first*
half of Constitution Principle VII ("PostgreSQL full-text search first (semantic search / Qdrant
later)"), so every choice favors the simplest thing on the database the platform already runs;
semantic/embeddings/Qdrant are deferred to a later phase.

## §1 — Search mechanism: PostgreSQL FTS at query time (no schema change)

**Decision**: Implement full-text search as a **parameterized raw query on the existing pg pool**,
building the document `tsvector` **inline** from the live `artifacts` columns:

```sql
SELECT artifact_id,
       ts_rank(
         to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(readme,'')),
         websearch_to_tsquery('simple', $1)
       ) AS rank
FROM artifacts
WHERE active = true
  AND to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(readme,''))
      @@ websearch_to_tsquery('simple', $1)
ORDER BY rank DESC
LIMIT 50;
```

No new column, generated column, migration, or collection. The pool is reached via
`payload.db.pool` — the exact accessor Phase 4's `lib/discovery.ts` already uses for the advisory
lock, so this is an established pattern, not new infrastructure.

**Rationale**: At tens of artifacts an inline `to_tsvector` with a sequential scan is effectively
instant (SC-006), and building the vector at query time keeps the `artifacts` shape **unchanged** and
**fresh by construction** — there is nothing to maintain, because the query reads the same rows
discovery already updates (FR-014). This is the least-moving-parts way to get real ranked full-text
search (stemming-agnostic tokenization + `ts_rank` relevance), strictly simpler than a maintained
index and far simpler than a vector store.

**Alternatives considered**: A persisted/generated `tsvector` column + GIN index (the standard
"scale" setup) — deferred: it adds a migration and write-time maintenance for a catalog where a seq
scan already meets the latency goal (add it later if the catalog grows, a clean, isolated follow-up).
Payload `like`/`contains` (ILIKE substring) — no ranking, no token/word-boundary handling, and it is
not "full-text search" as the constitution names; rejected. A search service (Elastic/Meilisearch) or
vectors/Qdrant — out of scope this phase (Principle VII "later"); rejected as speculative.

## §2 — Query parsing safety (`websearch_to_tsquery`)

**Decision**: Parse the user's text with **`websearch_to_tsquery('simple', $1)`** (not `to_tsquery`
or `plainto_tsquery`), passed as a bound parameter.

**Rationale**: `websearch_to_tsquery` accepts arbitrary user input — quotes, `or`, `-negation`,
stray punctuation — and **never raises a syntax error** (unlike `to_tsquery`), which directly
satisfies "handle any query safely, no syntax error surfaced" (FR-008). Parameter binding removes any
injection risk. It also gives users familiar web-search semantics (quoted phrases, `-exclude`).

**Alternatives considered**: `to_tsquery` (throws on malformed input — would need sanitizing/try-catch
for every odd query); `plainto_tsquery` (safe but ANDs all terms and ignores phrase/negation syntax —
less useful); manual query sanitizing (reinvents what `websearch_to_tsquery` already does).

## §3 — Text-search configuration (`simple`, language handling)

**Decision**: Use the **`simple`** text-search configuration for both the document and the query
`to_tsvector`/`websearch_to_tsquery`.

**Rationale**: `simple` tokenizes and lowercases without language-specific stemming or stop-word
removal, so it treats Norwegian and English terms uniformly and matches the literal words present in
the metadata — the honest capability for a mixed-language catalog (FR-018). Choosing `english` or
`norwegian` would stem for one language and mis-handle the other, and neither provides cross-lingual
*meaning* matching anyway (that is the deferred semantic phase). `simple` is the neutral, predictable
default; a language-specific or `unaccent`-augmented config can be layered later without a data change.

**Alternatives considered**: `english`/`norwegian` stemming (helps one language, hurts the other;
premature for this scale); per-row language detection + per-language vectors (complexity with no
near-term payoff); `unaccent` normalization (nice-to-have; deferrable, additive later).

## §4 — Ranking, result cap & governance resolution

**Decision**: Order by `ts_rank` descending, cap the raw SQL at `LIMIT 50` candidate ids, then
**resolve and authorize** those ids through the existing `lib/catalog.ts` helpers — loading only
`active` artifacts the user may read (visibility), preserving rank order, and applying the existing
tag/category AND-filter in app code exactly as Phase 2 browse does. Ids that don't resolve
(deactivated / removed / not visible) are dropped. An empty final set with a non-empty query → the
"no results" state.

**Rationale**: Re-resolving through the catalog keeps governance the single source of truth for
active/visibility (FR-009/FR-010) — the SQL is only a relevance/candidate oracle. Reusing the catalog
helpers means result cards render from the exact Phase 2/3 data shown elsewhere and link to the
existing detail page (FR-005), and the tag filter behaves identically to browse (parity). `LIMIT 50`
is comfortably above what a tens-of-artifacts catalog will return while bounding work.

**Alternatives considered**: Filtering active/visibility purely in the SQL `WHERE` (faster but
duplicates governance logic in a second place and risks drift as visibility rules evolve — rejected;
the app-layer resolution is the existing, tested gate); no result cap (unbounded, needless at scale).

## §5 — Catalog UI integration

**Decision**: Add a `q` URL param to the catalog page. Present (non-empty) → run `searchArtifacts`
and render ranked results; empty/whitespace → the unchanged Phase 2 browse (`listArtifacts`). Filters
(`type`/`tag`/`category`) live in the URL alongside `q` and combine, so clearing `q` reverts to
browse and clearing filters gives pure keyword results. A `SearchBar` client component sets/clears
`q` while preserving the other params. All from Designsystemet.

**Rationale**: One catalog surface (not a separate search page) matches FR-013/FR-015 and reuses the
existing filter/URL model (`CatalogFilters` is already URL-param driven), so the change is small and
consistent. Server-component data fetching keeps parity with the Phase 2 page.

**Alternatives considered**: A separate `/search` route (splits the experience, duplicates the
listing UI — rejected); client-side fetching via an API route (unnecessary; the page is already a
server component that queries directly).

## §6 — Testing strategy

**Decision**: Payload integration tests against the local Postgres (the same harness Phase 2–4 use):
seed artifacts, assert ranked matches for a term in name / description / README respectively, a
no-match empty result, a deactivated/not-visible artifact excluded, query+type+tag combination, and
that special-character/very-long queries return without error (proving `websearch_to_tsquery`
safety). A small unit test covers the helper's query-parameter building and row→result mapping via a
faked query runner (no DB) for fast feedback.

**Rationale**: Full-text ranking behavior is a database concern, so the meaningful coverage is an
integration test on real Postgres; the unit test guards the pure mapping/param logic. Mirrors the
Phase 2 reconcile / Phase 4 discovery integration-test posture.

**Alternatives considered**: Mocking Postgres FTS (would test nothing real about ranking/tokenization
— rejected); snapshotting rank scores (brittle across PG versions — assert *ordering/presence*, not
absolute scores).

## Resolved unknowns

All Technical Context items are resolved; no `NEEDS CLARIFICATION` remain. Phase 5 adds one query lib
(`lib/search.ts`), a small `lib/catalog.ts` resolution helper, a `SearchBar` component, and a `q`
branch on the catalog page — reusing the existing PostgreSQL, the Phase 2 catalog/governance
resolution, and the Phase 4-maintained rows. No package, collection, migration, external service, or
discovery change.
