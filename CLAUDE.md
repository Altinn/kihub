<!-- SPECKIT START -->
Active feature: **012-events-page-redesign** (DONE — specify + plan + tasks + implement complete;
suite 187/187 across 27 files, lint + prod build green). For technologies, structure, and context
read the plan:
`specs/012-events-page-redesign/plan.md` (with `research.md`, `data-model.md`, `contracts/`,
`quickstart.md`; `spec.md` for requirements). It rebuilds `/events` ("Arrangementer") into the old
KI HUB app's calendar page restyled on the **kihub design system**: a Kalender | Liste segmented
toggle; a list view of upcoming published events grouped under Norwegian date chips with a
link-based TYPE (webinar/verksted/kurs/konferanse/internt, multi) + FORM (digitalt/oppmøte/hybrid,
single) filter sidebar; a calendar view as a Monday-first 6×7 Oslo-time month grid with
type-colored entries (`--ev-cat-*` aliases of theme tokens), legend, today-highlight and
URL-driven month nav — all server-rendered (`?view/month/type/form`), no client JS, no new deps.
Payload `events` gains eventType/format/channel/capacity/seatsTaken (one prod migration with
format backfill; local dev is push-mode); new pure `lib/events-view.ts` owns all grid/grouping/
label math; detail page kihub-restyled in Norwegian with badge/meta/ICS; frontpage event cards
show eventType label instead of tags[0]. Prior phases: Phase 1 (foundation)
`specs/001-phase1-foundation/`; Phase 2 (catalog) `specs/002-catalog/`; Phase 3 (governance)
`specs/003-governance/`; Phase 4 (automated discovery) `specs/004-automated-discovery/`; Phase 5
(full-text search) `specs/005-fulltext-search/`; Phase 6 (editor back-office)
`specs/006-editor-backoffice/`; Phase 7 (news) `specs/007-news/`; governance-UI reconcile
`specs/008-governance-ui-reconcile/`; Phase 8 (calendar/events) `specs/009-calendar-events/`;
home-page widgets `specs/010-home-widgets/`; frontpage redesign `specs/011-frontpage-redesign/`
(DONE, suite 134/134 → now 141/141 with deploy-phase tests). Governance rules:
`.specify/memory/constitution.md` (v3.0.0 — KI Hub is an employee portal: Registry + News +
Calendar, two surfaces; Design System constraint = Designsystemet as FOUNDATION with the generated
KI Hub theme (`designsystemet.config.json` + `pnpm --filter web theme:build`) + kihub token layer;
custom presentational components sanctioned on the tokens).
<!-- SPECKIT END -->
