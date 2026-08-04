# Phase 5 Data Model

Phase 5 adds **no new Payload collection and no new field**. Full-text search reads the existing
`artifacts` rows and builds the search vector inline at query time. Per Principles I & II, nothing new
is persisted; no artifact body is read or stored. All Phase 2/3/4 collections are unchanged.

## Reused columns on `artifacts` (Phase 2, unchanged)

Full-text search is computed over these already-indexed columns — no shape change:

| Field | Type | Role in search |
|-------|------|----------------|
| `name` | text | Searched free-text (highest-signal term source). |
| `description` | text | Searched free-text. |
| `readme` | textarea | Searched free-text (README snapshot indexed in Phase 2). |
| `tags` | text[] (hasMany) | **Not** in the free-text vector; remains the existing structured tag filter (combines with the query). |
| `type` | select | Structured `type`/category filter (combines with the query). |
| `visibility` | select | Read at query time to authorize results (governance). |
| `active` | checkbox | Read at query time — only `active = true` rows are searched/returned. |

**Access**: unchanged from Phase 2 — `read` = any authenticated employee; write = server-side only.
Search issues a read-only query; it never writes to `artifacts`.

## Query-time search vector (derived, not stored)

Search builds the document vector inline, not as a column (research §1):

```
document = to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(readme,''))
match    = document @@ websearch_to_tsquery('english', :q)
rank     = ts_rank(document, websearch_to_tsquery('english', :q))
```

- Config `english` (English stemming/stopwords — content is English; research §3).
- `websearch_to_tsquery` for injection-safe, syntax-error-free parsing of arbitrary user text
  (research §2, FR-008).
- No persisted `tsvector` column, no generated column, no GIN index this phase (a seq scan meets the
  latency goal at this scale; indexing is a documented later step — research §1/§4).

## Transient types (not persisted)

```ts
// apps/web/src/lib/search.ts
interface SearchQuery { q: string; type?: string; tags?: string[]; category?: string; }  // from URL params
interface RankedId   { artifactId: string; rank: number; }                                // raw SQL result
// searchArtifacts(payload, q, filters) → Artifact docs (Phase 2 shape) in rank order,
//   resolved + authorized via lib/catalog.ts (active + visibility + tag/category filter).
```

- **SearchQuery** — the free-text query plus the existing Phase 2 facets, read from the catalog page's
  URL params.
- **RankedId** — a candidate stable `artifactId` + its `ts_rank`, from the raw FTS query; resolved to
  a full artifact doc before display.
- **Search result** — a Phase 2 `artifacts` doc (+ its Phase 3 governance view) in rank order,
  resolved/authorized at query time; not a stored entity.

## Reused / unchanged entities

- **`artifacts` (Phase 2)** — read-only for search; shape unchanged; still created/updated/deactivated
  by `reconcile`.
- **`catalog-entries` / `reviews` / `audit-log` (Phase 3)** — untouched; visibility/active rules are
  *read* to authorize results, never modified.
- **`discovery-sources` / `discovery-runs` (Phase 4)** — untouched; discovery keeps the searched rows
  current, so search is fresh by construction (no search-specific write path).

## Rebuildability / boundary check (Principles I & II)

There is no search index to rebuild — search reads the live `artifacts` rows, which are themselves
rebuildable from Git by re-running discovery (Phase 2/4 guarantee, inherited). No artifact content is
persisted for search (nothing new is persisted at all), verifiable by inspection (SC-007).
