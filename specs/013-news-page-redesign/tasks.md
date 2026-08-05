---

description: "Task breakdown for 013-news-page-redesign"
---

# Tasks: News Page Redesign (Nyheter)

**Input**: Design documents from `/specs/013-news-page-redesign/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: INCLUDED. Required by the constitution's testing gate (new modules must test their
validation rules and access control) and specified in research §10.

**Organization**: Grouped by user story so each is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on an incomplete task *in the same
  phase*
- **[Story]**: US1 (grid), US2 (pagination), US3 (article page)
- All paths are repo-relative

## Path Conventions

Single Next.js app: source under `apps/web/src/`, tests under `apps/web/tests/`. No new packages.

**Environment note**: tests need the env **exported**, not just sourced —
`set -a; source apps/web/.env; set +a` — against the local `kihub-postgres` container.

---

## Phase 1: Setup

**Purpose**: Establish a known-good baseline before touching anything. No project initialization is
needed — 013 adds no dependencies, no schema, no migration.

- [X] T001 Confirm the baseline is green and record the count: `colima start && docker compose up -d`, then `set -a; source apps/web/.env; set +a && pnpm --filter web test` — expect 187 passing across 27 files. This number is the regression floor for T019.

**Checkpoint**: Baseline recorded; any later failure is attributable to this feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pagination arithmetic, date formatting, and paginated read that US1 and US2 both
build on. US3 needs only `formatNewsDate` from this phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Create the pure view module `apps/web/src/lib/news-view.ts` per [contracts/news-read-v2.md](contracts/news-read-v2.md) §B — `NEWS_PAGE_SIZE = 12`, `parseNewsPageParam`, `buildPagination` (returning the `NewsPagination` shape from [data-model.md](data-model.md) §2), and `formatNewsDate` with an explicit `timeZone: 'Europe/Oslo'`. No Payload imports, no I/O; module doc comment in the style of `lib/events-view.ts`.
- [X] T003 Create `apps/web/tests/unit/news-view.test.ts` covering the whole module (depends on T002): `parseNewsPageParam` for `undefined`/`''`/`'0'`/`'-3'`/`'abc'`/`'1.5'`/`'2e3'`/`' '` → 1, `'7'` → 7, `['2','9']` → 2, `'999'` → 999 (no upper clamp in the parser); `buildPagination` boundaries — `totalPages <= 1` → `visible: false`, page 1 → no `prevHref`, last page → no `nextHref`, `pageHref(1)` → `/news` with no query string, `label` = `Side X av Y`; `formatNewsDate` → `22. juni 2026`, the Oslo/UTC boundary case `2026-06-22T22:30:00Z` → `23. juni 2026`, and `''` for a missing date.
- [X] T004 Extend the read layer `apps/web/src/lib/news.ts` per [contracts/news-read-v2.md](contracts/news-read-v2.md) §A: add `listPublishedNewsPage(page)` returning `{ articles, page, totalPages, totalDocs }`, using `payload.find({ page, limit: NEWS_PAGE_SIZE, sort: '-publishDate', where: { status: { equals: 'published' } }, overrideAccess: true })`, and re-querying at `page: totalPages` when the result is empty while `totalPages > 0 && page > totalPages` (out-of-range clamp, research §5). In the same file, **remove** the trailing `featured`-first stable sort from `listPublishedNews()` so it returns strictly newest-first (research §9), and update its doc comment.
- [X] T005 [P] Fix the now-inaccurate comment in `apps/web/src/lib/frontpage-select.ts` that describes the shared news read lib as returning featured-first ordering (the events lib still does; news no longer will after T004). Keep `selectLatestNews`'s behaviour unchanged.

**Checkpoint**: The math is unit-tested and the paginated read exists. Story work can begin.

---

## Phase 3: User Story 1 — Browse internal news in an editorial card grid (Priority: P1) 🎯 MVP

**Goal**: `/news` renders published articles as the editorial 2-up/1-up card grid — 16:10 media well
(image or tinted placeholder), serif headline, nb-NO date, summary — each card a single link, newest
first, with a Norwegian empty state.

**Independent Test**: Publish articles with and without hero images and summaries (including one with
a broken image URL and one very long headline); open `/news` and verify card composition and order,
two-up at desktop and one-up at 360 px with no horizontal scroll, that clicking any part of a card
opens that article, that a draft never appears, and that an empty archive shows the Norwegian empty
state. Fully verifiable with no pagination present.

### Implementation for User Story 1

- [X] T006 [US1] Rewrite `apps/web/src/components/NewsCard.tsx` as the token-layer media card per [contracts/news-page-ui.md](contracts/news-page-ui.md) §B.1: props `{ article: News; headingLevel?: 2 | 3 }`, one `<Link className="kihub-focusable">` wrapping `<article className="kihub-stack">`, `.kihub-media` at `aspect-ratio: 16 / 10` gaining `.kihub-media--placeholder` when `heroImageUrl` is absent, `.kihub-h4` heading at the requested level, `formatNewsDate` line, summary — date and summary omitted when absent. Carry the markup over verbatim from `FrontpageNewsCard` (including `alt=""` and the `@next/next/no-img-element` disable comment); drop the old Designsystemet `Card`/`Heading`/`Tag` implementation and its tag/"Featured" chips.
- [X] T007 [US1] Delete `apps/web/src/components/FrontpageNewsCard.tsx` and update its sole consumer `apps/web/src/app/(app)/page.tsx` to import `NewsCard` and render it with `headingLevel={3}` (depends on T006). Frontpage output must be visually identical — cards sit under the `<h2>` "Siste nytt" heading, so `h3` is the correct level.
- [X] T008 [P] [US1] Add the `.news-grid` and `.news-empty` rules to `apps/web/src/styles/portal.css` per [contracts/news-page-ui.md](contracts/news-page-ui.md) §C, as a new `.news-*` block after the `.ev-*` block: two columns of `minmax(0, 1fr)` collapsing to one at `max-width: 719px`, gap `var(--kihub-space-10) var(--kihub-space-6)` (`.fp-news` parity). Tokens only — no literal colours, type sizes, or spacing values.
- [X] T009 [US1] Rebuild `apps/web/src/app/(app)/news/page.tsx` per [contracts/news-page-ui.md](contracts/news-page-ui.md) §B.3 (depends on T004, T006, T008): `main.kihub-container` → `div.kihub-section` → `<h1 className="kihub-h1">Nyheter</h1>`, then either `div.news-grid` of `NewsCard` (default `headingLevel` 2) or the `div.news-empty` Norwegian empty state ("Ingen nyheter ennå" + "Det er ingen publiserte nyheter akkurat nå. Kom tilbake senere."). Read page 1 via `listPublishedNewsPage`. Remove the `← Back to catalog` link, the English `News`/`Internal news and announcements.` copy, and all `@digdir/designsystemet-react` imports.
- [X] T010 [US1] Extend `apps/web/tests/integration/news-access.test.ts` with paginated-read coverage of the published-only invariant (depends on T004): seed published and draft articles, then assert `listPublishedNewsPage(1)` returns published articles newest-first and that no draft appears on any page — the FR-012 defence-in-depth guarantee exercised through the new read path.

**Checkpoint**: `/news` is the redesigned grid and stands on its own as the MVP. The frontpage still
renders "Siste nytt" identically.

---

## Phase 4: User Story 2 — Reach every article through pagination (Priority: P2)

**Goal**: The grid pages at 12 articles with Norwegian `Forrige` / `Side X av Y` / `Neste` controls,
the page carried in `?page=N`, working with scripting disabled and degrading gracefully for
malformed and out-of-range values.

**Independent Test**: Publish 14+ articles; walk page 1 → last → 1 and confirm no article is missing
or repeated at the boundary and the indicator is correct; unpublish to ≤12 and confirm the control
bar disappears entirely; check every malformed value renders page 1 and `?page=999` renders the last
page; disable JavaScript and repeat the walk.

### Implementation for User Story 2

- [X] T011 [P] [US2] Create `apps/web/src/components/NewsPagination.tsx` per [contracts/news-page-ui.md](contracts/news-page-ui.md) §B.2: returns `null` when `pagination.visible` is false (FR-009); otherwise `<nav aria-label="Paginering" className="news-pagination">` with `‹ Forrige`, the `Side X av Y` label carrying `aria-current="page"`, and `Neste ›`. Actionable directions are `<Link className="news-pagination__btn kihub-focusable">`; unavailable directions are non-focusable `<span … aria-disabled="true">`, not disabled links.
- [X] T012 [P] [US2] Add the `.news-pagination`, `.news-pagination__btn`, `.news-pagination__btn--off` and `.news-pagination__label` rules to the `.news-*` block in `apps/web/src/styles/portal.css` per [contracts/news-page-ui.md](contracts/news-page-ui.md) §C — flex, centred, top border, subtle colour for the inert state. Tokens only.
- [X] T013 [US2] Wire pagination into `apps/web/src/app/(app)/news/page.tsx` (depends on T009, T011): accept `searchParams: Promise<SearchParams>`, resolve the page with `parseNewsPageParam(sp.page)`, pass it to `listPublishedNewsPage`, build the model with `buildPagination(page, totalPages, totalDocs)` from the **returned** (clamped) page, and render `<NewsPagination>` beneath the grid. `page` is the only param read; unknown params are ignored.
- [X] T014 [US2] Extend `apps/web/tests/integration/news-access.test.ts` with pagination behaviour (depends on T004; same file as T010, so not parallel with it): seed more than `NEWS_PAGE_SIZE` published articles and assert page 1 returns exactly `NEWS_PAGE_SIZE` docs with a correct `totalPages`/`totalDocs`; concatenating pages `1..totalPages` yields every published article **exactly once** in newest-first order with no boundary duplicate (SC-001); an out-of-range page clamps to the last page and returns a non-empty result (FR-010); and two articles sharing a `publishDate` do not swap between page requests (the `-createdAt` tiebreaker, research §4).

**Checkpoint**: The whole archive is reachable, with US1 still passing its own test.

---

## Phase 5: User Story 3 — Read a restyled Norwegian article (Priority: P3)

**Goal**: `/news/<slug>` presented in the kihub visual language with Norwegian framing — headline,
byline, Oslo-correct date, hero image, tag chips, rich-text body, and a `← Til nyheter` back link.

**Independent Test**: Open a published article and verify typography, Norwegian copy, the hero image,
tag chips, body rendering and the back link; open one with no image and no tags and verify those
sections vanish cleanly; confirm a draft slug and a nonsense slug both 404.

### Implementation for User Story 3

- [X] T015 [P] [US3] Add the `.news-detail`, `.news-detail__back`, `.news-detail__title`, `.news-detail__meta`, `.news-detail__tags` and `.news-detail__body` rules to the `.news-*` block in `apps/web/src/styles/portal.css` per [contracts/news-page-ui.md](contracts/news-page-ui.md) §C, modelled on the existing `.ev-detail` block: `max-width: var(--kihub-prose-width)`, `--kihub-font-size-h2` title, subtle-coloured meta line, chip children on `var(--kihub-surface-accent)`. Tokens only.
- [X] T016 [US3] Restyle `apps/web/src/app/(app)/news/[slug]/page.tsx` per [contracts/news-page-ui.md](contracts/news-page-ui.md) §B.4 (depends on T002, T015): `main.kihub-container` → `article.kihub-section.news-detail` containing the `← Til nyheter` back link, the title, an `Av {byline} · {date}` meta line using `formatNewsDate` (replacing the current `toLocaleDateString` call that has no `timeZone` and therefore renders in the server's zone — research §6), token-styled `<li>` tag chips, the `.kihub-media` hero image, and `.news-detail__body.kihub-prose` wrapping `RichText`. Remove every `@digdir/designsystemet-react` import (`Divider`/`Heading`/`Paragraph`/`Tag`) and the English `← Back to news` / `By …` copy. Keep `RichText`, the byline fallback logic, and the `notFound()` behaviour unchanged.

**Checkpoint**: All three stories are independently functional; both news surfaces are Norwegian and
token-styled.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T017 [P] Sweep for leftovers: `git grep -nE "Back to catalog|Back to news|No news yet|Internal news|^By " apps/web/src` must return nothing, and `git grep -n "designsystemet-react" "apps/web/src/app/(app)/news"` must return nothing (SC-005, FR-015).
- [X] T018 [P] Confirm the scope bounds held: no diff in `apps/web/package.json` dependencies, no new file under `apps/web/src/migrations/`, no diff in `apps/web/src/collections/News.ts`, and no regeneration of `apps/web/src/payload-types.ts` (FR-016, data-model §6).
- [X] T019 Run the full gate: `set -a; source apps/web/.env; set +a && pnpm --filter web test` (expect the T001 baseline of 187 plus the new `unit/news-view.test.ts` and extended `integration/news-access.test.ts` cases, all green), then `pnpm --filter web lint` and `pnpm --filter web build` clean.
- [X] T020 Work through [quickstart.md](quickstart.md) manual scenarios 1–11 against `pnpm --filter web dev`, including the 360 px and 719/720 px responsive checks (SC-004), the no-JS paging walk (SC-003), the Oslo timezone case (FR-013), and the frontpage "Siste nytt" no-regression check (FR-017, SC-009).
- [X] T021 Update the `<!-- SPECKIT -->` block in `CLAUDE.md` to mark 013 DONE with the final suite count, moving it into the prior-phases list in the established style.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup — **blocks all user stories**.
- **US1 (Phase 3)**: depends on Phase 2. Delivers the MVP alone.
- **US2 (Phase 4)**: depends on Phase 2, and on T009 from US1 for the wiring task T013 (it edits the
  page US1 creates). T011/T012 need only Phase 2.
- **US3 (Phase 5)**: depends on Phase 2 only (`formatNewsDate`). Independent of US1 and US2 — it
  touches a different page file and its own CSS rules.
- **Polish (Phase 6)**: depends on all desired stories.

### Task-Level Dependencies

```
T001
 └─ T002 ─┬─ T003
          ├─ T004 ─┬─ T009, T010, T013, T014
          │        └─ (T005 comment fix, independent)
          └─ T016 (formatNewsDate only)

T006 ─┬─ T007
      └─ T009
T008 ─── T009
T011 ─── T013
T015 ─── T016
```

### Within Each User Story

- Components and CSS before the page that composes them.
- The read layer (Phase 2) before any page or integration test that exercises it.
- Integration tests may be written before or after the pages — they exercise the read layer
  directly, not the rendered markup.

### Parallel Opportunities

- **Phase 2**: T002 and T005 are parallel. T004 can start alongside T003 once T002 exists.
- **Phase 3**: T006 and T008 are parallel (component vs. stylesheet); T010 is parallel with both
  (test file vs. source).
- **Phase 4**: T011 and T012 are parallel.
- **Across stories**: once Phase 2 is done, **US3 (T015 + T016) can proceed fully in parallel with
  US1 and US2** — different page file, different CSS rules, no shared component.
- **Not parallel**: T010 and T014 both edit `tests/integration/news-access.test.ts`. T008, T012 and
  T015 all edit `styles/portal.css` but sit in different phases, so they never contend in practice.

---

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + Phase 3 (US1)** — T001–T010. That delivers the visible half of the
request: `/news` as the editorial grid the reference design shows, in Norwegian, on the token layer,
with the frontpage consolidated onto the same card. Shippable and demonstrable on its own; with a
small archive the absence of pagination is invisible.

**Increment 2 = Phase 4 (US2)** — T011–T014. Makes the page correct as the archive grows. The
riskiest correctness work in the feature (page-boundary arithmetic) is concentrated here and is
covered by both unit tests (T003) and a cross-page integration assertion (T014).

**Increment 3 = Phase 5 (US3)** — T015–T016. Removes the jarring click-through from a redesigned grid
into a pre-redesign English article page. Independent, so it can be pulled forward and done in
parallel if two people are working.

**Then Phase 6** — the gate: suite, lint, production build, quickstart walkthrough, agent context.

**Total: 21 tasks** — 1 setup, 4 foundational, 5 US1, 4 US2, 2 US3, 5 polish.

---

## Implementation notes (deviations from the plan, recorded after the fact)

1. **The `.news-*` CSS block was written in one pass (T008), not three.** T008/T012/T015 all append to
   the same `portal.css` block, and splitting one contiguous block across three edits would have left
   the file in an odd half-state between phases. All three tasks' rules are present and match
   contracts §C; T012 and T015 were verified rather than separately authored.
2. **T010 and T014 were written together.** Both extend the same `describe` block in
   `tests/integration/news-access.test.ts` with a shared seed, so writing them in one pass avoided
   seeding the same fixtures twice.
3. **The integration assertions are relative, not absolute.** `listPublishedNewsPage` reads the whole
   collection by design and the suite runs against the shared local dev database, so the tests assert
   invariants (no duplicate across pages, count equals `totalDocs`, seeded IDs all reachable,
   ordering non-increasing) rather than exact counts. Clearing the `news` table would have destroyed
   local dev content.
4. **T017's grep was written too broadly.** `Back to catalog` still exists at
   `apps/web/src/app/(app)/artifacts/[artifactId]/page.tsx:35` — a different, still-pre-redesign
   surface that is outside 013's scope. Both news pages are clean, which is what the task meant.
5. **The production build needs two env overrides locally** (T019): the dev `.env` sets
   `AUTH_MODE=mock`, which `next build` rejects, and `prodMigrations` prompts interactively against
   the push-mode dev database. Verified green with `AUTH_MODE=entra` plus placeholder Entra values
   and `DATABASE_URI` pointed at a throwaway database, which was dropped afterwards. Worth adding to
   quickstart for the next phase.
6. **The empty state (FR-011) was verified by unit test and code reading, not visually** — showing it
   requires zero published articles, and emptying the user's local dev database was not worth it.
   `buildPagination(1, 0, 0).visible === false` is asserted in `unit/news-view.test.ts`, and the
   pagination bar's absence at 8 articles (below the page size) was confirmed in the browser.
7. **`.claude/launch.json` gained `"autoPort": true`** on the `kihub-web` config: another session held
   port 3000, and Next 16 refuses a second `next dev` for the same directory. Verification ultimately
   ran against the already-running server on port 3000.
