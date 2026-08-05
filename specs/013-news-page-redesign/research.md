# Phase 0 Research: News Page Redesign (013)

All decisions below are grounded in the code as it stands at `918d7d6` (012 complete). No open
NEEDS CLARIFICATION items remain.

---

## §1 The reference design already exists in the codebase

**Decision**: The card in the user's screenshot of the old KI HUB news page is, component for
component, the card `components/FrontpageNewsCard.tsx` renders today for the frontpage "Siste nytt"
section: `.kihub-media` well at `aspect-ratio: 16 / 10` (falling back to
`.kihub-media--placeholder`), `.kihub-h4` serif title, 13px nb-NO date line in
`--kihub-text-subtle`, 16px display-font summary — the whole card one `<Link>` with
`kihub-focusable`. The grid is `.fp-news` in `styles/portal.css`:
`grid-template-columns: repeat(2, minmax(0, 1fr))` collapsing to `1fr` at `max-width: 719px`.

**Rationale**: 013 is therefore not a design problem but a **reuse** problem: the correct card and
the correct 2-up/1-up grid behaviour are already written, tested by eye on the frontpage, and
token-pure. Re-deriving them for `/news` would create two components that must be kept visually
identical forever.

**Alternatives considered**:
- *Write a separate `NewsListCard`*: rejected — guaranteed drift between frontpage and list card.
- *Reuse `FrontpageNewsCard` under its current name*: rejected — the name would be a lie at the
  second call site, and its hardcoded `<h3>` is the wrong heading level under the list page's `<h1>`.

---

## §2 Component consolidation: one card, two call sites

**Decision**: Rewrite `components/NewsCard.tsx` as the token-layer media card (a `headingLevel`
prop, `2 | 3`, default `2`), delete `components/FrontpageNewsCard.tsx`, and point both
`app/(app)/page.tsx` (level 3) and `app/(app)/news/page.tsx` (level 2) at it.

**Rationale**: `NewsCard.tsx` is currently the *pre-redesign* Designsystemet card (`Card`,
`Heading`, `Tag` chips for tags + "Featured") whose only consumer is the news list page being
rebuilt — so it is being replaced anyway. Taking over that filename leaves exactly one news card in
the tree instead of two, and the heading level becomes a prop rather than a fork. Verified consumers
before deciding: `FrontpageNewsCard` is imported only by `app/(app)/page.tsx:4`; `NewsCard` only by
`app/(app)/news/page.tsx:3`. **No test file references either component**, so the rename carries no
test churn.

**Heading levels**: frontpage cards sit under the `<h2>` "Siste nytt" section heading → `h3`. List
page cards sit under the page `<h1>` "Nyheter" with no intervening section heading → `h2`.

**Alternatives considered**:
- *Keep both files, have `FrontpageNewsCard` re-export `NewsCard`*: rejected — an indirection file
  with no behaviour is worse than an import change at one call site.

---

## §3 Pagination mechanism: Payload's own paginated find

**Decision**: Page with `payload.find({ page, limit })` and read `totalPages` / `totalDocs` off the
returned `PaginatedDocs`. Page size 12, defined once as `NEWS_PAGE_SIZE` in the new pure module.

**Rationale**: Verified in the installed Payload 3.85.2 types — `payload.find` accepts `limit` and
`page` ("Get a specific page number"), and `PaginatedDocs`
(`payload/dist/database/types.d.ts:568`) returns `docs`, `totalDocs`, `totalPages`, `page`,
`hasNextPage`, `hasPrevPage`, `nextPage`, `prevPage`. Everything the pagination UI needs (FR-008)
comes from one query — no separate count query, no offset arithmetic in application code.

**Alternatives considered**:
- *Fetch all 200 and slice in the page component*: rejected — pushes the whole archive over the
  wire on every request and puts the page-count contract in two places.
- *`limit: 0` + manual offset*: rejected — reimplements what the data layer already does.

---

## §4 Sort determinism and the NULL-date trap (informs FR-005)

**Decision**: Sort `-publishDate` and rely on the data layer's automatic `-createdAt` tiebreaker.
Accept Postgres' NULLS-FIRST placement for the (back-office-unreachable) date-less article.

**Rationale**: Two findings from reading the actual sort builder,
`@payloadcms/drizzle/dist/queries/buildOrderBy.js`:

1. **Determinism is free.** The builder appends a fallback sort (`-createdAt` when the table has
   it, else `-id`) to every sort that does not already include it. Two articles sharing a
   `publishDate` therefore have a stable total order, which is precisely the property offset
   pagination needs to avoid skipping or repeating rows at page boundaries (FR-005, SC-001).
   Without this, same-day articles could shuffle between requests.
2. **NULLs sort FIRST, not last.** The builder emits a plain drizzle `desc(column)`, and Postgres'
   default for `DESC` is `NULLS FIRST`. A published article with no `publishDate` would land at the
   *top* of page 1 — the opposite of what an earlier draft of FR-005 asserted. `buildOrderBy`
   supports a `rawSort` escape hatch, but it is **not exposed** on the public
   `payload.find` options (checked `collections/operations/local/find.d.ts` and
   `database/types.d.ts`), so `NULLS LAST` is unreachable without dropping to raw SQL.

The mitigating fact: `collections/News.ts` has a `beforeChange` hook that stamps
`publishDate = now` whenever `status === 'published'` and the date is empty. Since every read on
this surface filters `status: published`, a NULL `publishDate` cannot be produced through the CMS —
only by direct database manipulation. **FR-005 and the corresponding edge case in the spec were
rewritten** to guarantee determinism and reachability rather than a specific null position, instead
of leaving the spec asserting something the stack cannot deliver.

**Alternatives considered**:
- *Raw SQL / a custom `rawSort` path*: rejected — a database-dialect-specific escape hatch to order
  a state that cannot occur; fails "start simple" (Principle VII).
- *Filter `publishDate: { exists: true }`*: rejected — would silently hide such an article, which
  FR-005 explicitly forbids.
- *Sort by `-createdAt` instead*: rejected — creation order is not publication order; an article
  drafted in March and published in July would sort wrongly.

---

## §5 Out-of-range and malformed `?page=` handling

**Decision**: Parse in a pure helper; clamp in the read layer.

- **Malformed** (`0`, `-3`, `abc`, `1.5`, empty, or a repeated param arriving as an array) → page 1.
  A repeated `?page=2&page=9` arrives as `string[]`; take the first entry, consistent with how
  `parseEventsSearchParams` handles repeated `view`/`month` in 012.
- **Out of range** (`?page=999` on a 5-page archive) → clamp to the **last** page. Payload returns
  `docs: []` with a correct `totalPages` for an over-range page, so the read layer detects
  `docs.length === 0 && totalPages > 0 && page > totalPages` and re-queries at `totalPages`. Two
  queries, only in the pathological case; one query on every normal request.

**Rationale**: Clamping to the last page is the more useful recovery for "beyond the end" than
bouncing to page 1 — the reader asked for the far end of the archive. Doing it in the read layer
(rather than a `redirect()`) keeps the page component a pure render of whatever the read layer
returns and avoids a second HTTP round trip; the honest cost is that the address can then show
`?page=999` while page 5 renders, which is acceptable for a read surface and keeps the
"never an error, never an empty grid" guarantee (FR-010) in one place.

**Alternatives considered**:
- *`redirect()` to the clamped page*: rejected — cleaner address, but adds a full round trip to
  every malformed request and moves control flow into the page component. Recorded as the
  alternative to pick if address correctness ever matters more than the round trip.
- *404 on out-of-range*: rejected — FR-010 forbids it.

---

## §6 Norwegian copy and date formatting

**Decision**: Reuse the existing `Intl.DateTimeFormat('nb-NO', { timeZone: 'Europe/Oslo', day:
'numeric', month: 'long', year: 'numeric' })` formatting already in `FrontpageNewsCard`, moved into
the pure module as `formatNewsDate`. Copy: page heading "Nyheter"; pagination "Forrige" / "Neste" /
"Side X av Y" with `aria-label="Paginering"`; empty state "Ingen nyheter ennå"; detail back link
"← Til nyheter" (mirroring 012's "← Til arrangementer").

**Rationale**: Explicit `timeZone: 'Europe/Oslo'` is what makes FR-013 hold for an article stamped
at 00:30 Oslo time (stored as the previous UTC day). The current detail page uses
`toLocaleDateString('nb-NO', …)` **without** a timeZone, so it renders in the server's zone — a
latent bug on a UTC container that the restyle fixes by routing both pages through one helper.

**Alternatives considered**:
- *Add a date library*: rejected — FR-016 forbids new dependencies, and `Intl` is sufficient (the
  012 precedent).

---

## §7 Where the new logic lives: a pure `lib/news-view.ts`

**Decision**: A new dependency-free module `lib/news-view.ts` owning `NEWS_PAGE_SIZE`,
`parseNewsPageParam`, `buildPagination`, and `formatNewsDate`; unit-tested in isolation.

**Rationale**: Direct precedent — 012 put all grid/grouping/label math in `lib/events-view.ts` and
tested it in `tests/unit/events-view.test.ts`; `lib/event-dates.ts`, `lib/slug.ts` and
`lib/frontpage-select.ts` follow the same shape (no Payload imports → fast, hermetic unit tests).
The pagination model — which page, how many pages, is previous/next actionable, what does the
indicator read — is exactly the kind of arithmetic that is tedious to test through a rendered page
and trivial to test as a function.

**Alternatives considered**:
- *Inline the arithmetic in `news/page.tsx`*: rejected — the off-by-one risks at page boundaries
  (SC-001, SC-007) are the main correctness risk in this feature and deserve direct unit tests.

---

## §8 Styling: a `.news-*` block in `portal.css`

**Decision**: Add a `.news-*` block to `styles/portal.css` (grid, pagination bar, empty state,
detail page), modelled on `.fp-news` for the grid and `.ev-detail` for the article page. Tokens
only — no new primitives, no `--kihub-*` additions.

**Rationale**: `portal.css` is already organised as per-surface blocks (`.site-*`, `.fp-*`, `.ev-*`
after 012), so `.news-*` is the established slot. The 012 responsive fix (`918d7d6`, "no horizontal
scrolling on phones") is the standing precedent for FR-004/SC-004: constrain the grid with
`minmax(0, 1fr)` and let text wrap, rather than allowing a scroll container.

**Detail page**: `.news-detail` mirrors `.ev-detail` — `max-width: var(--kihub-prose-width)`,
`.kihub-container` + `.kihub-section` wrapper, back link, `.kihub-h1`-scale title, and
`.kihub-prose` for the `RichText` body (which already exists in `components.css:39`). The body keeps
using `RichText` from `@payloadcms/richtext-lexical/react` — unchanged, since `News.body` is
richText.

**Alternatives considered**:
- *Reuse `.fp-news` directly on `/news`*: rejected — couples two surfaces' spacing so a frontpage
  tweak silently changes the news page. A `.news-grid` with the same two-column/one-column rule is
  three lines of CSS and independently adjustable.

---

## §9 Simplification found while researching: the featured boost has no remaining consumer

**Decision**: Drop the `featured`-first stable sort from `lib/news.ts` `listPublishedNews()` so it
returns strictly `-publishDate`, and update the now-inaccurate comment in `lib/frontpage-select.ts`
that describes the shared news read lib as featured-first.

**Rationale**: Traced every reader of the news `featured` flag. Only two exist: the list page
ordering (being changed to strictly newest-first by FR-005) and the "Featured" chip on the old
Designsystemet card (deleted per §2). The frontpage *deliberately* ignores the flag —
`selectLatestNews` re-sorts by date, documented as "a featured-but-older article must not outrank a
newer one" (011 FR-008). So after 013 the boost sorts data that no surface consumes, and removing it
deletes code rather than adding a parallel read path. Behaviour for the frontpage is provably
unchanged because it re-sorts what it receives (FR-017).

The `News.featured` **field stays** in the collection: removing it is a destructive migration, and
it is the switch a future featured-hero treatment would read. FR-016 (no content-model change) holds.

**Alternatives considered**:
- *Leave `listPublishedNews` untouched and add a separate paginated function that sorts differently*:
  rejected — two read functions with silently different orderings over the same collection is a
  future bug; better to make the shared lib's single ordering correct.

---

## §10 Test strategy

**Decision**:
- `tests/unit/news-view.test.ts` (NEW) — `parseNewsPageParam` across every malformed input in the
  spec's edge-case list; `buildPagination` boundaries (single page → no controls; first page → no
  previous; last page → no next; correct "Side X av Y"); `formatNewsDate` including the 00:30
  Oslo/previous-UTC-day case and a missing date.
- `tests/integration/news-access.test.ts` (EXTEND) — paginated reads over seeded articles: page
  size respected, every article appears exactly once across pages with no duplicate at the
  boundary, newest-first order, out-of-range page clamps to the last page, and **drafts never
  appear on any page** (the existing published-only invariant, now exercised through the paginated
  path).

**Rationale**: Mirrors 012's split (pure unit module + extend the existing access integration
test) and satisfies the constitution's testing gate for a new module. The cross-page
"exactly once" assertion is the direct test of SC-001 and the reason §4's determinism finding
matters.

**Environment note**: integration tests need the env exported first —
`set -a; source apps/web/.env; set +a` — against the local `kihub-postgres` container.

---

## Resolved constraints summary

| Question | Resolution | Source |
|---|---|---|
| Does the card design need inventing? | No — `FrontpageNewsCard` + `.fp-news` already are it | §1 |
| Two card components or one? | One (`NewsCard`, `headingLevel` prop); delete `FrontpageNewsCard` | §2 |
| How to paginate? | `payload.find({ page, limit })` → `PaginatedDocs.totalPages` | §3 |
| Is offset pagination stable? | Yes — data layer appends a `-createdAt` tiebreaker | §4 |
| Do date-less articles sort last? | No — Postgres puts NULLs first; unreachable via CMS; spec corrected | §4 |
| Malformed / out-of-range `?page=` | → page 1 / clamp to last page, in the read layer | §5 |
| New dependencies? | None — `Intl` only | §6 |
| Where does the math live? | New pure `lib/news-view.ts` | §7 |
| New design tokens? | None — `.news-*` block on existing tokens | §8 |
| Anything to delete? | `FrontpageNewsCard.tsx`, the old DS card body, the dead featured boost | §2, §9 |
