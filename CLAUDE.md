<!-- SPECKIT START -->
Active feature: **013-news-page-redesign** (DONE — specify + plan + tasks + implement complete;
suite 212/212 across 28 files, lint + prod build green). For technologies, structure, and context
read the plan:
`specs/013-news-page-redesign/plan.md` (with `research.md`, `data-model.md`, `contracts/`,
`quickstart.md`; `spec.md` for requirements). It rebuilds `/news` ("Nyheter") into the old KI HUB
app's editorial news grid restyled on the **kihub design system**: cards of a 16:10 media well
(image or tinted placeholder) + serif headline + nb-NO date + summary, 2-up desktop / 1-up phone,
each card ONE link; server-rendered `?page=N` pagination (`NEWS_PAGE_SIZE` 12, Norwegian
Forrige/Neste/"Side X av Y", malformed → page 1, out-of-range → clamp to last), Norwegian empty
state; article detail page kihub-restyled in Norwegian. **No schema change, no migration, no new
deps.** Key moves: the target card already existed as `FrontpageNewsCard` → consolidated into one
`NewsCard` (`headingLevel` 2|3), `FrontpageNewsCard` DELETED; new pure `lib/news-view.ts`
(parseNewsPageParam / buildPagination / formatNewsDate); `lib/news.ts` gains
`listPublishedNewsPage()` and DROPS its dead `featured`-first sort (only /news read it; the
frontpage always re-sorted by date) — `News.featured` stays in the model but is now inert for news.
Deliberately excluded: tag filters, featured hero, archive nav. Prior phases: Phase 1 (foundation)
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
