# Contract: `@kihub/search-core`

Pure, Payload-agnostic semantic-search core. Behavior is fixed here; implementation lives in
`packages/search-core`. Mirrors the `@kihub/discovery-core` / `@kihub/github-client` split — no
Payload import, all I/O injected (`fetch` or in-memory).

## Types

```ts
export interface Embedder {
  /** One vector per input text; the SAME model is used for documents and queries. */
  embed(texts: string[]): Promise<number[][]>;
  readonly dimension: number;
}

export interface VectorPoint {
  artifactId: string;          // stable id; the point key (Principle IV)
  vector: number[];            // length === Embedder.dimension
  type?: string;               // for optional pre-filtering
  tags?: string[];
}

export interface SearchHit { artifactId: string; score: number; }  // cosine similarity, higher = closer

export interface VectorStore {
  upsert(points: VectorPoint[]): Promise<void>;      // idempotent by artifactId
  remove(artifactIds: string[]): Promise<void>;      // delete-by-id; missing ids are a no-op
  query(vector: number[], opts: QueryOpts): Promise<SearchHit[]>;
}

export interface QueryOpts { limit: number; minScore?: number; type?: string; }
```

## `buildSearchText(record) → string`

Compose the text embedded for one artifact from **already-indexed metadata only** (Principle I):

- Includes: `name`, `description`, `tags` (joined), `type`, and the `readme` snapshot.
- Missing `readme`/`tags` are simply omitted (a name+description-only artifact is still embeddable —
  spec edge case).
- Deterministic ordering and separators so the same record always yields the same text (stable
  re-embedding). No artifact body is ever read (there is none in the record).

## `search(query, deps) → Promise<SearchHit[]>`

```ts
search(query: string, deps: {
  embedder: Embedder;
  store: VectorStore;
  limit?: number;      // default 20
  minScore?: number;   // default from config; hits below are dropped
  type?: string;       // pushed into store.query for pre-filtering
}): Promise<SearchHit[]>
```

1. `const [v] = await deps.embedder.embed([query])`.
2. `return deps.store.query(v, { limit, minScore, type })`.

- Returns hits ordered by descending `score`, already thresholded by `minScore` (so an empty array
  means "no relevant results" — FR-004).
- Throws if the embedder or store throws (the caller in `apps/web` catches this to trigger the
  keyword fallback — FR-018; `search-core` itself does not know about Payload/keyword search).
- Does **not** apply governance/visibility — that is the app layer's job at resolution time
  (FR-008/FR-009), keeping this package Payload-agnostic.

## Factories (pure)

```ts
createAzureOpenAIEmbedder(cfg: { endpoint: string; apiKey: string; deployment: string;
                                 dimension: number; fetch?: typeof fetch }): Embedder
createQdrantStore(cfg: { url: string; apiKey?: string; collection: string;
                         dimension: number; fetch?: typeof fetch }): VectorStore
createMockEmbedder(cfg?: { dimension?: number }): Embedder   // deterministic hash → unit vector
```

- All network I/O goes through an injected `fetch` (defaults to global `fetch`) so adapters are
  unit-testable with a fake — see `contracts/vector-store.md` for the Qdrant request shapes.
- `createMockEmbedder` produces a stable pseudo-vector from the input string (no network), used when
  `SEARCH_MODE=mock` / no Azure creds, and in all `search-core` tests.

## Tests (`packages/search-core/tests`)

- `text.test.ts`: `buildSearchText` includes the expected fields; missing README/tags handled;
  deterministic output.
- `search.test.ts`: with `createMockEmbedder` + an in-memory `VectorStore`, a query nearest a seeded
  artifact ranks it first; `minScore` drops weak hits (empty array = no results); `limit` caps count.
- `azure.test.ts` / `qdrant.test.ts`: faked `fetch` asserts request URL/headers/body shape and maps
  responses to `number[][]` / `SearchHit[]`; error responses reject (so the app can fall back).
