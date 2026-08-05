# Implementation Plan: News Page Redesign (Nyheter)

**Branch**: `main` (repo works trunk-based; feature dir `013-news-page-redesign`) | **Date**: 2026-08-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/013-news-page-redesign/spec.md`

## Summary

Rebuild `/news` from a stack of pre-redesign Designsystemet cards with English copy into the
editorial "Nyheter" grid from the old KI HUB app, restyled on the kihub token layer: a 2-up/1-up grid
of cards that are a 16:10 media well (image or tinted placeholder), a serif headline, an nb-NO date
line and a summary, each card a single link. Server-rendered `?page=N` pagination (page size 12,
Norwegian `Forrige`/`Neste`/`Side X av Y`) makes the whole archive reachable with zero client JS and
zero new dependencies, degrading gracefully for malformed and out-of-range page values. The article
page is restyled in Norwegian on the same token layer.

The central insight from research: **the target card already exists in the codebase** as
`FrontpageNewsCard`, and the target grid as `.fp-news`. So the shape of the work is consolidation,
not new design — one shared `NewsCard` (with a `headingLevel` prop) replaces both the pre-redesign
Designsystemet card and the frontpage-only card, a new pure `lib/news-view.ts` owns the pagination
arithmetic and date formatting, and `lib/news.ts` gains a paginated read while shedding a
`featured`-first sort that no surface consumes any more. No schema change, no migration.

## Technical Context

**Language/Version**: TypeScript 5 / Node 22, React 19 server components

**Primary Dependencies**: Next.js 15 (App Router), Payload CMS 3.85.2 (Postgres adapter),
`@payloadcms/richtext-lexical/react` for the article body, kihub token layer
(`apps/web/src/styles/kihub/`). **No new dependencies**; date formatting via `Intl` (FR-016).
The two rebuilt pages drop their `@digdir/designsystemet-react` imports entirely (custom
presentational components on the token layer — constitution Design System constraint §3).

**Storage**: PostgreSQL via Payload — **read-only for this feature**. No new fields, no migration, no
`payload-types.ts` regeneration (data-model §6).

**Testing**: Vitest — `tests/unit/news-view.test.ts` (new, pure module) and
`tests/integration/news-access.test.ts` (extended, Payload local API). Suite must stay green
(187 existing tests).

**Target Platform**: Server-rendered web (Azure Container Apps in production), employee surface
behind the `(app)` `requireSession()` gate

**Project Type**: Web application (existing `apps/web` monorepo app)

**Performance Goals**: One Payload query per list request (two only for an out-of-range page), 12
documents instead of the current 200 per list render; no client JS added

**Constraints**: Europe/Oslo + nb-NO everywhere (FR-013); no-JS operability (SC-003); token-only
styling; draft-leak defence in depth (FR-012); no horizontal scroll ≥360 px (SC-004)

**Scale/Scope**: Internal portal (~hundreds of employees, a slowly growing news archive); 1 page
rebuilt, 1 page restyled, 1 component rewritten, 1 component added, 1 component deleted, 1 new pure
lib, 1 read-lib function added + 1 simplified, 1 CSS block, 2 test files

## Constitution Check

*GATE: v3.0.0. Evaluated pre-Phase 0 and re-checked post-Phase 1 — **PASS**, no deviations, no
Complexity Tracking entries.*

- **I. Git source of truth for AI artifacts** — N/A: News is native platform content (Principle II);
  no artifact content is touched.
- **II. Payload owns enterprise context and native content** — PASS: articles remain wholly
  Payload-owned; this feature only reads them. No external source of truth introduced.
- **III / IV / V (artifact model, stable identity, APM distribution)** — N/A: no Registry changes.
- **VI. Governance is the Registry's core value** — N/A: News sits outside the governance matrix
  (007 decision, unchanged).
- **VII. Start simple, design for growth** — PASS, and the plan *removes* more than it adds: the
  dead `featured` boost goes (research §9), two card components become one (§2), and the excluded
  scope (tag filters, featured hero, archive nav) is left as clean seams rather than speculative
  machinery. `NEWS_PAGE_SIZE` is a single tunable constant. The one deliberate non-simplification —
  a pure view module for four small functions — is justified by the off-by-one risk at page
  boundaries being this feature's main correctness hazard (§7).
- **VIII. Two surfaces** — PASS: the employee app gains read-only browsing only; authoring stays in
  `/cms`; the `(app)` session gate and the collection's Contributor+ write rules are unchanged and
  server-enforced.
- **Design System constraint** — PASS on all four clauses: (1) the generated KI Hub theme is
  untouched; (2) styling goes exclusively through `--kihub-*` tokens in a new `.news-*` block, no new
  tokens and no literal colour/type/spacing values; (3) `NewsCard` and `NewsPagination` are
  sanctioned custom *presentational* components — no behavioural primitive is hand-rolled, and the
  pagination controls are navigation links (the `CatalogFilters`/`EventsFilters` precedent), not
  form controls, so no Designsystemet form component is bypassed; (4) no Designsystemet primitive is
  restyled or forked — the two pages simply stop importing `Card`/`Heading`/`Tag`/`Divider` in favour
  of token-layer markup, exactly as 012 did.
- **Workflow gates** — PASS: spec-driven flow followed; the read contract is versioned
  (`contracts/news-read-v2.md` supersedes the 007 read contract for the list surface); the new module
  and the published-only access invariant both get automated tests (research §10).

## Project Structure

### Documentation (this feature)

```text
specs/013-news-page-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 — 10 resolved decisions
├── data-model.md        # Phase 1 — read shape, derived pagination model, no schema change
├── quickstart.md        # Phase 1 — validation guide (11 manual scenarios)
├── checklists/requirements.md
├── contracts/
│   ├── news-read-v2.md      # read layer + pure view module API
│   └── news-page-ui.md      # URL contract, components, CSS block, copy, a11y
└── tasks.md             # Phase 2 (/speckit-tasks — not created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── news.ts                       # listPublishedNews(): drop the dead featured boost;
│   │                                 #   + listPublishedNewsPage(page) with out-of-range clamp
│   ├── news-view.ts                  # NEW pure module: NEWS_PAGE_SIZE, parseNewsPageParam,
│   │                                 #   buildPagination, formatNewsDate
│   └── frontpage-select.ts           # comment fix only (news lib is no longer featured-first)
├── components/
│   ├── NewsCard.tsx                  # REWRITE: Designsystemet card → token-layer media card
│   │                                 #   (16:10 well, serif title, date, summary, headingLevel)
│   ├── FrontpageNewsCard.tsx         # DELETE (absorbed into NewsCard; sole consumer updated)
│   └── NewsPagination.tsx            # NEW link-based Forrige / Side X av Y / Neste
├── app/(app)/
│   ├── page.tsx                      # import NewsCard headingLevel={3} (frontpage unchanged)
│   └── news/
│       ├── page.tsx                  # REBUILD: searchParams → grid + pagination + empty state
│       └── [slug]/page.tsx           # RESTYLE: kihub tokens, Norwegian, no Designsystemet imports
└── styles/portal.css                 # + .news-* block (grid, pagination, empty, detail)

apps/web/tests/
├── unit/news-view.test.ts            # NEW
└── integration/news-access.test.ts   # EXTEND: paginated reads, cross-page coverage, draft invariant
```

**Structure Decision**: Everything stays inside `apps/web`, following the pattern every phase since
001 has used and 012 used most recently: pure lib + read lib + presentational components + page +
tests, with per-surface CSS blocks in `portal.css`. No new packages, no client components, no
collection or migration changes.

## Complexity Tracking

> No Constitution Check violations — this section is intentionally empty.

The one judgement call worth recording is a *reduction*: taking over the `NewsCard.tsx` filename and
deleting `FrontpageNewsCard.tsx` (research §2) touches a file 011 shipped. It is safe because
`FrontpageNewsCard` has exactly one consumer (`app/(app)/page.tsx:4`) and **no test references
either component**, so the consolidation carries no test churn and leaves one news card in the tree
instead of two that would have to be kept pixel-identical by hand.
