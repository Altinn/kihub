<!-- SPECKIT START -->
Active feature: **010-home-widgets** (in progress — specify + clarify + plan done; tasks/implement to
follow). For technologies, structure, and context read the plan: `specs/010-home-widgets/plan.md`
(with `research.md`, `data-model.md`, `contracts/`, `quickstart.md`; `spec.md` for requirements). It
surfaces the deferred home-page widget both News and Calendar/Events left open: `/` becomes a pure
portal **dashboard** with three read-only widgets — latest published news (3), upcoming events (3),
featured/recommended Registry artifacts (3) — each with a "View all →" link; the Registry catalog +
full-text search **move to `/registry`**. Additive/read-only, reusing the existing published-only read
libs + `NewsCard`/`EventCard`/`ArtifactCard` — ZERO new collections/schema/migrations/deps. Prior phases: Phase 1 (foundation)
`specs/001-phase1-foundation/`; Phase 2 (catalog) `specs/002-catalog/`; Phase 3 (governance)
`specs/003-governance/`; Phase 4 (automated discovery) `specs/004-automated-discovery/`; Phase 5
(full-text search) `specs/005-fulltext-search/`; Phase 6 (editor back-office)
`specs/006-editor-backoffice/`; Phase 7 (news) `specs/007-news/`; governance-UI reconcile
`specs/008-governance-ui-reconcile/`; Phase 8 (calendar/events) `specs/009-calendar-events/`.
Governance rules: `.specify/memory/constitution.md` (v2.0.0 — KI Hub is an employee portal:
Registry + News + Calendar, two surfaces).
<!-- SPECKIT END -->
