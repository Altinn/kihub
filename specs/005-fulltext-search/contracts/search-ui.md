# Contract: Catalog search UI integration

How the keyword search appears on the existing catalog page and combines with the Phase 2 filters.
Lives in `apps/web` (`app/(app)/page.tsx`, `components/SearchBar.tsx`). Designsystemet only (FR-015).

## Catalog page branching (`app/(app)/page.tsx`)

`SearchParams` extends Phase 2 with `q?: string`:

| `q` | Behavior |
|-----|----------|
| empty / whitespace / absent | **Unchanged Phase 2 browse** — `listArtifacts(filters)`, no ranking (spec edge case: empty query = browse). |
| present (non-empty) | `searchArtifacts(payload, q, filters)` — ranked results; combine with active `type`/`tag`/`category` filters. |

- `q`, `type`, `tag` coexist in the URL (`?q=…&type=…&tag=…`) so clearing `q` reverts to browse and
  clearing filters gives pure keyword results (FR-013).
- Results render with the existing `ArtifactCard` (+ governance view via `getGovernance`) and link to
  the existing detail page (FR-005) — no new artifact data introduced.
- Non-empty `q` with no matches → a "no results" empty state (FR-004), distinct from the Phase 2
  "catalog is empty" state.
- Unauthenticated access still redirects to sign-in via the existing `(app)/layout.tsx`
  `requireSession()` gate — search adds a `q` param to the existing catalog page, not a new route, so
  the Phase 1 gate applies unchanged (FR-007; covered by `tests/integration/route-protection.test.ts`).
- Facets (available types/tags) continue to derive from the full active set so filters stay visible
  during a search, consistent with Phase 2.

## `SearchBar.tsx` (client component, Designsystemet)

- A text input + submit built from Designsystemet form primitives, pre-filled from the current `q`.
- On submit: navigate to the catalog URL with `q` set (or removed when cleared), **preserving** the
  existing `type`/`tag` params (same URL-composition approach as `CatalogFilters`).
- No client-side data fetching — it only changes the URL; the server component re-renders results.

## Observable outcomes (map to FR-012, FR-013, FR-015)

| Situation | Expected |
|-----------|----------|
| Query + `type` filter | Results match the query AND are limited to that type, in rank order (FR-012). |
| Query + `tag`(s) / category | Results satisfy all active filters AND the query (FR-012). |
| Clear the query | Reverts to the unchanged Phase 2 browse/filter listing (FR-013). |
| Clear the filters (query kept) | Pure keyword results (FR-013). |
| Any search/result/empty UI | Rendered with Designsystemet, integrated in the existing catalog page (FR-015). |
