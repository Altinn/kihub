# Contract: Learning read layer and view helpers

**Feature**: `014-learning-pages` | Consumers: `app/(app)/laering/*`

Mirrors the `lib/news.ts` / `lib/news-view.ts` split (013 `contracts/news-read-v2.md`): §A touches
Payload and always filters to published; §B is pure and unit-testable with no Payload import.

---

## §A `lib/learning.ts` — the read layer

Every function returns **only published pages by construction**. The collection `read` access rule is
the second line of defence for the API path (FR-032, the `lib/news.ts` posture).

```ts
const PUBLISHED = { status: { equals: 'published' } } as const;
```

### `readLearningLibrary(): Promise<LearningLibrary>`

The three flat reads behind the sidebar and the overview (research §9). **Exactly three queries, for
any library size** — no per-category query, no relationship population.

```ts
interface LearningLibrary {
  categories: LearningCategory[];     // sort ['order','title']
  subcategories: LearningSubcategory[]; // sort ['order','title']
  pages: LearningPageRef[];           // PUBLISHED, sort ['order','title'], depth: 0
}

/** Only what the tree needs; `category`/`subcategory` stay as ids because of `depth: 0`. */
interface LearningPageRef {
  id: string; title: string; slug: string;
  category: string; subcategory?: string | null;
}
```

Guarantees:

| # | Guarantee | Requirement |
|---|---|---|
| A1 | `pages` contains only `status: 'published'` documents | FR-017, FR-032 |
| A2 | Exactly three Payload queries regardless of document count; `depth: 0` on the pages read so no related document is populated | SC-010 |
| A3 | All three arrays are pre-sorted `order` then `title` | FR-015 |
| A4 | `limit` is set high enough to hold the whole library in one read (200 per collection, the `listPublishedNews` precedent) and is a single named constant | SC-002 |

### `getPublishedLearningPageBySlug(slug: string): Promise<LearningPage | null>`

Returns `null` for a draft or unknown slug — the page then calls `notFound()` (FR-012). Identical in
shape to `getPublishedNewsBySlug`. Populates `body` upload nodes so images render (default depth is
sufficient; the upload node carries the media document).

---

## §B `lib/learning-view.ts` — pure view logic

No Payload import. Everything here is directly unit-testable (research §15).

### `buildLearningTree(library, currentSlug?): LearningTree`

Shapes in [data-model.md](../data-model.md#derived-not-stored-the-resource-navigation-tree).

| # | Guarantee | Requirement |
|---|---|---|
| B1 | Categories, groups and pages preserve `order`-then-`title` ordering | FR-015 |
| B2 | A page with a `subcategory` lands in that group; otherwise in the category's own `pages` | FR-002 |
| B3 | Ungrouped pages are emitted **before** subcategory groups | spec Edge Cases |
| B4 | A group with no pages is omitted; a category with no pages anywhere beneath it is omitted | FR-008 |
| B5 | `containsCurrent` is true for exactly the category holding `currentSlug` (false for all when absent) | FR-004 |
| B6 | `isCurrent` is true for exactly the page whose slug is `currentSlug` | FR-003 |
| B7 | A page whose `category` id resolves to no category is dropped, never rendered as a broken entry | spec Edge Cases |
| B8 | `category.href` points at that category's first page, or is absent when it has none | FR-007 |
| B9 | Never filters on `status` — the read layer owns that rule, so it exists in exactly one place | FR-032 |

### `learningPageHref(slug: string): string`

`/laering/<slug>`. The single place the address shape is expressed (FR-010).

### `formatLearningUpdated(updatedAt: string): string`

nb-NO long form in `Europe/Oslo` — "10. august 2026". The explicit `timeZone` is load-bearing: a page
saved at 00:30 Oslo time belongs to that Oslo calendar day, not the previous UTC one (FR-018).
Mirrors `formatNewsDate` exactly; returns `''` for a missing value so callers can omit the line.

### `LEARNING_CODE_LANGUAGES: Record<string, string>`

The curated language map (research §2). One constant, two consumers: the `CodeBlock` factory's
`languages` option (admin) and the highlighter's grammar set (employee surface). Same ids on both
sides, so no translation table exists to drift.

---

## §C What this contract deliberately does not include

- **No pagination.** The sidebar shows the whole library; a learning library is browsed by structure,
  not paged (contrast 013, where the archive grows without bound).
- **No search.** Explicitly out of scope; `lib/search.ts` stays artifact-only and untouched
  (FR-039, research §14).
- **No category/subcategory-addressed reads.** Nothing resolves a page by category path, because the
  address space has no such shape (FR-010).
