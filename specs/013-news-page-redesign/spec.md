# Feature Specification: News Page Redesign (Nyheter)

**Feature Branch**: `013-news-page-redesign`

**Created**: 2026-08-05

**Status**: Draft

**Input**: User description: "Redesign the /news page ('Nyheter') — the employee news surface —
restyled on the kihub design system, following the pattern established by 012 for /events. The list
page becomes an editorial card grid modelled on the old KI HUB app's news page: each article is a
card with a 16:10 hero image well on top (or the design-system tinted placeholder when the article
has no hero image), then a serif title, then the nb-NO publish date, then the summary underneath —
two cards per row on desktop, one per row on phones, the whole card a single link to the article.
All published articles are reachable from this one page, with server-rendered pagination via a
?page=N URL search param (no client JS, no new deps, graceful fallback for invalid/out-of-range page
values), Norwegian pagination controls, and a Norwegian empty state. Scope is deliberately narrow:
NO tag filter sidebar, NO featured-article hero treatment, NO year/month archive navigation — just
the restyled paginated grid. The article detail page /news/[slug] is also restyled in Norwegian on
the kihub design system. Everything is server-rendered; access stays gated by the existing employee
session gate. Reuse the existing news read layer, extended for paginated reads, and reuse the
existing kihub token/component layer rather than introducing new design primitives."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse internal news in an editorial card grid (Priority: P1)

An employee opens "Nyheter" from the site navigation and lands on a page of published news
articles presented as an editorial card grid: each card is a wide image at the top, then the
article headline in the display typeface, then the publication date, then a short summary
underneath. Cards sit two per row on a laptop or desktop and stack one per row on a phone.
Articles are ordered newest first. Clicking anywhere on a card opens the article.

**Why this priority**: This is the module's front door and the visible half of the request. Today
the page is a stack of plain bordered cards with English copy on pre-redesign styling, visually
disconnected from the rest of the portal — while the frontpage already shows news in exactly the
image-led style employees recognise from the old KI HUB app. Bringing the list page to that
language is the core value and stands entirely on its own.

**Independent Test**: Can be fully tested by publishing a handful of articles — some with hero
images, some without, some without summaries — opening the news page, and verifying card
composition, newest-first order, the two-up/one-up responsive behaviour, and that each card
navigates to the right article.

**Acceptance Scenarios**:

1. **Given** several published articles with hero images and summaries, **When** an employee opens
   the news page, **Then** each article appears as a card with its image on top and its headline,
   nb-NO publication date, and summary beneath, in that visual order.
2. **Given** the news page on a desktop-width viewport, **When** it renders, **Then** cards are
   laid out two per row; **and given** a phone-width viewport, **Then** cards stack one per row
   with no horizontal scrolling.
3. **Given** published articles dated 22 June, 14 June, 11 June and 3 June, **When** the page
   renders, **Then** they appear in that order (newest first).
4. **Given** an article with no hero image, **When** its card renders, **Then** the media area
   shows the design system's tinted placeholder well at the same proportions, and the card keeps
   its shape and alignment with neighbouring cards.
5. **Given** an article whose hero image address is broken, **When** its card renders, **Then**
   the tinted well remains visible behind the failed image and the layout does not collapse.
6. **Given** an article with no summary, **When** its card renders, **Then** the card shows image,
   headline and date without an empty gap where the summary would be.
7. **Given** an employee clicks anywhere on a card — image, headline, date or summary, **When**
   the click resolves, **Then** they arrive at that article's page (one link per card, not several
   competing ones).
8. **Given** a draft article, **When** an employee views the news page, **Then** it does not
   appear.
9. **Given** there are no published articles at all, **When** the page renders, **Then** a
   friendly Norwegian empty state explains that there is no news yet.

---

### User Story 2 - Reach every article through pagination (Priority: P2)

As the archive grows past what one screen can reasonably hold, the news page splits into pages. The
employee sees a fixed number of articles per page with Norwegian paging controls beneath the grid —
previous, next, and their position ("Side 2 av 5") — and the current page is carried in the page
address so a given page can be shared, bookmarked, or reloaded. Every published article is
reachable by paging.

**Why this priority**: Essential for the page to keep working as the archive accumulates, but the
grid delivers value on day one with a small archive; paging is the growth story layered on top.

**Independent Test**: Can be tested by publishing more articles than one page holds, then walking
forward and back through every page, verifying no article is missing or duplicated, that the
position indicator is correct, and that the address reflects the page.

**Acceptance Scenarios**:

1. **Given** more published articles than fit on one page, **When** an employee opens the news
   page, **Then** the first page shows the newest articles up to the page size and paging controls
   appear beneath the grid.
2. **Given** the employee is on the first page, **When** they activate "Neste", **Then** the
   second page of articles renders, the position indicator reads "Side 2 av N", and the page is
   reflected in the address so it can be shared or bookmarked.
3. **Given** the employee is on the first page, **When** the controls render, **Then** the
   previous control is not actionable; **and given** they are on the last page, **Then** the next
   control is not actionable.
4. **Given** an archive that fits on a single page, **When** the page renders, **Then** no paging
   controls are shown.
5. **Given** the employee walks from the first page to the last, **When** they compare what they
   saw, **Then** every published article appeared exactly once, newest first, with no gaps or
   repeats at page boundaries.
6. **Given** a page value in the address that is not a usable page number (zero, negative,
   non-numeric, or beyond the last page), **When** the page is requested, **Then** it degrades
   gracefully to a valid page rather than erroring or showing an empty grid.
7. **Given** client-side scripting is disabled, **When** the employee pages forward and back,
   **Then** paging works exactly as it does with scripting enabled.

---

### User Story 3 - Read a restyled Norwegian article (Priority: P3)

An employee opens an article and reads it in the kihub visual language with Norwegian framing: the
headline in the display typeface, a byline and publication date, the hero image, any tags, and the
article body. A link takes them back to the news overview.

**Why this priority**: The article page already works and is readable; this story upgrades its
presentation so the click-through from the redesigned grid is not jarring. Valuable, but the page
is functional without it.

**Independent Test**: Can be tested by opening a published article and verifying its typography,
spacing, Norwegian copy, hero image, tags, body rendering, and the back link.

**Acceptance Scenarios**:

1. **Given** a published article with all fields set, **When** its page renders, **Then** the
   headline, byline, nb-NO publication date, hero image, tags and body are presented in the kihub
   visual language, with all framing copy in Norwegian.
2. **Given** the article page, **When** the employee looks for a way back, **Then** a Norwegian
   link returns them to the news overview (the stale "Back to catalog" link is gone).
3. **Given** an article with no hero image, no summary, or no tags, **When** its page renders,
   **Then** those sections are omitted cleanly with no empty frames or stray separators.
4. **Given** a draft or unknown article address, **When** visited, **Then** the page is not found
   (unchanged behaviour).

---

### Edge Cases

- **No published articles**: friendly Norwegian empty state; no paging controls.
- **Exactly one page of articles**: grid renders, paging controls are absent entirely.
- **Last page partially filled**: the final page shows the remainder without padding the grid with
  placeholder cards or leaving a misaligned row.
- **Invalid page value in the address** (`?page=0`, `?page=-3`, `?page=abc`, `?page=1.5`,
  `?page=`, repeated `?page=2&page=9`): falls back to the first page.
- **Out-of-range page value** (`?page=999` on a 5-page archive): falls back to a valid page rather
  than rendering an empty grid.
- **Article without a hero image**: tinted placeholder well at the same proportions.
- **Article with a broken or slow hero image address**: the tinted well shows through; the grid
  never collapses or shifts other cards.
- **Hero images of varying real aspect ratios**: all cards present the same media proportions, so
  rows stay aligned regardless of source image dimensions.
- **Article without a publication date**: the date line is omitted and the article still appears
  rather than disappearing. Publishing always stamps a date, so this state is unreachable through
  the back-office (see Assumptions).
- **Article without a summary**: card ends after the date line, no empty gap.
- **Article without a usable address handle**: never renders as a broken link on the grid.
- **Very long headline or summary**: wraps within its card; long unbroken strings do not force
  horizontal scrolling or overflow the card.
- **Very narrow viewport (360 px)**: single column, no horizontal scrolling anywhere on the page.
- **New article published while an employee is on page 3**: the pagination shifts by one article;
  the employee may see one article repeat or be skipped across a reload. Acceptable for an
  archive read surface — correctness is defined per rendered page, not across page loads.
- **Timezone boundaries**: an article published at 00:30 Oslo time shows the correct Oslo calendar
  date even when the stored timestamp falls on the previous UTC day.
- **Featured articles**: receive no special treatment or reordering on this page (see
  Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The news list page MUST be presented in the kihub visual language with all
  employee-facing copy in Norwegian (bokmål), headed "Nyheter", replacing the current English copy
  and removing the stale "Back to catalog" link.
- **FR-002**: Published articles MUST be presented as an editorial card grid. Each card MUST show,
  in this order: a media area of fixed 16:10 proportions containing the article's hero image (or
  the design system's tinted placeholder well when there is none), the headline in the display
  typeface, the publication date in nb-NO long form (e.g. "22. juni 2026"), and the summary.
- **FR-003**: Each card MUST be a single link to its article covering the whole card, with no
  competing nested links, and MUST show a visible keyboard focus indicator.
- **FR-004**: The grid MUST show two cards per row at desktop widths and one card per row at phone
  widths, with no horizontal scrolling at any viewport width down to 360 px, and cards in a row
  MUST stay aligned regardless of image dimensions or differing text lengths.
- **FR-005**: Articles MUST be ordered strictly newest-first by publication date, with a
  deterministic tiebreaker so that pagination never skips or repeats an article across pages. The
  featured flag MUST NOT reorder this page. An article that somehow lacks a publication date MUST
  still be reachable (its position among dated articles is unspecified — see Assumptions).
- **FR-006**: The page MUST paginate at a fixed page size, and every published article MUST be
  reachable by paging — appearing exactly once across the set of pages for a given archive state.
- **FR-007**: The active page MUST be carried in the page address (`?page=N`) so any page can be
  shared, bookmarked and reloaded, MUST be applied server-side, and MUST work with client-side
  scripting disabled.
- **FR-008**: Paging controls MUST be rendered beneath the grid with Norwegian labels — previous,
  next, and a position indicator ("Side X av Y") — MUST be exposed as a navigation region with an
  accessible Norwegian name, MUST mark the current page for assistive technology, and MUST render
  the previous control non-actionable on the first page and the next control non-actionable on the
  last page.
- **FR-009**: Paging controls MUST be omitted entirely when the whole archive fits on one page.
- **FR-010**: Invalid page values in the address (zero, negative, non-numeric, fractional, empty,
  or repeated) MUST fall back to the first page, and out-of-range page values MUST fall back to a
  valid page — never an error or an empty grid.
- **FR-011**: When there are no published articles at all, the page MUST show a friendly Norwegian
  empty state instead of the grid.
- **FR-012**: The news surfaces MUST never expose draft articles, directly or via address
  manipulation, keeping the existing defence in depth in both the read layer and the access layer.
- **FR-013**: All dates MUST be formatted for the Europe/Oslo timezone using nb-NO conventions,
  including across UTC day-boundary crossings and DST transitions.
- **FR-014**: The article detail page MUST be restyled in the kihub visual language with Norwegian
  framing copy, presenting the headline, byline, publication date, hero image, tags and body, and
  MUST offer a Norwegian link back to the news overview. Missing hero image, summary or tags MUST
  be omitted cleanly.
- **FR-015**: All styling on both pages MUST come exclusively from the shared kihub token layer
  and existing kihub presentational patterns — no hardcoded colours, type or spacing values, no
  new design primitives, and no restyling or forking of Designsystemet primitives.
- **FR-016**: The feature MUST NOT change the news content model (no new fields) and MUST NOT add
  runtime dependencies.
- **FR-017**: The frontpage "Siste nytt" section MUST keep working unchanged — it already selects
  the four most recently published articles strictly by date — and article addresses MUST remain
  unchanged so existing links keep resolving.
- **FR-018**: Both pages MUST remain server-rendered and MUST stay gated by the existing
  employee-session requirement for the app surface; the feature introduces no new client-side
  interactivity.

### Key Entities

- **News article** (existing, unchanged): an internally authored article with headline, address
  handle, summary, body, author, publication status, publication date, free-form tags, hero image
  address, and featured flag.
- **News list page state**: the shareable page position within the archive, carried in the page
  address as a page number; the only state this page has.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of published articles are reachable from the news page by paging, each
  appearing exactly once across pages, ordered newest-first.
- **SC-002**: Draft articles are never visible to employees on either news surface, under any
  combination of address parameters — 100% of access-control checks pass.
- **SC-003**: Paging forward or back takes exactly one user action and works identically with
  client-side scripting disabled.
- **SC-004**: No horizontal scrolling occurs on either news page at any viewport width from 360 px
  upward.
- **SC-005**: All employee-facing copy on the news list and article pages is Norwegian (bokmål) —
  no English strings remain.
- **SC-006**: Every article renders a complete, aligned card regardless of missing hero image,
  missing summary or missing date — 100% of cards keep the grid intact, with no broken or
  collapsed layouts.
- **SC-007**: Every malformed or out-of-range page value renders a valid page of articles — 0 error
  responses and 0 unintentionally empty grids.
- **SC-008**: An employee can go from opening the news page to reading a specific recent article
  they recognise by headline in under 15 seconds.
- **SC-009**: The frontpage news section and all existing article addresses continue to work after
  the change — 0 regressions.

## Assumptions

- **Page size is 12 articles** (six rows of two on desktop): enough that a young archive fits on
  one page and paging stays invisible at first, small enough to keep the page light as the archive
  grows. Not specified by the request; a single tunable value.
- **Strictly newest-first, no featured boost on this page.** The current list boosts featured
  articles to the top; combined with pagination that would pin an old featured article to the top
  of page 1 indefinitely, and it contradicts the plainly date-descending order in the reference
  design. **Consequence to accept knowingly**: the news list is the only surface that reads the
  featured flag today (the frontpage deliberately ignores it and picks the four newest by date), so
  after this change the flag becomes editorially inert for news. It is kept in the content model —
  removing it would be a destructive migration, and it is exactly the switch a future
  featured-hero treatment would use.
- **An article missing a publication date is treated as an anomaly, not a supported state.**
  Publishing stamps the date automatically on first publish, so a published article without one
  cannot be produced through the back-office. Sorting such a row precisely would require raw SQL
  ordering the platform's data layer does not expose, so the spec guarantees only that the article
  stays reachable and renders without a date line, not where it lands.
- **Tags are not shown on the list cards.** The reference design shows image, headline, date and
  summary only; tags remain on the article page. (The current list cards show tag chips and a
  "Featured" chip — both are dropped from the list.)
- **Numbered page links are not required**, only previous/next plus a position indicator. Simpler,
  and adequate for an archive read in recency order; direct access to any page remains possible by
  address.
- **No filtering, searching, or archive navigation on this page** — explicitly excluded by the
  request. Tag filtering, a featured hero treatment, and year/month archive navigation are possible
  later features, and nothing here should preclude them.
- **Hero images remain editor-provided addresses**; managed uploads stay deferred, unchanged from
  the original news phase. Consequently images are not resized or optimised by the platform, and a
  broken address must degrade to the placeholder look.
- **The site navigation already links to the news page** ("Nyheter" in both the header and the
  footer); no navigation changes are needed.
- **Existing read behaviour is reused**: published-only reads and handle-addressed article pages
  stay as they are, extended only with the ability to read one page of results at a time.
- **No feed export (RSS/Atom), no per-article sharing controls, and no reading-time or view-count
  metadata** are in scope.
