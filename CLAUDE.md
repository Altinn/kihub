<!-- SPECKIT START -->
Active feature: **011-frontpage-redesign** (DONE — specify + clarify + plan + tasks + implement
complete; suite 134/134 across 24 files). For technologies, structure, and context read the plan:
`specs/011-frontpage-redesign/plan.md` (with `research.md`, `data-model.md`, `contracts/`,
`quickstart.md`; `spec.md` for requirements). It rebuilds `/` from the 010 widgets dashboard into
the full portal frontpage (old KI HUB layout, restyled with the **kihub design system** imported
under `apps/web/src/styles/kihub/` — white ground, one Digdir-blue accent, Source Serif 4):
CMS-driven site header + footer (replace `PortalHeader` on ALL employee pages), CMS-driven hero,
two nav tiles and "Tilgjengelige abonnementer" banner (two NEW Payload globals `site-chrome` +
`frontpage`, Contributor+ update gate, code-seeded defaults), "Hva skjer i BOD" events section
(chronological next-1 + timeline-4 via pure `frontpage-select`, plus a NEW `/events/[slug]/ics`
route from pure `lib/ics.ts`), and "Siste nytt" (latest 4 published news, chronological). No new
deps; News/Events read libs unchanged. Prior phases: Phase 1 (foundation)
`specs/001-phase1-foundation/`; Phase 2 (catalog) `specs/002-catalog/`; Phase 3 (governance)
`specs/003-governance/`; Phase 4 (automated discovery) `specs/004-automated-discovery/`; Phase 5
(full-text search) `specs/005-fulltext-search/`; Phase 6 (editor back-office)
`specs/006-editor-backoffice/`; Phase 7 (news) `specs/007-news/`; governance-UI reconcile
`specs/008-governance-ui-reconcile/`; Phase 8 (calendar/events) `specs/009-calendar-events/`;
home-page widgets `specs/010-home-widgets/` (superseded by 011 on the `/` route). Governance
rules: `.specify/memory/constitution.md` (v3.0.0 — KI Hub is an employee portal: Registry + News +
Calendar, two surfaces; Design System constraint = Designsystemet as FOUNDATION with the generated
KI Hub theme (`designsystemet.config.json` + `pnpm --filter web theme:build`) + kihub token layer;
custom presentational components sanctioned on the tokens, 011's deviation resolved).
<!-- SPECKIT END -->
