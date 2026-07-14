# Contract: Catalog query flow, governance resolution & UI

How a meaning-based query is served on the existing catalog page, how governance stays authoritative,
how filters combine, and how the degraded fallback behaves. Lives in `apps/web` (`lib/search.ts`,
`lib/catalog.ts`, `app/(app)/page.tsx`, `components/SearchBar.tsx`, `components/SearchStatusNotice.tsx`).

## `searchCatalog(query, filters, user) → SearchOutcome`

```ts
searchCatalog(
  query: string,
  filters: { type?: string; tags?: string[]; category?: string },
  deps: { embedder; store; payload },
): Promise<{ results: ArtifactDoc[]; degraded: boolean }>
```

1. **Vector search**: `hits = await search(query, { embedder, store, type: filters.type })`
   (`@kihub/search-core`) → ranked `{ artifactId, score }[]` above `minScore`.
2. **Resolve + authorize (governance authoritative — FR-008/FR-009/FR-010)**: load the **active**
   `artifacts` for `hits.map(h => h.artifactId)` via the Phase 2 catalog helper (which enforces
   `active = true` and the read-access / `visibility` rules). Preserve vector rank order; **drop** any
   id that does not resolve (deactivated / removed / not visible) — even if its vector lingered.
3. **Tag / category filter**: apply the existing Phase 2 AND tag-filter (and type-derived category) in
   app code, exactly as browse does.
4. Return `{ results, degraded: false }`, deduped by `artifactId`.

**Degraded fallback (FR-018)**: if step 1 throws (embedder or store unavailable), catch and instead
run a **keyword/substring match** — Payload `like` on `name` / `description` / `tags`, `active` only,
same tag/category filter and governance resolution — and return `{ results, degraded: true }`. No
PostgreSQL full-text engine is used.

## Catalog page branching (`app/(app)/page.tsx`)

`SearchParams` extends Phase 2 with `q?: string`:

| `q` | Behavior |
|-----|----------|
| empty / whitespace | **Unchanged Phase 2 browse** — `listArtifacts(filters)`, no ranking (spec edge case: empty query = browse). |
| present | `searchCatalog(q, filters)` — ranked results; combine with active `type`/`tag`/`category` filters. |

- Filters and the query coexist in the URL (`?q=...&type=...&tag=...`), so clearing `q` reverts to
  browse and clearing filters gives pure meaning-based results (FR-017).
- Results render with the existing `ArtifactCard` (+ governance view via `getGovernance`), linking to
  the existing detail page (FR-005). No new artifact data is introduced.
- Empty results with a non-empty `q` → a "no relevant results" state (FR-004); `degraded=true` →
  render `SearchStatusNotice` above results (FR-018). Both from Designsystemet.
- Unauthenticated access still redirects to sign-in (Phase 1 gate — FR-007).

## Components (Designsystemet only — FR-019)

- **`SearchBar.tsx`** (client): a text input + submit that sets/clears the `q` URL param (preserving
  existing filter params); debounced or submit-driven. Built from Designsystemet form primitives.
- **`SearchStatusNotice.tsx`**: an inline notice for the degraded state ("meaning-based search
  temporarily unavailable — showing keyword matches") and/or the no-results state.

## Config constants (one place, tunable)

- `SEARCH_RESULT_LIMIT = 20`, `SEARCH_MIN_SCORE` (starting ~0.2–0.3 for `text-embedding-3-large`,
  tuned against the benchmark set) — research §4.

## Observable outcomes (map to FR-001..FR-010, FR-016..FR-019, SC-001..SC-003, SC-006..SC-008)

| Situation | Expected |
|-----------|----------|
| NL query, no keyword overlap with target | Target ranks in top results (SC-001), incl. Norwegian query ↔ English metadata (FR-003a). |
| Query unrelated to any artifact | Empty "no relevant results" state, not an error (FR-004, SC-002). |
| Deactivated / not-visible artifact matches vector | Dropped at resolution; never shown (FR-008/FR-009, SC-003). |
| Query + `type` + `tag` filters | Results relevant to query AND within all filters, rank-ordered (FR-016). |
| Query cleared | Reverts to unchanged Phase 2 browse (FR-017). |
| Vector backend down | Keyword-matched results + degraded notice; browse/filters still work (FR-018, SC-007). |
| Any result opened | Links to the existing artifact detail page (FR-005). |
