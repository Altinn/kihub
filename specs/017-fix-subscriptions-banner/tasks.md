# Tasks: Genuinely interactive subscriptions banner

**Input**: Design documents from `/specs/017-fix-subscriptions-banner/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — this repo's established convention (011–016) is automated coverage for every
content-model and rendering change to `site-content-defaults.ts`/`SubscriptionsBanner`, matching the
Constitution's Development Workflow testing gate.

**Organization**: Tasks are grouped by user story (US1/US2/US3 map to spec.md's priorities: US1 =
P1, US2 = P1, US3 = P2).

## Path Conventions

Single existing app: `apps/web/src/` (Next.js App Router + Payload CMS), `apps/web/tests/`. All
paths below are relative to the repo root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Land the schema change every user story depends on — the `subscriptions` group's new
`chips[].description`, `chips[].href` removal, and `requestAccess` group.

- [X] T001 Update `apps/web/src/lib/site-content-defaults.ts`: change `Chip` to `{ name: string;
      description?: string }` (drop `href`); add `export interface RequestAccess { label: string;
      body: string }`; add `requestAccess: RequestAccess` to `SubscriptionsContent`; update
      `DEFAULT_FRONTPAGE.subscriptions` — give "GitHub Copilot" and "Claude Teams" each a short
      Norwegian `description`, and add `requestAccess: { label: 'Hvordan bestille tilgang?', body:
      'Ta kontakt med KITT-teamet på kitt@digdir.no for å be om tilgang. Oppgi hvilket abonnement du
      ønsker og hvilken avdeling du tilhører, så hjelper vi deg videre.' }`. See data-model.md.
- [X] T002 Update `apps/web/src/globals/Frontpage.ts`: in the `subscriptions` group's `chips` array
      fields, remove the `href` field and add `{ name: 'description', type: 'textarea' }`; add a new
      `requestAccess` group field (`label`: text, `body`: textarea) with `defaultValue`s sourced from
      `DEFAULT_FRONTPAGE.subscriptions.requestAccess`. See
      contracts/subscriptions-field-contract.md.
- [X] T003 Generate the Postgres migration: run `pnpm --filter web migrate:create
      subscriptions_request_access` (creates
      `apps/web/src/migrations/<timestamp>_subscriptions_request_access.ts` + `.json`, appends to
      `apps/web/src/migrations/index.ts`). Verify the generated SQL matches
      contracts/subscriptions-field-contract.md's migration contract (add
      `frontpage_subscriptions_chips.description`, drop `frontpage_subscriptions_chips.href`, add
      `frontpage.subscriptions_request_access_label`/`_body`); hand-patch `down` with `IF EXISTS` if
      the generator reproduces the CASCADE/named-drop ordering bug noted in research.md R4 (not
      expected here since no table is dropped, but verify rather than assume).
- [X] T004 Verify the migration on a scratch database (e.g. `kihub_migtest_017`): `payload migrate`
      UP and DOWN both run clean. Do not run `payload migrate` against the shared push-mode local
      dev DB directly (documented gotcha); let the dev DB pick up the schema via Payload's dev
      push-mode on next app start instead.
- [X] T005 Regenerate Payload types: `pnpm --filter web payload generate:types` →
      `apps/web/src/payload-types.ts` reflects the new `Frontpage` shape (chips `description`, no
      `href`; new `subscriptions.requestAccess`).

**Checkpoint**: The `frontpage` global's schema and generated types match data-model.md; `/cms` can
already show the new fields (`description` per chip, the `requestAccess` group) even though nothing
reads them yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The read layer every user-facing rendering change depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Update `mergeFrontpage` in `apps/web/src/lib/site-content.ts`: map each stored chip to
      `{ name, description: c.description ?? undefined }` (no more `href`); map stored
      `subscriptions.requestAccess` to `{ label: doc.subscriptions.requestAccess?.label ??
      DEFAULT_FRONTPAGE.subscriptions.requestAccess.label, body: doc.subscriptions.requestAccess?.body
      ?? DEFAULT_FRONTPAGE.subscriptions.requestAccess.body }`, following the same per-field fallback
      style already used for `hero.primaryCta`/`secondaryCta`. See
      contracts/subscriptions-field-contract.md (Read-layer contract).

**Checkpoint**: Foundation ready — `getFrontpageContent()` returns the new shape end-to-end; User
Stories 1, 2 and 3 can now proceed (all three touch the same component, but each is independently
verifiable per its own acceptance scenarios).

---

## Phase 3: User Story 1 - Employee checks what a listed tool is (Priority: P1) 🎯 MVP

**Goal**: "GitHub Copilot" and "Claude Teams" become genuinely interactive — clicking either reveals
a short explanation, clicking again closes it — replacing today's non-functional bordered `<span>`s.

**Independent Test**: Click "GitHub Copilot" (and "Claude Teams") on the frontpage banner; confirm a
short explanation appears, and confirm it collapses on a second click.

### Tests for User Story 1

- [X] T007 [P] [US1] New unit test `apps/web/tests/unit/subscriptions-banner-view.test.ts`: assert
      `DEFAULT_FRONTPAGE.subscriptions.chips` has no `href` field and every seeded chip has a
      non-empty `description` (pins FR-001/002 at the content layer — a future edit can't silently
      reintroduce a dead `href` or a chip with nothing to show).

### Implementation for User Story 1

- [X] T008 [US1] Rewrite the chip rendering in `apps/web/src/components/SubscriptionsBanner.tsx`:
      replace the `chip.href ? <a> : <span>` branch with a `<details className="fp-subscriptions__disclosure">`
      containing `<summary className="kihub-btn kihub-btn--secondary kihub-focusable
      fp-subscriptions__summary">{chip.name}</summary>` and, when `chip.description` is set, a
      `<p className="fp-subscriptions__panel">{chip.description}</p>`. Remove the old `chipStyle`
      inline style object entirely. See contracts/subscriptions-banner-ui.md.
- [X] T009 [US1] Add the `fp-subscriptions__*` CSS rules to `apps/web/src/styles/portal.css`
      (grouped near the existing `011`/subscriptions-banner section, or a new commented `017`
      section): `.fp-subscriptions__summary { list-style: none; cursor: pointer; }`,
      `::-webkit-details-marker { display: none; }`, `::after` chevron (▾/▴ on `[open]`) matching the
      `.lp-nav__group-title` precedent, and `.fp-subscriptions__panel` subdued body-copy styling —
      every value resolved through existing `--kihub-*` tokens. See
      contracts/subscriptions-banner-ui.md (CSS contract).

**Checkpoint**: User Story 1 is fully functional — every tool chip is a real, keyboard-operable,
no-JS-required disclosure with visible open/close behavior.

---

## Phase 4: User Story 2 - Employee finds out how to request access (Priority: P1)

**Goal**: A new "Hvordan bestille tilgang?" element reveals request-access instructions on click —
a path that does not exist in the banner today.

**Independent Test**: Click "Hvordan bestille tilgang?" on the frontpage banner; confirm
request-access instructions appear (at minimum, who to contact), collapse on a second click, and
confirm nothing is purchased/ordered/submitted by the click itself.

### Tests for User Story 2

- [X] T010 [P] [US2] Extend `apps/web/tests/unit/subscriptions-banner-view.test.ts` (T007): assert
      `DEFAULT_FRONTPAGE.subscriptions.requestAccess` exists with non-empty `label` and `body`
      (pins FR-004 at the content layer — the CTA can never be silently dropped or left blank).

### Implementation for User Story 2

- [X] T011 [US2] Add the "Hvordan bestille tilgang?" disclosure to
      `apps/web/src/components/SubscriptionsBanner.tsx`, rendered unconditionally after the chip
      list: `<details className="fp-subscriptions__disclosure fp-subscriptions__disclosure--cta">`
      containing `<summary className="kihub-btn kihub-btn--primary kihub-focusable
      fp-subscriptions__summary">{subscriptions.requestAccess.label}</summary>` and
      `<p className="fp-subscriptions__panel">{subscriptions.requestAccess.body}</p>`. See
      contracts/subscriptions-banner-ui.md.

**Checkpoint**: User Story 2 is fully functional — employees have a one-click path from the frontpage
to request-access instructions, purely informational.

---

## Phase 5: User Story 3 - Employee visually distinguishes "what is this" from "how do I get it" (Priority: P2)

**Goal**: Confirm, without any further code beyond US1/US2's styling, that the tool chips and the
CTA read as two different visual weights at a glance.

**Independent Test**: Show the unexpanded banner to someone and confirm they correctly identify which
element(s) answer "what is this tool" versus "how do I get it," from appearance alone.

### Tests for User Story 3

- [X] T012 [US3] Extend `apps/web/tests/integration/site-content-access.test.ts`'s existing
      `subscriptions` assertions (already comparing against `DEFAULT_FRONTPAGE.subscriptions`, so
      they stay correct after T001) to also assert the merged `requestAccess` round-trips through
      `mergeFrontpage`/`getFrontpageContent` for a stored doc that only sets `subscriptions.heading`
      (i.e. `requestAccess` falls back to the seeded default per-field, matching T006's rule).

### Implementation for User Story 3

- [X] T013 [US3] Manual verification only (no new code — the visual distinction is a direct
      consequence of T008/T011 already using different `kihub-btn` modifiers): confirm in a browser
      that the two chips share one look and "Hvordan bestille tilgang?" is visibly heavier, per
      quickstart.md Scenario 3.

**Checkpoint**: All three user stories are independently verified — chips are interactive, the
request-access path exists, and the two are visually distinct without clicking.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T014 [P] Confirm `apps/web/tests/unit/frontpage-defaults.test.ts` (the Altinn/kihub#135
      regression guard) still passes unmodified — this feature must not touch `DEFAULT_FRONTPAGE.tiles`
      (spec FR-011).
- [X] T015 [P] Update `apps/web/tests/integration/site-content-access.test.ts`'s empty-chips path (or
      add a small unit test) covering spec Edge Case / FR-010: an empty `subscriptions.chips` array
      still renders the heading/description/CTA with no broken layout.
- [X] T016 Run `pnpm --filter web lint` and `pnpm --filter web test` (full suite) and fix any
      failures; confirm no regression beyond the expected new tests.
- [X] T017 Run `pnpm --filter web build` (prod build) and confirm it compiles/typechecks cleanly
      (same pre-existing `AUTH_MODE=mock` production-gate caveat as prior features, if it recurs).
- [X] T018 Walk through quickstart.md end-to-end manually against the local dev stack (all 7
      scenarios, including the keyboard-only and JS-disabled checks in Scenario 4).
- [X] T019 [P] Update `CLAUDE.md`'s managed Spec Kit status section to mark 017 as the active/done
      feature (per this repo's convention of a rich per-feature summary paragraph, matching 014–016),
      including the suite count and any notable implementation gotchas discovered along the way.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 (needs the new field shapes to map).
- **User Story 1 (Phase 3)**: Depends on Phase 2 (needs `mergeFrontpage` returning `description`).
- **User Story 2 (Phase 4)**: Depends on Phase 2 (needs `mergeFrontpage` returning `requestAccess`);
  can run in parallel with Phase 3 — different JSX region of the same file, no shared new state.
- **User Story 3 (Phase 5)**: Depends on Phase 3 AND Phase 4 (it verifies their combined visual
  result and the read-layer fallback both add).
- **Polish (Phase 6)**: Depends on all of the above.

### Parallel Opportunities

- T001–T005 (Phase 1) are sequential (each depends on the previous step's schema/types).
- T007 and T010 (test-file edits) touch the same new test file sequentially in practice, but are
  logically independent per story and may be written together in one pass.
- T008 (US1) and T011 (US2) touch the same component file — coordinate rather than parallelize, even
  though they're listed under different stories.
- T014 and T015 (Polish) can run in parallel with each other.

---

## Implementation Strategy

### MVP First

1. Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (User Story 1). At this point the reported
   false-affordance bug (Altinn/kihub#144) is fixed end-to-end: every tool chip is genuinely
   clickable.
2. Phase 4 (User Story 2) closes the other half of the issue — the missing request-access path —
   and is cheap to add right after Phase 3 since it's the same component file.
3. Phase 5 (User Story 3) is a verification-only pass confirming the styling choices already made in
   Phases 3–4 read correctly together.
4. Phase 6 closes out documentation and full-suite verification.

---

## Post-implementation revision (T020–T023)

After all 19 tasks above shipped and were manually verified, direct user review against the
issue's own attached inspiration image asked for two changes: a real modal instead of the inline
`<details>` disclosure, and closer visual matching to that image (dark card, fully pill-shaped
chips, an icon-led CTA). See research.md R5 for the full decision record.

- [X] T020 Add `apps/web/src/types/dom-invoker-commands.d.ts` (declaration-merging `command`/
      `commandfor` onto `ButtonHTMLAttributes`, not yet typed by `@types/react` 19.2).
- [X] T021 Rewrite `SubscriptionsBanner.tsx`: plain kihub-styled `<button command="show-modal"
      commandfor=...>` triggers (pill chips, icon-led CTA) opening `Dialog`/`DialogBlock` from
      `@digdir/designsystemet-react`, rendered as siblings of the card (not nested — see research.md
      R5 bug #2). Updated contracts/subscriptions-banner-ui.md to match.
- [X] T022 Add `.kihub-card--inverted` + `.fp-subscriptions__list`/`__chip`/`__cta`/`__icon`/
      `__dialog` to `portal.css`; removed the superseded `__disclosure`/`__summary`/`__panel` rules.
- [X] T023 Re-verify: `tsc --noEmit` clean, `eslint` clean, full suite still 360/360, live
      browser click-through on a fresh tab (chip dialogs + CTA dialog open with correct content,
      close via ×, zero console errors) — updated spec.md (FR-003/FR-009, two acceptance scenarios,
      two Assumptions bullets) and quickstart.md to match what shipped.
