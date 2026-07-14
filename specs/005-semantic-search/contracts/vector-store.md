# Contract: Qdrant vector store (`createQdrantStore`)

The `VectorStore` implementation over Qdrant's REST API. Pure (`fetch`-injected); no Payload import.
One collection, `artifacts`, cosine distance. Implements `upsert` / `remove` / `query` from
`contracts/search-core.md`.

## Collection

- Name: `artifacts` (config constant).
- Vectors: `{ size: <dimension>, distance: "Cosine" }` — `dimension` matches the embedder and is a
  shared config constant (index and query MUST agree).
- Created if absent on first upsert (idempotent `PUT /collections/artifacts`), or provisioned by the
  quickstart. No payload indexes required at this scale; a `type` payload field is filterable.

## Point identity

- Qdrant point id is derived deterministically from the stable `artifactId` (e.g. a UUIDv5 of
  `artifactId`), so re-embedding the same artifact **overwrites** its point (idempotent upsert) and
  delete-by-id is exact (Principle IV). The `artifactId` is also stored in the point payload for
  resolution.

## Operations

| Method | Qdrant call | Semantics |
|--------|-------------|-----------|
| `upsert(points)` | `PUT /collections/artifacts/points` (with `wait=true`) | Upsert each `{ id, vector, payload: { artifactId, type, tags } }`. Overwrites existing point for the same `artifactId`. |
| `remove(artifactIds)` | `POST /collections/artifacts/points/delete` | Delete by the derived ids. Unknown ids are a no-op (no error). |
| `query(vector, opts)` | `POST /collections/artifacts/points/search` | Body `{ vector, limit: opts.limit, score_threshold: opts.minScore, with_payload: true, filter?: type }`. Maps results to `SearchHit{ artifactId (from payload), score }`, descending. |

- `opts.type` → a Qdrant `filter.must` match on the `type` payload field (server-side pre-filter when
  a type facet is active). Tag/category AND-filtering is done by the app after resolution (parity with
  Phase 2 browse), not pushed down.
- Auth via `api-key` header when `apiKey` is set (deploy); omitted for an unauthenticated local
  container.
- Any non-2xx response rejects, so the app layer falls back to keyword search (FR-018).

## Payload / content boundary (Principle I)

Each point stores **only** `artifactId`, `type`, `tags` (identifying metadata) plus the vector. It
stores **no** `name`/`description`/`readme` text and **no** artifact body. The vector is a derived
representation; the store is fully rebuildable by re-running discovery (SC-005, SC-009).

## In-memory test double

`packages/search-core` ships an in-memory `VectorStore` for tests: brute-force cosine over upserted
points, honoring `limit` / `minScore` / `type`. It exercises the real `search()` ranking/threshold
path without a Qdrant container, and is injected into the Payload integration tests.

## Tests

- `qdrant.test.ts`: faked `fetch` asserts the upsert/delete/search request shapes above and response
  mapping; a 5xx/`connect` error rejects (drives the fallback).
- In-memory store parity is covered by `search.test.ts`.
