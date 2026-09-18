# Quickstart: Validate the redesigned subscriptions banner

## Prerequisites

- Local dev stack running: `pnpm --filter web dev` (Postgres + the web app).
- Migration applied: `pnpm --filter web migrate` (after the migration for this feature is
  generated — see tasks.md).
- Signed in as an employee (any role) for the employee app; a Contributor+ account for `/cms`.

## Scenario 1 — Tool chips are genuinely clickable (US1, FR-001/002/003, SC-001)

1. Open `/` (frontpage) and find "Støttede KI-abonnementer i Digdir".
2. Click "GitHub Copilot" → expect a modal to open with a short explanation.
3. Close it (the × close button, or Escape) → expect the modal to close and focus to return to the
   page.
4. Repeat for "Claude Teams".

## Scenario 2 — Request-access path exists (US2, FR-004/005, SC-002)

1. On the same banner, click "Hvordan bestille tilgang?".
2. Expect a modal with instructions to open (at minimum, who to contact for a subscription).
3. Confirm clicking it did not navigate away, submit a form, or trigger any purchase/order —
   the page stays on `/` with the instructions shown in the modal.
4. Close it (the × close button, or Escape) → expect the modal to close.

## Scenario 3 — Visual hierarchy without clicking (US3, FR-006, SC-003)

1. Reload `/` and, without clicking anything, compare "GitHub Copilot"/"Claude Teams" against
   "Hvordan bestille tilgang?".
2. Confirm the two tool chips are fully pill-shaped and "Hvordan bestille tilgang?" is a
   rectangular icon-led button on its own row below them — matching the shape distinction in the
   issue's own inspiration image.

## Scenario 4 — Keyboard and no-JS operation (FR-008/009, SC-005)

1. Tab to "GitHub Copilot" using only the keyboard; confirm a visible focus ring, then press
   Enter or Space → expect the modal to open; close it and confirm focus returns sensibly.
2. Repeat for "Hvordan bestille tilgang?".
3. Disable JavaScript in a browser that does NOT yet natively support the HTML Invoker Commands
   API and repeat steps 1–2 → expect it to no longer work (research.md R5, "Trade-off knowingly
   accepted" — this differs from most of this codebase's other disclosures, which are pure
   `<details>`/`<summary>` and JS-independent in every browser). In a browser that DOES support it
   natively (e.g. current Chrome/Chromium), it continues to work with JavaScript disabled.

## Scenario 5 — Editor manages the content (FR-007, SC-004)

1. In `/cms`, open the "Frontpage (hero, tiles, subscriptions)" global.
2. Edit a chip's explanation text (or add a new chip with a name + explanation) and edit the
   "Hvordan bestille tilgang?" label/instructions, then save.
3. As an employee, reload `/` → expect the updated text to appear, with no code change or
   deployment.

## Scenario 6 — Empty chips list doesn't break the banner (Edge Case, FR-010)

1. In `/cms`, remove all entries from the subscriptions `chips` array and save.
2. As an employee, reload `/` → expect the heading/description and "Hvordan bestille tilgang?"
   to still render cleanly, with no broken layout or empty bordered gap where the chips were.
3. Restore the chips afterward (or reset the global to defaults) so other manual testing isn't
   left in a stripped state.

## Scenario 7 — Regression: frontpage tiles unaffected (FR-011)

1. Confirm "Verktøy" still links to `/registry` and "KI Prosjekter i BOD" still links to
   `/prosjekter` (Altinn/kihub#135, feature 016) — this feature touches no tile code.
2. Run `pnpm --filter web test -- frontpage-defaults` → expect it to still pass unmodified.
