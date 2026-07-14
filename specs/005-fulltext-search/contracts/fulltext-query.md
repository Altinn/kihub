# Contract: Full-text query (`lib/search.ts`)

The PostgreSQL full-text query and its governance-safe resolution. Lives in
`apps/web/src/lib/search.ts` (+ a resolution helper in `lib/catalog.ts`). No new package; reuses the
existing pg pool and catalog helpers.

## `searchArtifacts(payload, q, filters) → Promise<ArtifactDoc[]>`

```ts
searchArtifacts(
  payload: Payload,
  q: string,
  filters: { type?: string; tags?: string[]; category?: string },
): Promise<ArtifactDoc[]>   // Phase 2 artifact docs, in relevance order
```

Steps:

1. **Guard**: if `q` is empty/whitespace → return `[]` (the caller shows browse, not search).
2. **Full-text query** on the pg pool (`payload.db.pool`), parameterized:

   ```sql
   SELECT artifact_id,
          ts_rank(DOC, websearch_to_tsquery('simple', $1)) AS rank
   FROM artifacts
   WHERE active = true AND DOC @@ websearch_to_tsquery('simple', $1)
   ORDER BY rank DESC
   LIMIT 50;
   -- DOC = to_tsvector('simple', coalesce(name,'')||' '||coalesce(description,'')||' '||coalesce(readme,''))
   ```

   - Config `simple` (language-agnostic; research §3).
   - `websearch_to_tsquery` + bound `$1` → injection-safe and never a syntax error for arbitrary user
     text (FR-008).
3. **Resolve + authorize (governance authoritative — FR-009/FR-010)**: pass the ranked `artifact_id`s
   to `lib/catalog.ts` resolution, which loads the matching **active** artifacts the user may read
   (visibility rules) and applies the existing tag/category AND-filter — preserving the SQL rank
   order. Ids that don't resolve are dropped.
4. Return the resolved docs (deduped by `artifactId`), in rank order.

## `resolveByArtifactIds(ids, filters) → ArtifactDoc[]` (helper in `lib/catalog.ts`)

- Loads `artifacts` where `artifactId ∈ ids` **and** `active = true`, honoring the same read/access
  rules `listArtifacts` uses (so visibility is enforced once, in the existing place).
- Applies the existing tag AND-filter (and type-derived category) in app code — identical to Phase 2
  browse.
- Returns docs ordered to match the input `ids` order (i.e. `ts_rank` order).

## Invariants

- **Read-only**: search never writes to `artifacts` or any collection.
- **No new persistence / no artifact body**: only existing columns are read; nothing stored (SC-007).
- **Governance is authoritative at query time**: active/visibility decided by the catalog resolution,
  not trusted from anywhere else — a deactivated/hidden artifact never appears (SC-003).
- **Fresh by construction**: the query reads live rows discovery maintains; no index to sync (FR-014).

## Observable outcomes (map to FR-001..FR-011, FR-014, FR-017..FR-018, SC-001..SC-004, SC-006..SC-008)

| Situation | Expected |
|-----------|----------|
| Term appears in an artifact's name / description / README | That artifact is returned, ranked by `ts_rank`. |
| Term appears only in description or README (not name) | Still returned (FR-003). |
| Query matches nothing | Empty result → "no results" state (FR-004, SC-002). |
| Deactivated / not-visible artifact would match | Dropped at resolution; never shown (FR-009/FR-010, SC-003). |
| Query with quotes / `-negation` / punctuation / very long | Handled by `websearch_to_tsquery`; no error, no injection (FR-008). |
| Artifact edited by a discovery run, then searched | Reflects current text — no index step (FR-014, SC-004). |
| Any run of the feature | Uses only the existing PostgreSQL; no new service (FR-017, SC-008). |
