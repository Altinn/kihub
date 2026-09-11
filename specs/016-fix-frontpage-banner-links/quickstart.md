# Quickstart: Validate distinct frontpage banner destinations

## Prerequisites

- Local dev stack running: `pnpm --filter web dev` (Postgres + the web app; see
  `documentation/` for local DB setup if not already running).
- Migration applied: `pnpm --filter web migrate` (after the `projects` migration is generated —
  see tasks.md).
- Signed in as an employee (any role) for the employee app; a Contributor+ account for `/cms`.

## Scenario 1 — Frontpage tiles resolve to different destinations (FR-001/002, SC-001)

1. Open `/` (frontpage).
2. Click "Verktøy" → expect `/registry` (unchanged).
3. Go back, click "KI Prosjekter i BOD" → expect `/prosjekter`, NOT `/registry`.

## Scenario 2 — Empty state before any content exists (FR-008)

1. With zero `projects` documents in the database, open `/prosjekter`.
2. Expect a clear "no projects yet" message, not an error or blank page.

## Scenario 3 — Editor publishes a project, employee sees it (US3, FR-003/004/006, SC-002)

1. In `/cms`, create a `Projects` entry: title "Test-prosjekt", summary "En kort beskrivelse",
   body with some rich text, status `published`.
2. As an employee, open `/prosjekter` → expect a card titled "Test-prosjekt" with the summary.
3. Click the card → expect `/prosjekter/test-prosjekt` (or the auto-slug) showing the full body.

## Scenario 4 — Drafts never leak (FR-007/009, SC-003)

1. In `/cms`, create a second entry with status `draft`.
2. As an employee, open `/prosjekter` → the draft entry must NOT appear in the list.
3. Directly visit `/prosjekter/<draft-slug>` → expect a 404, not the draft content.

## Scenario 5 — Regression: Verktøy unaffected (US2)

1. Confirm `/registry` itself still renders the full tool catalog exactly as before this change
   (no visual or functional diff) — this feature touches no Registry/Artifact code.
