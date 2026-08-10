<!-- SPECKIT START -->
Active feature: **014-learning-pages** (specify + plan complete; tasks + implement PENDING). For
technologies, structure, and context read the plan:
`specs/014-learning-pages/plan.md` (with `research.md`, `data-model.md`, `contracts/`,
`quickstart.md`; `spec.md` for requirements). It adds **KI Læring** — the constitution's fourth
module (v3.1.0) — as a learning library: editors curate categories → subcategories → pages in
`/cms`, employees read at `/laering` behind a persistent left sidebar tree, kihub-restyled,
Norwegian. **4 new collections** (`learning-categories`, `learning-subcategories`,
`learning-pages`, and `media` — KI Hub's FIRST managed uploads), **an additive migration**, and
**2 new deps**: `shiki@4.4.3` + `@payloadcms/storage-azure@3.85.2` (exact peer pin on Payload
3.85.2). Key decisions, all in research.md: `<RichText>`'s JSX converters are SYNCHRONOUS →
shiki `createHighlighterCoreSync` + JS regex engine (no WASM in `.next/standalone`), module-scope
singleton, rendered as React elements (never `dangerouslySetInnerHTML`); Payload's premade
`CodeBlock` reused with a curated 8-language map whose ids serve both Monaco (admin) and shiki;
syntax colours are `--shiki-token-*` ALIASES of Designsystemet text-role tokens (the 012
event-colour pattern, `portal.css:194`) — the one recorded Design System deviation; the sidebar is
native `<details>` (works with JS off, FR-005) so the feature adds ZERO client components; explicit
`order` field, NOT Payload's `@experimental` `orderable`; flat addresses `/laering/<slug>` so
reorganising never breaks links; tree = 3 queries at `depth: 0` + a pure `buildLearningTree`.
Blocked externally: durable image storage needs an Azure blob container from the platform team —
deployed envs run `MEDIA_STORAGE_MODE=disk` (ephemeral) until then; local dev unblocked.
Prior: **013-news-page-redesign** (DONE — suite 212/212 across 28 files, lint + prod build green),
`specs/013-news-page-redesign/plan.md`. It rebuilt `/news` ("Nyheter") as a kihub-restyled editorial
card grid (16:10 media well + serif headline + nb-NO date + summary, 2-up/1-up, each card ONE link)
with server-rendered `?page=N` pagination (`NEWS_PAGE_SIZE` 12, Norwegian controls, malformed → page
1, out-of-range → clamp) and a restyled article page. Durable facts: one `NewsCard`
(`headingLevel` 2|3) — `FrontpageNewsCard` was DELETED; pure `lib/news-view.ts`
(parseNewsPageParam / buildPagination / formatNewsDate); `lib/news.ts` has
`listPublishedNewsPage()` and NO `featured`-first sort, so `News.featured` is inert for news.
Prior phases: Phase 1 (foundation)
`specs/001-phase1-foundation/`; Phase 2 (catalog) `specs/002-catalog/`; Phase 3 (governance)
`specs/003-governance/`; Phase 4 (automated discovery) `specs/004-automated-discovery/`; Phase 5
(full-text search) `specs/005-fulltext-search/`; Phase 6 (editor back-office)
`specs/006-editor-backoffice/`; Phase 7 (news) `specs/007-news/`; governance-UI reconcile
`specs/008-governance-ui-reconcile/`; Phase 8 (calendar/events) `specs/009-calendar-events/`;
home-page widgets `specs/010-home-widgets/`; frontpage redesign `specs/011-frontpage-redesign/`
(DONE, suite 134/134 → now 141/141 with deploy-phase tests); events page redesign
`specs/012-events-page-redesign/` (DONE, suite 187/187 across 27 files, lint + prod build green).
Governance rules:
`.specify/memory/constitution.md` (v3.1.0 — KI Hub is an employee portal: Registry + News +
Calendar + Learning, two surfaces; Learning is native Payload content, NOT an artifact, and the
Registry principles I/III/IV/V/VI do not apply to it; Design System constraint = Designsystemet as
FOUNDATION with the generated
KI Hub theme (`designsystemet.config.json` + `pnpm --filter web theme:build`) + kihub token layer;
custom presentational components sanctioned on the tokens).
<!-- SPECKIT END -->
