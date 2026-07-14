# Phase 0 Research: Semantic Search

Resolves the Technical Context unknowns for Phase 5. Each decision favors the simplest option that
satisfies the phase (Constitution Principle VII — this phase *is* the "semantic search / Qdrant
later" seam) while reusing Phase 2–4 machinery unchanged.

## §1 — Embedding model / provider

**Decision**: Use **Azure OpenAI `text-embedding-3-large`** as the default embedder, accessed via a
pure `createAzureOpenAIEmbedder({ endpoint, apiKey, deployment, fetch })` factory in
`@kihub/search-core`. Endpoint/key/deployment come from env (referenced Phase-4-style; never stored
in the DB). Query and document text are embedded with the *same* model. A deterministic
`createMockEmbedder()` (hashes tokens into a fixed-dim unit vector) is selected when no Azure
credentials are present, so local dev and CI run with **no external AI dependency** — the same
"mock vs real" split the app already uses for `AUTH_MODE`.

**Rationale**: `text-embedding-3-large` is multilingual and handles Norwegian↔English cross-lingual
matching well (FR-003a, SC-001), fits the Azure-first stack the constitution mandates, and needs no
SDK — a single REST call via the injected `fetch` keeps the adapter pure and unit-testable with a
faked `fetch` (mirroring `@kihub/github-client`). A mock embedder keeps the feature runnable and
testable offline; because the vector store is rebuildable from Git, switching mock→Azure is just a
re-run of discovery.

**Alternatives considered**: `text-embedding-3-small` (cheaper, lower cross-lingual quality — a fine
later cost optimization, but "large" removes doubt about Norwegian recall this phase); a
self-hosted/open model (e.g. multilingual-e5) — avoids the API dependency but adds a model-serving
component to operate now (deferred); embedding via a heavyweight SDK (unnecessary weight vs one REST
call).

## §2 — Vector store

**Decision**: Use **Qdrant** with a single collection `artifacts` (cosine distance, vector size =
the embedding model's dimension). Accessed via a pure `createQdrantStore({ url, apiKey, collection,
fetch })` factory implementing the `VectorStore` interface (`upsert`, `remove`, `query`). Each point
is keyed by the stable `artifactId` and carries a small payload (`artifactId`, `type`, `tags`) for
optional server-side pre-filtering; the vector is the only heavy field. Run Qdrant as a **container
in dev** (alongside `kihub-postgres`, e.g. port `56333`) and Azure-hosted in deploy.

**Rationale**: Qdrant is explicitly named by Principle VII, is trivial to run as a container, has a
simple REST API (pure `fetch`, no SDK needed), and supports payload filters so a `type` facet can be
pushed down when useful. One collection keeps the model simple (Principle III — everything is an
artifact). Keying points by `artifactId` makes upsert idempotent and delete-by-id exact (Principle
IV), and makes the whole store rebuildable by replaying discovery.

**Alternatives considered**: `pgvector` in the existing Postgres (avoids a new service and is a
reasonable alternative — but the constitution names Qdrant specifically, and a dedicated vector DB
keeps the "design for growth" seam clean); an in-memory index in the app (not durable, lost on
restart, doesn't survive multi-replica — the in-memory `VectorStore` is used only for tests);
managed vector SaaS (over-provisioned for a small internal catalog).

## §3 — Where embeddings are generated (hook into discovery) + readiness marker

**Decision**: Generate/refresh embeddings **inside `lib/discovery.ts::runDiscovery`, immediately
after a successful `reconcile`**, in a new best-effort `indexForSearch(payload, report)` step. It
(a) loads the `artifacts` docs for `report.created ∪ report.updated` **plus any active doc whose
`searchIndexedAt` is null or older than its `lastIndexedAt`** (stragglers from a previous failure),
(b) builds each doc's search text, embeds in a batch, upserts to Qdrant keyed by `artifactId`, and
stamps `searchIndexedAt = now`; and (c) removes `report.deactivated` ids from Qdrant. The whole step
is wrapped so **any failure is caught and never propagates** — `reconcile` and the `discovery-runs`
record still report success; un-embedded artifacts simply keep a stale/null `searchIndexedAt` and are
retried on the next run. `reconcile` itself is **unchanged**.

A new nullable **`artifacts.searchIndexedAt`** (date) is the readiness marker: "searchable" =
`searchIndexedAt >= lastIndexedAt`; "not yet searchable" = null or older. It is derived, rebuildable
technical metadata (Principle II boundary intact — the *vector* lives in Qdrant, only the marker is
in Payload).

**Rationale**: This satisfies the clarified requirement (catalog freshness decoupled from embedding
availability, FR-011a) with no new async infrastructure. Reusing the single `runDiscovery` path means
webhook / scheduled / manual / CLI all keep search in sync for free, under the existing per-source
advisory lock (no extra concurrency design). The straggler sweep makes even a webhook run self-heal
prior failures; the daily scheduled scan is the backstop. Keying off the `IndexReport` avoids
re-embedding unchanged artifacts every push (cheap API usage) while the straggler rule guarantees
eventual completeness.

**Alternatives considered**: Embedding *inside* `reconcile` (couples the pure Payload-agnostic engine
to an embedder and would let an embedding outage fail catalog reconcile — rejected by the
clarification); a separate async queue/worker (durable but adds a runner to operate this phase —
deferred, YAGNI); re-embedding *all* active artifacts every run (simplest but wasteful on each
webhook — the report+straggler approach is nearly as simple and far cheaper); a boolean `searchable`
flag instead of a timestamp (a timestamp also detects content-changed-but-not-yet-reembedded, so it
is strictly more informative for the same cost).

## §4 — Query flow & governance authority

**Decision**: `lib/search.ts::searchCatalog(query, filters, user)`:
1. Embed the query (same model).
2. `store.query(vector, { limit: K, minScore, filter })` → ranked `{ artifactId, score }[]`
   (optional `type` pushed into the Qdrant payload filter when a type filter is active).
3. **Resolve + authorize against the live catalog**: load the active `artifacts` for those ids via
   the existing Phase 2 catalog helpers (which already enforce `active = true` and the read access /
   `visibility` rules), preserving vector rank order. Ids that don't resolve (deactivated / removed /
   not visible) are **dropped**, even if a stale vector lingered.
4. Apply the existing **tag** AND-filter (and category) in app code, exactly as Phase 2 browse does.
5. Return ranked, resolved artifact docs (deduped by `artifactId`).

Governance is thus **authoritative at query time** (FR-008/FR-009/FR-010): the vector store is only a
relevance oracle; what a user may see is always decided by the catalog/governance rules, reused, not
duplicated. No new per-user/per-group visibility tiers are introduced (clarification).

**Rationale**: Re-resolving through the catalog is the single source of truth for visibility and
active state, so a lag or staleness in Qdrant can never leak a hidden/removed artifact. It also means
the result cards reuse the exact Phase 2 artifact/governance data already rendered elsewhere. Because
results link to the existing detail page, search never becomes a second store (FR-005).

**Alternatives considered**: Trusting the Qdrant payload's copied `active`/`visibility` for filtering
(faster but risks serving stale governance state — rejected; correctness over a micro-optimization on
a tiny catalog); filtering purely in the vector query with no re-resolve (same staleness risk).

**Threshold / result cap (the deferred 5th clarification, resolved here as a planning default)**:
return at most **K = 20** hits above a **minimum cosine score** (tuned during implementation against
the benchmark set, starting ~0.2–0.3 for `text-embedding-3-large`); below the bar → the "no relevant
results" empty state (FR-004/SC-002). Values live in one config constant, easy to tune.

## §5 — Degraded fallback (backend unavailable)

**Decision**: If embedding the query **or** the Qdrant call throws, `searchCatalog` catches it and
falls back to a **simple keyword/substring match** over already-indexed fields — Payload `like`
queries on `name`, `description`, and `tags` (active-only, same governance resolution) — and returns
a flag so the UI shows a `SearchStatusNotice` ("meaning-based search is temporarily unavailable —
showing keyword matches"). Browse + attribute filters are unaffected. **No PostgreSQL full-text
engine (`tsvector`/`tsquery`) is built** (clarification).

**Rationale**: Keyword `like` matching needs zero new infrastructure, reuses the existing Payload
query path, and gives a usable degraded experience; standing up FTS would be a second search engine
for a fallback that should stay minimal (Principle VII). The catalog never breaks or empties (FR-018,
SC-007).

**Alternatives considered**: Building Postgres FTS as the baseline/fallback (larger scope this phase;
deferrable if a concrete need appears); disabling the query box entirely on outage (worse UX than
keyword matches); surfacing an error (violates "no broken page").

## §6 — Dev / test strategy (offline, deterministic)

**Decision**: A **`SEARCH_MODE`** env (`mock` | `azure`, auto-defaulting to `mock` when no Azure
creds) selects the embedder, mirroring `AUTH_MODE`. Unit tests use `createMockEmbedder()` + an
in-memory `VectorStore` (both from `@kihub/search-core`) so `search-core` needs no network. Payload
integration tests inject the in-memory store into `indexForSearch`/`searchCatalog` to assert:
index-on-discovery, governance-safe ranked query, deactivated-drop, best-effort failure (embed throws
→ reconcile still green, `searchIndexedAt` stays null), and degraded keyword fallback. A local Qdrant
container is documented in `quickstart.md` for manual end-to-end verification.

**Rationale**: Determinism and no external creds keep CI green and fast (matches the Phase 1–4 mock
posture). The in-memory store exercises the real `search()` ranking/threshold logic without Qdrant.

**Alternatives considered**: Requiring live Azure+Qdrant in tests (flaky, credential-bound — rejected);
snapshotting real embeddings as fixtures (brittle across model versions).

## §7 — `search-core` package factoring

**Decision**: New pure package `@kihub/search-core` exporting: the `Embedder`, `VectorStore`,
`VectorPoint`, `SearchHit` types; `buildSearchText(record)`; `search(query, deps)`; and the
`createAzureOpenAIEmbedder` / `createQdrantStore` / `createMockEmbedder` factories (all `fetch`- or
config-injected, no Payload import). `apps/web/src/lib/search-adapters.ts` reads env and constructs
the concrete embedder + store (or mocks); `lib/search.ts` and `lib/search-index.ts` are the thin
Payload-aware layer.

**Rationale**: Identical to the `discovery-core` / `github-client` split that already works: the
valuable, testable logic (text composition + ranking/threshold + adapter request shaping) is pure and
Payload-agnostic; only env-wiring and catalog-resolution live in `apps/web`. Keeps the vector concern
out of `discovery-core` so `reconcile` stays untouched.

**Alternatives considered**: Putting search logic directly in `apps/web` (harder to unit-test, mixes
concerns); extending `discovery-core` with embeddings (would couple the reconcile engine to a vector
store — rejected, breaks the Phase 2/4 boundary and its tests).

## Resolved unknowns

All Technical Context items are resolved; no `NEEDS CLARIFICATION` remain. Phase 5 adds one pure
package (`search-core`), one nullable field on `artifacts` (`searchIndexedAt`), a best-effort index
step inside the existing `runDiscovery`, a query lib with keyword fallback, a search box + notices on
the existing catalog page, and a dev Qdrant container — reusing Phase 2 `reconcile`, Phase 3
governance/visibility rules, and the Phase 4 discovery pipeline unchanged.
