# Contract: `/prosjekter` employee-facing routes

Access-gated the same way as every other `(app)` route — `(app)/layout.tsx`'s `requireSession()`
(employees only); no additional role check (published Projects are readable by all employees, same
posture as News/Learning).

## `GET /prosjekter` — list page

- Renders every `published` project via `listPublishedProjects()`, ordered by `order` ascending.
- Each entry shows at minimum `title` and `summary` (FR-004), as a card linking to
  `/prosjekter/<slug>` — modeled 1:1 on `NewsCard`/`news-grid`.
- **Empty state** (FR-008): zero published projects → a clear "ingen prosjekter ennå"-style message
  in place of the grid, not an error or blank page — same pattern as `/news`'s `.news-empty` block.
- No `?page=` query param / pagination in this iteration (see research.md).

## `GET /prosjekter/[slug]` — detail page

- Resolves via `getPublishedProjectBySlug(slug)`.
- Found → renders `title` + full `body` (rich text) + a back-link to `/prosjekter` (FR-005),
  modeled on the News detail page (byline/tags/hero-image sections are NOT carried over — no such
  fields on `Project`).
- Not found OR draft slug → Next.js `notFound()` → standard 404 (FR-009); never renders draft
  content.

## Frontpage tile contract (existing surface, behavior change only)

- `DEFAULT_FRONTPAGE.tiles` entry titled "KI Prosjekter i BOD": `href` changes from `/registry` to
  `/prosjekter` (FR-001).
- `DEFAULT_FRONTPAGE.tiles` entry titled "Verktøy": `href` stays `/registry`, unchanged (FR-002).
- An environment where an editor has already customized the `frontpage` global in `/cms` is
  **not** retroactively changed by this code default — same documented caveat as the existing
  `DEFAULT_SITE_CHROME.nav` comment (`site-content-defaults.ts:66-70`). Editors who already saved
  a custom frontpage must update the tile's link in `/cms` themselves.
