# Contract: Registry Route Move (`/` catalog → `/registry`) + Shared Navigation

## The move

The current catalog page `app/(app)/page.tsx` (Phase 2 browse + Phase 5 full-text search, branching
on `q`) moves **verbatim** to `app/(app)/registry/page.tsx`. Its data logic
(`listArtifacts`/`searchArtifacts` + governance + facets) is **unchanged** — only its URL and its own
internal links change. The header block currently inline in that page is replaced by the shared
`PortalHeader`.

**Behavior at `/registry` MUST be identical to the old `/`:**
- Browse: `listArtifacts(filters)`; empty-catalog card; type/tag facets; filtered count.
- Search: `?q=…` runs `searchArtifacts(query, filters)`; combined with filters; governance-safe.
- Governance state (`LifecycleBadge`) renders per result as before.
- Gated by `(app)/layout.tsx` `requireSession()` (unchanged).

## Link / prop retargets (the full mechanical surface)

| File | Change |
|------|--------|
| `components/SearchBar.tsx` | Add prop `basePath` (default `"/registry"`); replace hardcoded `router.push('/…')` with `${basePath}…`. |
| `components/CatalogFilters.tsx` | Add prop `basePath`; `toggleHref` and "Clear filters" build `${basePath}…` instead of `'/…'`. |
| `app/(app)/registry/page.tsx` | Internal "clear the search" / "Clear filters" links → `/registry`; pass `basePath="/registry"` to `SearchBar`/`CatalogFilters`. |
| `app/(app)/news/page.tsx` | "← Back to catalog" `href="/"` → `/registry`. |
| `app/(app)/events/page.tsx` | "← Back to catalog" `href="/"` → `/registry`. |
| `app/(app)/artifacts/[artifactId]/page.tsx` | "← Back to catalog" `href="/"` → `/registry`. |

News/Events **detail** pages already back-link to `/news` / `/events` (not `/`) — unchanged.

## `PortalHeader` (shared, new)

Server component reused by the dashboard, `/registry`, `/news`, `/events`, and the artifact detail
page (FR-012, US3-AS3).

Contents:
- Brand / **home** link (KI Hub → `/`).
- Primary nav, consistent everywhere: **Registry** (`/registry`) · **News** (`/news`) ·
  **Events** (`/events`).
- Signed-in user: `name`, role `Tag`, `email`; admin-only "Manage roles" (`/admin/roles`) link
  (same condition as today).
- **Sign out**: hosts the existing `'use server'` `signOut({ redirectTo: '/signin' })` action,
  unchanged.

## Non-regression guarantees

- Catalog + search logic byte-for-byte unchanged → the route move does **not** touch
  `tests/integration/catalog-filters.test.ts`, `tests/integration/search.test.ts`, or
  `tests/unit/search.test.ts` (they exercise the read libs, not the route). SC-005.
- No new access rule; `/registry` inherits the same `requireSession()` gate as `/`.

## Acceptance mapping

- US3 AS1–AS4 → catalog reachable at `/registry` from nav; search works there; consistent nav on
  every page; `/news` & `/events` back-links land on `/registry`.
