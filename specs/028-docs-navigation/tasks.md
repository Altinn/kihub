---
description: "Task list for 028 — documentation navigation for Pages"
---

# Tasks: Documentation Navigation for Pages

**Input**: Design documents from `/specs/028-docs-navigation/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md) (R1–R16),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: INCLUDED. The constitution's Testing gate requires access and rule tests for changed modules,
and the design depends on pure functions (anchors, addresses, section tree) that are cheapest to pin
down with unit tests.

**Organization**: grouped by user story. Each story is one PR after the spec PR (plan.md «Delivery»):
US1 → PR 1, US2 → PR 2, US3 → PR 3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 … US3 from spec.md
- Paths are repo-relative; `web/` means `apps/web/`

## Conventions for every task

- Run tests with env exported: `cd apps/web && set -a && source .env && set +a && pnpm test`.
- `DATABASE_URI` points at the per-branch clone `kihub_028` (T002), never the shared `kihub` DB.
- Generate migrations and types with `MEDIA_STORAGE_MODE=azure`.
- Norwegian for every editor- and employee-visible string; Designsystemet classes and `--ds-*` tokens only, no custom properties of the app's own; no client components.
- Constitution Accessibility gate: every story PR runs axe (no violations) and a keyboard pass on the routes it changes.

---

## Phase 1: Setup

- [x] T001 Confirm the branch is based on current `origin/main` with Payload 3.92.1; run `pnpm --filter web test` once and record the baseline pass count in Notes below.
- [x] T002 Create the per-branch DB `kihub_028` (`createdb -T kihub kihub_028` in `kihub-postgres`), point `apps/web/.env` at it, and add a launch config `kihub-web-028` (port 3028) to `.claude/launch.json`.
  *Done:* `kihub_028` was created EMPTY and migrated (`pnpm migrate`), not cloned: the clone of `kihub_027` was behind main and push mode stopped on an interactive rename prompt. The launch config lives outside the repo (not committed).

---

## Phase 2: Foundational

No shared foundation blocks all stories: US1 needs nothing from US2/US3, and US2's foundation is its own
migration. Governance lands in the spec PR.

- [x] T003 Amend `.specify/memory/constitution.md` 4.2.0 → 4.3.0 (research R16): Pages bullet, Sync Impact Report. Done in the spec PR (Altinn/kihub#181).

---

## Phase 3: User Story 1 — anchors and table of contents (P1) 🎯 MVP · PR 1

**Goal**: every h2–h4 on Pages and KI Læring pages has an ASCII anchor and a self-link; pages with two or more headings show «På denne siden».

**Independent Test**: quickstart §1.

### Tests for US1

- [x] T004 [P] [US1] Unit tests in `web/tests/unit/headings.test.ts` for contract headings-toc A1–A4: text extraction (formatting, inline code, links, linebreak), anchor rules and examples, duplicate and literal-suffix collisions, `avsnitt`, `RESERVED_ANCHORS`, an h1 node counted as h2, skipped levels in `toTocTree`, empty and `null` body. Plus `web/tests/unit/reserved-anchors.test.ts` (contract E): every fixed `id` in the layout components is in `RESERVED_ANCHORS`.
- [ ] T005 [P] [US1] Unit render test in `web/tests/unit/learning-body-anchors.test.ts` (vitest only picks up `*.test.ts` in a `node` environment, so use `renderToStaticMarkup(createElement(…))` from `react-dom/server`, no JSX; the repo has no component tests yet, so check that `RichText` renders server-side in vitest first, and fall back to asserting the converter output directly if it does not): render `LearningBody` and `PageToc` from one fixture; ids unique; every TOC `href` matches a heading id; self-link `aria-label` names the heading; `PageToc` renders nothing for < 2 headings; `dsConverterOverrides` without `headingIds` renders exactly as before.
  *Not done as a render test:* vitest cannot parse JSX (CLAUDE.md, 026), so the converter and `PageToc` markup are verified in the browser (T011). The pure guarantee (every TOC entry is a body anchor, ids unique) is in `headings.test.ts`, and `ds-richtext.test.ts` still pins the unchanged path.

### Implementation for US1

- [x] T006 [US1] Create `web/src/lib/headings.ts` (`extractHeadings`, `toTocTree`, `RESERVED_ANCHORS`) per contract A, reusing `slugify` from `web/src/lib/slug.ts` and `richTextHeading` from `web/src/lib/ds-richtext.ts`. Makes T004 pass.
- [x] T007 [US1] Add the optional `headingIds` to `dsConverterOverrides` in `web/src/lib/ds-richtext-converters.tsx` (contract B1: `.app-heading` wrapper and self-link only when the node is in the map). Change `web/src/components/LearningBody.tsx` (contract B2): optional `headings` prop, per-render `WeakMap`, converters created inside the component.
- [x] T008 [P] [US1] Create `web/src/components/PageToc.tsx` per contract C.
- [x] T009 [US1] Use them in `web/src/app/(app)/[slug]/page.tsx` and `web/src/app/(app)/laering/[slug]/page.tsx`: compute headings once, render `PageToc` between the header and `LearningBody`, pass `headings` to `LearningBody`. Makes T005 pass.
- [x] T010 [P] [US1] CSS in `web/src/styles/app.css`, new «028 headings and table of contents» section per contract D (anchor reveal, 24px target, rhythm rules extended to `.app-heading`, `scroll-margin-top`, `:target`, reduced motion, 75rem two-column article, sticky scrolling TOC, collapsed variant).
- [ ] T011 [US1] Quickstart §1 in the browser, including JavaScript disabled, 375px, 400% zoom, VoiceOver and axe. Compare heading spacing with `main` on a page with a heading first in the body, two headings in a row and every level (the `.app-heading` wrapper must not change the rhythm); fix findings.
  *Partly done (2026-11-10):* anchors, TOC nesting, sticky right column at 1280px, collapsed TOC at 375px, `:target` marker, KI Læring page, axe 0 violations on a section page, `/kom-i-gang` and a KI Læring page. Heading spacing unchanged by the wrapper (36px above, 9px below, the same `--ds-size-8`/`--ds-size-2` rules). Keyboard: after the skip link, Tab reaches the menu, the TOC links, then each «#» link, which becomes visible on focus. Not yet: VoiceOver, JavaScript disabled (all of it is server-rendered `<details>`/links, but untested), 400% zoom (375px tested).
- [x] T012 [US1] Editor note (Norwegian, for the release message): anchors come from heading text and change when it changes; how to write `/adresse#anker`.
  *Done:* in README «Sider (Pages)»; reuse it for the release message.

**Checkpoint**: PR 1 can be reviewed and merged alone.

---

## Phase 4: User Story 2 — hierarchy and nested addresses (P1) · PR 2

**Goal**: Pages get «Overordnet side» and «Rekkefølge»; addresses nest up to three segments; old and moved addresses redirect by last segment.

**Independent Test**: quickstart §2.

### Tests for US2

- [x] T013 [P] [US2] Unit tests in `web/tests/unit/page-tree.test.ts` for `parsePagePath` and `pageAddress` (contract page-hierarchy C, I).
- [x] T014 [P] [US2] Integration tests in `web/tests/integration/pages-hierarchy.test.ts`: self-parent, cycle, fourth level (as child and by moving a subtree) refused with 400 and the Norwegian message via the local API with `overrideAccess: false`; valid three-level chain accepted; deleting a parent sets children's `parent` to null.
- [x] T015 [US2] Extend `web/tests/integration/pages-access.test.ts`: resolution by last segment for readers and in preview (populated chain, draft parents); draft child under published parent → `null` for readers; published child under a never-published parent → resolves with a flat reader address.
  *Done in* `tests/integration/pages-hierarchy.test.ts` *(addresses block) instead of extending* `pages-access.test.ts`.

### Implementation for US2

- [x] T016 [US2] Add `parent` and `order` to `web/src/collections/Page.ts` (contract A), update the `slug` description and `defaultColumns`.
- [x] T017 [US2] Create `web/src/lib/page-hierarchy.ts` (`validatePageParent`, contract B) and register it as a second `beforeValidate` hook in `Page.ts`. Makes T014 pass.
- [x] T018 [US2] Generate the migration `web/src/migrations/<ts>_pages_hierarchy.{ts,json}` (data-model §3), review it, register it in `web/src/migrations/index.ts`; verify up and down on a scratch DB, then apply to `kihub_028`. Regenerate `web/src/payload-types.ts`.
- [x] T019 [US2] Create `web/src/lib/page-tree.ts` with `MAX_PAGE_DEPTH`, `parsePagePath`, `pageAddress` with `publishedOnly` (contract C). Makes T013 pass.
- [x] T020 [US2] Change `getPageBySlug` in `web/src/lib/pages.ts` to populate the parent chain (`depth: 2`; preview with `draft: true`, fallback walk per research R10). Makes T015 pass.
- [x] T021 [US2] Move `web/src/app/(app)/[slug]/page.tsx` to `web/src/app/(app)/[...path]/page.tsx` and implement contract E steps 1–5 (parse, read, canonical with `publishedOnly: !preview`, 307 redirect with query, render with US1's TOC).
- [x] T022 [P] [US2] Update `web/tests/unit/page-slug.test.ts` (catch-all is `[...path]`) and `web/tests/unit/route-caching.test.ts` (`[...path]/page.tsx`); update the comments in `web/src/lib/page-slug.ts` and `web/src/collections/Page.ts` that say pages are flat.
- [x] T023 [P] [US2] (FR-018, SHOULD) `web/src/components/cms/PageAddressField.tsx` and the `address` `ui` field in `Page.ts`; regenerate `web/src/app/(payload)/cms/importMap.js`. May be split out if it delays the PR.
- [ ] T024 [US2] Quickstart §2 in the browser, including the move-and-move-back redirect check; fix findings.
  *Partly done (2026-11-10):* §2.1–2.5 and §2.11 via fetch (307 confirmed in the server log, query and `#anchor` kept); §2.6 on the API path by integration tests; the CMS form shows the new fields and the address. Also done: refusals via `PATCH /payload-api/pages/:id` as a contributor (400 with the Norwegian messages); move to «Agenter» and back, with no redirect loop; delete «Agenter» (404 after); «Forhåndsvis» on the draft opens `/kom-i-gang/lag-en-agent-for-teamet` with the banner. Not yet: refusals shown in the CMS form itself, the site menu item marked current (no Site Chrome item in the test DB).

**Checkpoint**: PR 2 merged before the «Kom i gang» pages are published.

---

## Phase 5: User Story 3 — section menu (P2) · PR 3

**Goal**: pages in a section show a menu of the section's published Pages, in KI Læring's shell. The skip link already exists (026).

**Independent Test**: quickstart §3.

### Tests for US3

- [x] T025 [P] [US3] Extend `web/tests/unit/page-tree.test.ts` for `buildPageSection` (order then title, grandchildren nested, current marked, unpublished root → null, root-only → null).
- [x] T026 [P] [US3] Integration tests in `web/tests/integration/pages-section.test.ts`: `getPageSection` is published-only (also with preview active), ordered, `null` for an unpublished root.
  *Done in* `tests/integration/pages-hierarchy.test.ts` *(section block).*

### Implementation for US3

- [x] T028 [US3] Add `buildPageSection` to `web/src/lib/page-tree.ts` and `getPageSection` to `web/src/lib/pages.ts` (contract C, D); replace the «no listing function» comment. Makes T025, T026 pass.
- [x] T029 [US3] Create `web/src/components/DocShell.tsx` (contract G, no `<main>`) and reduce `web/src/components/LearningShell.tsx` to a wrapper over it; KI Læring markup and behaviour unchanged.
- [x] T030 [P] [US3] Create `web/src/components/SectionNav.tsx` (contract F).
- [x] T031 [US3] Render `DocShell` with `SectionNav` in `web/src/app/(app)/[...path]/page.tsx` (contract E steps 6–7); a page without a section keeps today's look (FR-025, contract G note).
- [x] T032 [P] [US3] CSS in `web/src/styles/app.css`: `.app-section-nav__sublist` nesting under KI Læring's nav styles; nothing else.
- [ ] T033 [US3] Quickstart §3 in the browser, including the skip link, a keyboard pass and axe; fix findings.
  *Partly done (2026-11-10):* menu order, draft omitted, current page marked, collapsed at 375px, one `main`, axe 0 violations. Keyboard pass done (see T011). In preview the menu still lists published pages only. Not yet: VoiceOver landmarks, unpublishing the root in the browser (covered by an integration test).

**Checkpoint**: all three stories done.

---

## Phase 6: Polish & Cross-Cutting

- [x] T034 Update `CLAUDE.md` Spec Kit active-feature block to 028 (summary, gotchas: `version_parent_id` vs `_pages_v.parent_id`; 307 not 308; anchors are ASCII because of Payload's link validator; readers get a flat address under an unpublished parent).
- [x] T035 Run the full suite, lint, `tsc --noEmit` and `next build` (`AUTH_MODE=entra`, migrated scratch DB); record counts in Notes.
  *Done:* see Notes.
- [x] T036 Update the editors' guide for Pages (wherever 027 documented it) with «Overordnet side», «Rekkefølge», addresses and anchors.

---

## Dependencies & Execution Order

- **Spec PR** (T003) before any story PR.
- **US1** (T004–T012): independent. Merge first.
- **US2** (T013–T024): independent of US1 in logic; T021 moves the file US1's T009 edits, so rebase on US1 if both are open.
- **US3** (T025–T033): depends on US2 (parent chain, catch-all route) and on US1's CSS area in `app.css`.
- Within a story: tests first (they fail), then implementation, then the browser walkthrough.

### Parallel opportunities

- US1: T004, T005 together; T008 and T010 alongside T006–T007.
- US2: T013, T014 together; T022 and T023 alongside T019–T021.
- US3: T025, T026 together; T030 and T032 alongside T028–T029.

## Notes

- Baseline (2026-11-10, branch at `a150810`, migrated `kihub_028`): 61 files, 598 tests passed.
- After 028 (2026-11-10): 65 files, 646 tests passed; `pnpm lint` and `tsc --noEmit` clean;
  `next build` (`AUTH_MODE=entra`, migrated scratch DB `kihub_028_mig`) green, `/[...path]` dynamic.
- Migration `20261110_081248_pages_hierarchy` verified up, down and up again on an empty scratch DB.
