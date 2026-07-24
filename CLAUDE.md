<!-- SPECKIT START -->
Active feature: **010-home-widgets** (in progress — specify done; clarify/plan/tasks/implement to
follow). It surfaces the deferred home-page widget both News and Calendar/Events left open: an
additive, employee-app, read-only landing page that shows the latest published news + upcoming
published events (reusing `lib/news.ts::listPublishedNews`, `lib/events.ts::listUpcomingEvents` and
the `NewsCard`/`EventCard` components) — ZERO new collections/schema/migrations/deps. For
requirements read `specs/010-home-widgets/spec.md` (plan/research/data-model/contracts/quickstart to
follow in the same directory). Highest-impact open question deferred to clarify: what `/` becomes
(dashboard vs. sidebar vs. catalog-moves-to-a-new-route). Prior phases: Phase 1 (foundation)
`specs/001-phase1-foundation/`; Phase 2 (catalog) `specs/002-catalog/`; Phase 3 (governance)
`specs/003-governance/`; Phase 4 (automated discovery) `specs/004-automated-discovery/`; Phase 5
(full-text search) `specs/005-fulltext-search/`; Phase 6 (editor back-office)
`specs/006-editor-backoffice/`; Phase 7 (news) `specs/007-news/`; governance-UI reconcile
`specs/008-governance-ui-reconcile/`; Phase 8 (calendar/events) `specs/009-calendar-events/`.
Governance rules: `.specify/memory/constitution.md` (v2.0.0 — KI Hub is an employee portal:
Registry + News + Calendar, two surfaces).
<!-- SPECKIT END -->
