# Contract: News read layer + pure view module (013)

Supersedes the read-layer half of `specs/007-news/contracts/news-read.md` for the list surface. The
single-article read is unchanged.

---

## A. `lib/news.ts` — read layer

### A.1 `listPublishedNews(): Promise<News[]>` — MODIFIED

```ts
export async function listPublishedNews(): Promise<News[]>
```

- Returns published articles only, `sort: '-publishDate'`, `limit: 200`, `overrideAccess: true`.
- **Change from 007**: the trailing stable sort that boosted `featured` articles to the front is
  **removed**; the result is strictly newest-first.
- **Sole remaining consumer**: the frontpage (`app/(app)/page.tsx`), which pipes the result through
  `selectLatestNews` — a strict date re-sort — so frontpage output is provably unchanged (FR-017).
- Rationale for the change: research §9 (no surface consumed the boost after this feature).

### A.2 `listPublishedNewsPage(page: number): Promise<NewsPage>` — NEW

```ts
export interface NewsPage {
  articles: News[];    // this page's articles, newest-first
  page: number;        // the page actually returned, AFTER clamping (1-based)
  totalPages: number;  // 0 when the archive is empty
  totalDocs: number;   // published articles in the whole archive
}

export async function listPublishedNewsPage(page: number): Promise<NewsPage>
```

**Behaviour**

1. Queries `payload.find({ collection: 'news', where: { status: { equals: 'published' } },
   sort: '-publishDate', page, limit: NEWS_PAGE_SIZE, overrideAccess: true })`.
2. **Out-of-range clamp**: if the result is empty while `totalPages > 0` and `page > totalPages`,
   re-queries at `page: totalPages` and returns that. One query in the normal case; two only for an
   out-of-range request (research §5).
3. Empty archive (`totalDocs === 0`) → `{ articles: [], page: 1, totalPages: 0, totalDocs: 0 }`.
4. `page` is assumed already sanitised by `parseNewsPageParam` (a positive integer); the clamp
   guards the upper bound only.

**Guarantees**
- Never returns a draft article (published-only `where`, plus the collection's own `read` rule as
  defence in depth) — FR-012.
- Never throws for an addressable page value — FR-010.
- For a fixed archive state, concatenating pages `1..totalPages` yields every published article
  exactly once, newest-first — FR-006, SC-001 (rests on the data layer's `-createdAt` tiebreaker,
  research §4).

### A.3 `getPublishedNewsBySlug(slug): Promise<News | null>` — UNCHANGED

Draft or unknown slug → `null` → the page calls `notFound()`.

---

## B. `lib/news-view.ts` — NEW pure module

No Payload imports, no I/O — unit-testable in isolation (`lib/events-view.ts` precedent).

### B.1 Constants

```ts
export const NEWS_PAGE_SIZE = 12;
```

### B.2 `parseNewsPageParam`

```ts
export function parseNewsPageParam(
  raw: string | string[] | undefined,
): number   // always a positive integer, defaulting to 1
```

| Input | Result | Covers |
|---|---|---|
| `undefined`, `''` | `1` | no param / empty |
| `'1'`, `'7'` | `1`, `7` | normal |
| `'0'`, `'-3'` | `1` | non-positive |
| `'abc'`, `'1.5'`, `'2e3'`, `' '` | `1` | non-integer |
| `['2', '9']` | `2` | repeated param — first entry wins (012 precedent) |
| `'999'` | `999` | in-range check is the read layer's job, not the parser's |

Upper-bound clamping is deliberately **not** here: the parser cannot know `totalPages`.

### B.3 `buildPagination`

```ts
export interface NewsPagination {
  page: number; totalPages: number; totalDocs: number;
  hasPrev: boolean; hasNext: boolean;
  prevHref?: string; nextHref?: string;
  label: string;      // "Side X av Y"
  visible: boolean;   // totalPages > 1
}

export function buildPagination(page: number, totalPages: number, totalDocs: number): NewsPagination
```

- `pageHref(1)` → `/news` (no query string); `pageHref(n>1)` → `/news?page=n`.
- `visible === false` when `totalPages <= 1` → the component renders nothing (FR-009).
- `label` is always `Side ${page} av ${Math.max(totalPages, 1)}`.

### B.4 `formatNewsDate`

```ts
export function formatNewsDate(publishDate?: string | null): string   // '' when absent
```

`Intl.DateTimeFormat('nb-NO', { timeZone: 'Europe/Oslo', day: 'numeric', month: 'long', year:
'numeric' })` → e.g. `22. juni 2026`. The explicit `timeZone` is load-bearing: an article stored at
`2026-06-22T22:30:00Z` must read `23. juni 2026` (FR-013). Moved here from `FrontpageNewsCard` so
the list and detail pages share one formatter — the detail page's current
`toLocaleDateString('nb-NO', …)` has no `timeZone` and renders in the server's zone (research §6).

---

## C. Consumer map

| Consumer | Uses |
|---|---|
| `app/(app)/news/page.tsx` | `parseNewsPageParam` → `listPublishedNewsPage` → `buildPagination` |
| `app/(app)/news/[slug]/page.tsx` | `getPublishedNewsBySlug`, `formatNewsDate` |
| `app/(app)/page.tsx` (frontpage) | `listPublishedNews` → `selectLatestNews` (unchanged) |
| `components/NewsCard.tsx` | `formatNewsDate` |
| `tests/unit/news-view.test.ts` | the whole pure module |
| `tests/integration/news-access.test.ts` | `listPublishedNewsPage` behaviour + draft invariant |
