# Contract: News page UI (013)

Covers the URL contract, component boundaries, CSS block, copy, and accessibility for `/news` and
`/news/<slug>`. Styling is token-only (constitution Design System constraint §2/§3).

---

## A. URL contract

| Address | Renders |
|---|---|
| `/news` | page 1 (canonical — no query string) |
| `/news?page=N` | page N, clamped to the last page when beyond the end |
| `/news?page=<malformed>` | page 1 (never an error, FR-010) |
| `/news/<slug>` | one published article; draft/unknown → 404 |

`page` is the **only** parameter this surface reads. Unknown parameters are ignored, not rejected.
Both pages are server components; no client component is added by this feature (FR-018).

---

## B. Components

### B.1 `components/NewsCard.tsx` — REWRITTEN (was the Designsystemet card)

```tsx
export function NewsCard({
  article,                    // News
  headingLevel = 2,           // 2 | 3
}: { article: News; headingLevel?: 2 | 3 })
```

Structure — one `<Link>` wrapping an `<article class="kihub-stack">` (FR-003):

```
Link  href=/news/<slug>  class=kihub-focusable          ← the ONLY link in the card
└── article.kihub-stack
    ├── div.kihub-media[.kihub-media--placeholder]  aspect-ratio 16/10
    │   └── img  src=heroImageUrl  alt=""            ← only when heroImageUrl is set
    ├── h2|h3.kihub-h4            {title}
    ├── p                          {formatNewsDate(publishDate)}   ← omitted when ''
    └── p                          {summary}                       ← omitted when absent
```

- `heroImageUrl` absent → `.kihub-media--placeholder` (tinted well, dashed accent border) at the
  same 16:10 ratio, so rows stay aligned (FR-002, FR-004, US1-4).
- `heroImageUrl` broken → the tinted well shows through the failed image; no layout collapse
  (US1-5). Requires `alt=""` and the well's own background, both already the case.
- `alt=""`: hero images are decorative; the headline is the accessible name of the link.
- `img` keeps the `eslint-disable-next-line @next/next/no-img-element` comment — hero images are
  arbitrary external URLs, managed uploads deferred (007 research §6).
- Behaviour and markup are carried over verbatim from `FrontpageNewsCard`, which is **deleted**; the
  only additions are the `headingLevel` prop and importing `formatNewsDate` from the pure module.

### B.2 `components/NewsPagination.tsx` — NEW

```tsx
export function NewsPagination({ pagination }: { pagination: NewsPagination })
```

- Returns `null` when `pagination.visible === false` (FR-009).
- `<nav aria-label="Paginering" class="news-pagination">` containing, in order: previous, the
  position indicator, next.
- Actionable control → `<Link class="news-pagination__btn kihub-focusable">`; non-actionable →
  `<span class="news-pagination__btn news-pagination__btn--off" aria-disabled="true">` (a span, not
  a disabled link, so it is not focusable).
- Labels: `‹ Forrige`, `Neste ›`, indicator `Side X av Y` in `.news-pagination__label` with
  `aria-current="page"`.
- Link-based, server-rendered → works with scripting disabled (FR-007, SC-003), the same pattern as
  012's `EventsViewToggle` / month nav.

### B.3 `app/(app)/news/page.tsx` — REBUILT

```tsx
export default async function NewsListPage({ searchParams }: { searchParams: Promise<SearchParams> })
```

```
main.kihub-container
└── div.kihub-section
    ├── h1.kihub-h1                      "Nyheter"
    ├── (empty state) OR div.news-grid   → NewsCard headingLevel=2, one per article
    └── NewsPagination
```

- `parseNewsPageParam(sp.page)` → `listPublishedNewsPage(page)` → `buildPagination(...)`.
- Empty archive → `div.news-empty` with `<p class="kihub-h3">Ingen nyheter ennå</p>` and a
  supporting line; no pagination bar.
- The stale `← Back to catalog` link and the English `News` / `Internal news and announcements.`
  copy are removed (FR-001).

### B.4 `app/(app)/news/[slug]/page.tsx` — RESTYLED

```
main.kihub-container
└── article.kihub-section.news-detail
    ├── p.news-detail__back        → Link "← Til nyheter"
    ├── h1.news-detail__title      {title}
    ├── p.news-detail__meta        {byline} · {formatNewsDate(publishDate)}
    ├── ul.news-detail__tags       {tags}            ← omitted when empty
    ├── div.kihub-media            img heroImageUrl  ← omitted when absent
    └── div.news-detail__body.kihub-prose  → RichText data={body}
```

- Byline: `author.name || author.email || 'KI Hub'` (unchanged logic), Norwegian framing: `Av
  {byline} · {date}`.
- Tags render as token-styled `<li>` chips, **not** Designsystemet `Tag` components — the page drops
  its `@digdir/designsystemet-react` imports entirely, matching what 012 did to the event detail
  page.
- No `Divider`; separation is spacing and the token border, per the kihub layer.
- 404 behaviour unchanged (FR-014, US3-4).

---

## C. CSS: the `.news-*` block in `styles/portal.css`

Appended as a new block after the `.ev-*` block. Tokens only — no literal colours, type sizes, or
spacing values; no new `--kihub-*` tokens.

```
.news-grid                      2 cols → 1 col at max-width 719px, minmax(0, 1fr)
                                gap: var(--kihub-space-10) var(--kihub-space-6)   [.fp-news parity]
.news-empty                     grid, gap var(--kihub-space-3)
.news-pagination                flex, centred, gap var(--kihub-space-4),
                                margin-top var(--kihub-space-12), border-top var(--kihub-border-subtle)
.news-pagination__btn           ui font, accent colour, radius, padding
.news-pagination__btn--off      var(--kihub-text-subtle), cursor default
.news-pagination__label         ui font, var(--kihub-text-subtle)
.news-detail                    max-width var(--kihub-prose-width)
.news-detail__back              margin-bottom var(--kihub-space-8)
.news-detail__title             font-size var(--kihub-font-size-h2)
.news-detail__meta              ui font, var(--kihub-text-subtle)
.news-detail__tags              flex wrap, chip children on var(--kihub-surface-accent)
.news-detail__body              margin-top var(--kihub-space-8)
```

`minmax(0, 1fr)` plus normal text wrapping is what keeps a long unbroken headline from forcing a
horizontal scrollbar (FR-004, SC-004) — the fix pattern from 012's `918d7d6`.

---

## D. Norwegian copy (complete inventory)

| Location | String |
|---|---|
| List heading | `Nyheter` |
| Empty state heading | `Ingen nyheter ennå` |
| Empty state body | `Det er ingen publiserte nyheter akkurat nå. Kom tilbake senere.` |
| Pagination region label | `Paginering` |
| Previous / next | `‹ Forrige` / `Neste ›` |
| Position indicator | `Side {X} av {Y}` |
| Detail back link | `← Til nyheter` |
| Detail byline prefix | `Av ` |

No English strings remain on either page (SC-005).

---

## E. Accessibility

- **One link per card** covering the whole card; no nested interactive elements (FR-003).
- Visible focus ring via `.kihub-focusable` on every card and pagination link.
- Heading order: list page `h1` "Nyheter" → card `h2`s. Frontpage keeps `h2` "Siste nytt" → card
  `h3`s (the `headingLevel` prop exists for exactly this).
- Hero images are decorative (`alt=""`); the headline carries the link's accessible name.
- Pagination is a labelled `<nav>`; the current position is announced via `aria-current="page"`;
  unavailable directions are non-focusable spans with `aria-disabled="true"` rather than links.
- Colour is never the sole carrier of meaning on these surfaces (no categorical colour is used).
