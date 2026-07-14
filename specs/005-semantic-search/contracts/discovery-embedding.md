# Contract: Search indexing inside discovery (`indexForSearch`)

The best-effort step that keeps the vector store in sync with the catalog, run inside the existing
Phase 4 `runDiscovery` after a successful `reconcile`. `reconcile` (`@kihub/discovery-core`) is
**unchanged**; this is additive glue in `apps/web/src/lib`.

## `indexForSearch(payload, report, deps) → Promise<void>`

```ts
indexForSearch(payload: Payload, report: IndexReport, deps: {
  embedder: Embedder;   // from search-adapters (Azure or mock)
  store: VectorStore;   // Qdrant or in-memory (tests)
}): Promise<void>
```

Steps:

1. **Select targets**: `report.created ∪ report.updated` **plus** any active `artifacts` doc whose
   `searchIndexedAt` is null or `< lastIndexedAt` (stragglers from a prior failed embed — research §3).
2. **Load + compose**: fetch those `artifacts` docs (`overrideAccess`), `buildSearchText(doc)` each.
3. **Embed** the batch via `deps.embedder.embed(texts)`.
4. **Upsert** `VectorPoint{ artifactId, vector, type, tags }` via `deps.store.upsert`.
5. **Stamp** `searchIndexedAt = now` on each successfully-embedded artifact (`overrideAccess`).
6. **Remove** `report.deactivated` ids from the store via `deps.store.remove`.

## Failure semantics (FR-011a — the clarified guarantee)

- The **entire** `indexForSearch` call is invoked from `runDiscovery` wrapped in try/catch; **any
  thrown error is caught and swallowed** (logged, not rethrown). It runs **after** `reconcile` and
  **after** the `discovery-runs` success record is written, so:
  - Catalog reconcile still succeeds; the run outcome stays `success`.
  - Un-embedded artifacts keep `searchIndexedAt` null/stale ⇒ "not yet searchable" ⇒ retried by the
    straggler rule on the next run.
- A failure here MUST NOT change the `discovery-runs` outcome, mass-deactivate artifacts, or touch
  Phase 3 governance state.
- Deactivation removal (step 6) is also best-effort; a stale point that survives is still dropped at
  query time by governance resolution (see `contracts/search-query-ui.md`).

## Placement in `runDiscovery`

```txt
scanRepo(reader) → reconcile(payload, scanned) → record discovery-runs (success) → update source snapshot
                                                → try { indexForSearch(payload, report, deps) } catch { log }   // best-effort, non-fatal
```

The per-source advisory lock already held by `runDiscovery` also serializes the embedding step (no
extra concurrency control). The scheduled scan and CLI use the same path, so all trigger types keep
search in sync (FR-011/FR-015). The CLI (`scripts/index-artifacts.ts`) calls the same
`indexForSearch` after its local reconcile so seeding populates search too.

## Observable outcomes (map to FR-011..FR-015, SC-004, SC-005)

| Situation | Expected |
|-----------|----------|
| Discovery creates a new valid artifact | Its point is upserted; `searchIndexedAt` set; findable by meaning after the run. |
| Discovery updates an artifact's metadata/README | Its point is re-embedded; search reflects new meaning. |
| Discovery deactivates/removes an artifact | Its point removed; it disappears from search results. |
| Embedding service down during the run | Reconcile + run still `success`; targets stay "not yet searchable"; retried next run. |
| Vector store lost / emptied | Next discovery run re-embeds all stragglers (all active) → index rebuilt from Git. |
| Invalid manifest in the run | Skipped by `reconcile` as before; never embedded; no effect on other artifacts. |
