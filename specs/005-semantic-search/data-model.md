# Phase 5 Data Model

Phase 5 adds **no new Payload collection**. It adds one derived field to the existing `artifacts`
collection and one external store (Qdrant). Per Principles I & II, only a *derived readiness marker*
lives in Payload; the vectors are derived data in Qdrant; **no artifact body is stored anywhere** and
the whole search index is rebuildable from Git by re-running discovery. All Phase 2/3/4 collections
are otherwise unchanged in shape.

## `artifacts` collection (changed: one field added)

The Phase 2 technical record gains a single nullable field. Everything else is unchanged.

| Field | Type | Rules / source |
|-------|------|----------------|
| `searchIndexedAt` | date (nullable) | Stamp of the most recent successful embedding/upsert into the vector store for this artifact. Set by `indexForSearch` after a successful embed+upsert; left null/stale on embedding failure. **Derived** — never hand-authored. |

**Derived readiness (not stored as a separate flag)**:
- **searchable** ⇔ `searchIndexedAt != null && searchIndexedAt >= lastIndexedAt`
- **not yet searchable** ⇔ `searchIndexedAt == null` **or** `searchIndexedAt < lastIndexedAt`
  (content re-indexed since it was last embedded, e.g. after an embedding-service outage — FR-011a).

A "not yet searchable" artifact still appears in Phase 2 browse/filter; it is simply absent from
meaning-based results until a subsequent discovery run re-embeds it (the straggler sweep, research §3).

**Access**: unchanged from Phase 2 — `read` = any authenticated employee; `create`/`update`/`delete`
= server-side only (the indexer / discovery service via `overrideAccess`). `searchIndexedAt` is
written only by `indexForSearch`.

**Boundary note (Principle II)**: `searchIndexedAt` is enterprise/technical metadata *about* indexing
status, not artifact content and not a governance decision — it belongs on the technical `artifacts`
record, not on `catalog-entries`. The embedding vector itself is **not** stored in Payload.

## Vector store: Qdrant collection `artifacts`

External to Payload; holds the derived vectors. Rebuildable by re-running discovery (Principle I).

| Aspect | Value / rule |
|--------|--------------|
| Collection name | `artifacts` |
| Distance | Cosine |
| Vector size | The embedding model's dimension (e.g. 3072 for `text-embedding-3-large`); a config constant, consistent across index + query. |
| Point id | Derived deterministically from the stable `artifactId` (so upsert is idempotent and delete-by-id exact — Principle IV). |
| Payload (per point) | `{ artifactId, type, tags }` — the minimum needed for optional server-side pre-filtering and to resolve back to the catalog. **No** `name`/`description`/`readme` text and **no** artifact body is stored; the vector is the only representation of the metadata. |

**Invariants**:
- One point per active artifact once embedded; keyed by `artifactId`.
- A deactivated/removed artifact's point is deleted by `indexForSearch` (research §3) — and even if a
  stale point lingered, query-time resolution against the live catalog drops it (research §4).
- The store is never the source of truth for visibility/active state — governance is re-checked at
  query time (FR-009).
- The store contains only derived vectors + identifying metadata — never artifact content
  (Principle I, FR-021, SC-009).

## Derived / transient types (`@kihub/search-core`, not persisted)

```ts
// The text that gets embedded for one artifact (research §7, contracts/search-core.md).
buildSearchText(record): string   // name + description + tags + type + README snapshot

interface Embedder {
  embed(texts: string[]): Promise<number[][]>;   // one vector per input text; same model for docs + query
  readonly dimension: number;
}

interface VectorPoint { artifactId: string; vector: number[]; type?: string; tags?: string[]; }

interface SearchHit { artifactId: string; score: number; }

interface VectorStore {
  upsert(points: VectorPoint[]): Promise<void>;
  remove(artifactIds: string[]): Promise<void>;
  query(vector: number[], opts: { limit: number; minScore?: number; type?: string }): Promise<SearchHit[]>;
}
```

- **`SearchQuery`** (transient): `{ q: string; type?; tags?: string[]; category? }` — the user's
  free-text query plus the existing Phase 2 facets, read from URL params on the catalog page.
- **`SearchResult`** (transient): a Phase 2 `artifacts` doc (+ its Phase 3 governance view) in
  vector-rank order, resolved and authorized at query time — not a stored entity.
- **`SearchOutcome`** (transient): `{ results: SearchResult[]; degraded: boolean }` — `degraded=true`
  when the keyword fallback was used, so the UI can show the notice (FR-018).

## Reused / unchanged entities

- **`artifacts` (Phase 2)** — shape unchanged except the added `searchIndexedAt`; still
  created/updated/deactivated by `reconcile` keyed on `artifactId`.
- **`catalog-entries` / `reviews` / `audit-log` (Phase 3)** — untouched; visibility/active/lifecycle
  rules are *read* at query time to authorize results, never modified by search.
- **`discovery-sources` / `discovery-runs` (Phase 4)** — untouched; the embedding step runs within
  the existing `runDiscovery` and does not add fields to the run record (a failed embed is a no-op on
  run outcome, research §3).

## Rebuildability / boundary check (Principles I & II)

Dropping the Qdrant collection and clearing `searchIndexedAt`, then re-running discovery, reproduces
the entire search index from the current catalog/Git state — verified by an integration test that
indexes into an in-memory store from a discovery run and asserts the expected points. No artifact
content is persisted in Payload or Qdrant (inspectable — SC-009).
