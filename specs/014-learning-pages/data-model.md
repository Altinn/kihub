# Data Model: Learning Pages (KI Læring)

**Feature**: `014-learning-pages` | **Date**: 2026-08-10

Four new Payload collections. **Additive only** — no existing collection, global or field changes.
Native platform content, fully Payload-owned (Constitution v3.1.0, Principle II); not artifacts, so
the Registry principles (I, III, IV, V, VI) do not apply.

```
learning-categories ──1:N──> learning-subcategories
        │                              │
        └──────────1:N────> learning-pages <──0..1──┘
                                  │
                                  └── body (richText) ──> media (upload nodes)
```

---

## `learning-categories`

Top-level grouping. Its `description` is what the `/laering` overview renders (FR-007).

| Field | Type | Rules |
|---|---|---|
| `title` | text | required |
| `slug` | text | unique, indexed; derived from `title` by `beforeValidate` when blank (FR-011) |
| `description` | textarea | optional; shown on the overview. Empty ⇒ the overview shows the title only |
| `order` | number | `defaultValue: 100`, admin sidebar (FR-015, research §8) |

- **useAsTitle**: `title`. **defaultColumns**: `title`, `order`, `slug`.
- **Sort**: `['order', 'title']` everywhere.
- **Access**: read → everyone; create/update/delete → Contributor+ (`isEditor`).
- **`beforeDelete`**: refuse when any `learning-subcategories` or `learning-pages` reference it,
  with a Norwegian `APIError` naming the count (FR-016).

## `learning-subcategories`

Second and final level of grouping.

| Field | Type | Rules |
|---|---|---|
| `title` | text | required |
| `slug` | text | unique, indexed; derived from `title` when blank |
| `category` | relationship → `learning-categories` | **required**, `hasMany: false` — a subcategory belongs to exactly one category (FR-013) |
| `order` | number | `defaultValue: 100` |

- **Access**: as above. **`beforeDelete`**: refuse when any page references it (FR-016).
- There is deliberately **no** `subcategory` field here — that absence is what makes deeper nesting
  impossible (FR-013), rather than a validation rule that could be bypassed.

## `learning-pages`

The unit employees read.

| Field | Type | Rules |
|---|---|---|
| `title` | text | required |
| `slug` | text | unique, indexed; derived from `title` when blank, stable across title edits (FR-011) |
| `category` | relationship → `learning-categories` | **required**, `hasMany: false` (FR-013) |
| `subcategory` | relationship → `learning-subcategories` | optional, `hasMany: false`; `filterOptions` restricts choices to the selected category (FR-014) |
| `summary` | textarea | optional; used as the page lead and the overview link description |
| `body` | richText | **required**; lexical, see [contracts/learning-editor.md](./contracts/learning-editor.md) |
| `status` | select `draft` \| `published` | required, `defaultValue: 'draft'` (FR-017) |
| `order` | number | `defaultValue: 100` |
| `author` | relationship → `users` | stamped on create by `beforeChange`; not surfaced to employees (spec Assumptions) |

- **useAsTitle**: `title`. **defaultColumns**: `title`, `status`, `category`, `order`, `updatedAt`.
- **Access** (mirrors `collections/News.ts:27-33` exactly):
  - `read`: `isEditor(req.user) ? true : { status: { equals: 'published' } }` — API-path defence in
    depth for FR-032.
  - `create`/`update`/`delete`: `isEditor(req.user)` (FR-031).
- **`beforeValidate`**: derive `slug` from `title` when blank (reuses `lib/slug.ts`); reject a
  `subcategory` whose `category` differs from the page's `category` (FR-014, research §7).
- **`beforeChange`**: stamp `author` on create.
- **Last updated (FR-018)**: uses Payload's built-in `updatedAt` — no field of our own. Payload adds
  `createdAt`/`updatedAt` by default (`timestamps` defaults to true), so this is free and always
  correct.

### Why no `publishDate`

News needs one because the archive is ordered by publication date. Learning pages are ordered
editorially by `order` (FR-015) and display "last updated" (FR-018), which `updatedAt` already gives.
Adding a `publishDate` would be a second date field with no reader and no requirement — declined per
Principle VII.

## `media` (upload collection)

General platform capability; this feature is its first consumer (spec Assumption 5).

| Field | Type | Rules |
|---|---|---|
| *(file)* | upload | `mimeTypes: ['image/png','image/jpeg','image/webp','image/avif']` — raster only, **no SVG** (FR-022) |
| `alt` | text | **required** — the asset's intrinsic description (FR-021) |
| `caption` | text | optional, rendered as `<figcaption>` |

- **`upload` config**: `imageSizes` for the content column (≈760 / 1520 px wide) + an admin thumb;
  `focalPoint: false`; `crop: false`; 5 MB size limit (FR-022, FR-023).
- **Access**: `read` → everyone (an image referenced by a published page must be fetchable);
  `create`/`update`/`delete` → Contributor+ (FR-031).
- **Storage**: env-selected, `MEDIA_STORAGE_MODE=disk|azure` — see
  [contracts/media-storage.md](./contracts/media-storage.md).
- **`decorative` is NOT here**: it is a per-placement property on the upload *node* inside a page
  body, because the same asset can be meaningful on one page and decorative on another
  (research §5).

---

## Derived, not stored: the resource-navigation tree

Assembled in memory by `buildLearningTree()` in `lib/learning-view.ts` — a pure function, no Payload
import, unit-testable (research §9).

```ts
interface LearningTreePage   { title: string; slug: string; href: string; isCurrent: boolean }
interface LearningTreeGroup  { title: string; pages: LearningTreePage[] }          // a subcategory
interface LearningTreeCategory {
  title: string; slug: string; description: string;
  pages: LearningTreePage[];        // pages directly under the category, before the groups
  groups: LearningTreeGroup[];      // subcategory groups
  containsCurrent: boolean;         // drives <details open> (FR-004)
  href: string;                     // entry link for the overview → its first page
}
type LearningTree = LearningTreeCategory[];
```

**Assembly rules** (each one a unit test):

1. Categories in `order`, then `title`; same for subcategories and pages.
2. A page attaches to its subcategory group when it has one, otherwise to the category's own
   `pages`. Ungrouped pages render **before** the groups (spec Edge Cases).
3. A subcategory group with zero published pages is dropped; a category with zero published pages
   anywhere beneath it is dropped entirely (FR-008).
4. `containsCurrent` is true for the category holding the current page, so the server can emit
   `<details open>` (FR-004) with no client JS.
5. Input pages are already `status: published` — the read layer guarantees it (FR-032); the tree
   function never filters on status, so it cannot become a second, drifting source of that rule.

## Address space (FR-010)

| Address | Renders |
|---|---|
| `/laering` | overview: heading + one section per category (`description`, entry link) |
| `/laering/<page-slug>` | that learning page + the sidebar |

The category and subcategory are **not** in the address — moving a page between groups never breaks
a shared link (spec Assumption 1). Category/subcategory `slug`s exist for stable identity and
possible future addressing, and are unused by the router today.

## Validation rules → requirement map

| Rule | Where enforced | Requirement |
|---|---|---|
| Slug derived, unique, stable | `beforeValidate` + `unique: true` | FR-011 |
| Exactly two grouping levels | no `subcategory` field on subcategories; `hasMany: false` refs | FR-013 |
| Subcategory belongs to page's category | `filterOptions` (UX) + `beforeValidate` (API) | FR-014 |
| Deterministic order | `sort: ['order','title']`, `defaultValue: 100` | FR-015 |
| No orphaned content on delete | `beforeDelete` on both grouping collections | FR-016 |
| Employees see published only | `read` access rule + always-`PUBLISHED` read layer | FR-017, FR-032 |
| Contributor+ writes | `create`/`update`/`delete` access rules | FR-031 |
| Raster-only, size-capped uploads | `mimeTypes` + size validate | FR-022 |
| Alt text present | required `alt` + per-node `decorative` | FR-021 |

## Migration

One generated, additive migration (research §13): four tables plus Payload's relationship tables,
registered as the third entry in `src/migrations/index.ts` so `prodMigrations` applies it at boot.
`down` drops only the new tables. Nothing in `artifacts`, `news`, `events`, `users` or the globals is
altered (SC-012).
