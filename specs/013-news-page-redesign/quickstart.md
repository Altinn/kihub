# Quickstart: News Page Redesign (Nyheter)

Validation guide for 013. Contracts: [news-read-v2](contracts/news-read-v2.md),
[news-page-ui](contracts/news-page-ui.md). Data shape: [data-model](data-model.md).

## Prerequisites

```bash
colima start && docker compose up -d          # local Postgres (kihub-postgres, port 55432)
pnpm install
pnpm --filter web dev                          # no migration needed — 013 changes no schema
```

Tests need the env **exported**, not just sourced:

```bash
set -a; source apps/web/.env; set +a
```

## Automated validation

```bash
set -a; source apps/web/.env; set +a && pnpm --filter web test
```

Expected: full suite green — 187 pre-existing tests plus the new `unit/news-view.test.ts` cases and
the extended `integration/news-access.test.ts` pagination cases. Then lint and type check:

```bash
pnpm --filter web lint && pnpm --filter web build
```

## Seeding

Author in `/cms` as a Contributor+ user. To exercise every branch, create:

- **14+ published articles** with distinct `publishDate` values (more than one page of 12), most with
  a `heroImageUrl` and a `summary`
- **one with no `heroImageUrl`** → placeholder well
- **one with a deliberately broken `heroImageUrl`** (e.g. `https://example.invalid/x.jpg`)
- **one with no `summary`**
- **one with a very long headline** (80+ characters, including one unbroken 40-character token)
- **two sharing the same `publishDate`** → exercises the tiebreaker
- **one draft**
- **one with `featured` checked** → must *not* jump to the top

## Manual scenarios

1. **Grid** — open `/news`: cards show image → headline → date ("22. juni 2026") → summary, in that
   order, two per row. Ordering is strictly newest-first; the featured article sits in date order,
   not at the top. The draft is absent. Copy is Norwegian only; no "Back to catalog" link.
2. **Degraded cards** — the image-less article shows the tinted dashed placeholder well at the same
   16:10 ratio; the broken-image article shows the tinted well with no layout shift; the
   summary-less article ends cleanly after the date. All rows stay aligned.
3. **Whole-card link** — click the image, then the headline, then the date, then the summary of the
   same card: each lands on that article. Tab through the grid — one stop per card, with a visible
   focus ring.
4. **Pagination** — with 14+ articles, page 1 shows 12 and the bar reads "Side 1 av 2" with
   `‹ Forrige` inert. `Neste ›` → `/news?page=2`, "Side 2 av 2", `Neste ›` now inert. Walk 1 → last
   → 1 and confirm no article appears twice and none is missing at the boundary.
5. **Pagination absent** — unpublish down to ≤12 articles: the bar disappears entirely (not a
   disabled bar).
6. **Address robustness** — each of `?page=0`, `?page=-3`, `?page=abc`, `?page=1.5`, `?page=`,
   `?page=2&page=9` renders a valid page (first page, except the repeated one which renders page 2);
   `?page=999` renders the **last** page. No error page, no empty grid.
7. **No-JS** — disable JavaScript: paging forward and back still works (plain links).
8. **Responsive** — at 360 px width: one column, no horizontal scrolling anywhere, long headline
   wraps inside its card. Check 719/720 px, the grid breakpoint.
9. **Detail page** — open an article: kihub typography, `Av <byline> · <date>`, hero image, tag
   chips, rich-text body, `← Til nyheter` back link. An article with no image / no tags omits those
   sections with no empty frames. A draft slug and a nonsense slug both 404.
10. **Timezone** — an article with `publishDate` `2026-06-22T22:30:00Z` must read **23. juni 2026**
    on both the card and the detail page (Oslo, not UTC).
11. **No regressions** — the frontpage "Siste nytt" section still shows the four newest articles in
    the same style, and every previously bookmarked `/news/<slug>` still resolves.

## Definition of done

- Suite green (187 + new), lint clean, production build clean.
- Scenarios 1–11 pass.
- `git grep -nE "Back to catalog|No news yet|Internal news" apps/web/src` returns nothing.
- No new runtime dependency in `apps/web/package.json`; no new file under `src/migrations/`.
