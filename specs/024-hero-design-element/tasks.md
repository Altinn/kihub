# Tasks: Frontpage hero design element

**Input**: Design documents from `/specs/024-hero-design-element/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: none requested. Verification is the browser walk in quickstart.md.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 Extract element 1 from `Designelementer (For skjerm).pdf` (`pdftocairo -svg`). Keep
  only the coral circle + navy square paths, translated to the origin, with `viewBox="0 0 298 180"`
  and hex fills `#F05F63` / `#1E2B3C`, circle painted first (research R1–R2). Write it to
  `apps/web/public/brand/hero-design-element.svg`.

## Phase 2: User Story 1 — Employee sees the Digdir design element in the hero (P1) 🎯 MVP

**Goal**: The hero art slot shows the design element instead of the three-people illustration.

**Independent Test**: Open `/` at desktop width and see the coral circle + navy square right of
the heading.

- [x] T002 [US1] Point the hero `<Image>` at `/brand/hero-design-element.svg` with
  `width={298} height={180} unoptimized`. Keep `alt=""`, `role="presentation"`, `priority` and
  the inline style (research R3). File: `apps/web/src/components/FrontpageHero.tsx`.
- [x] T003 [US1] Delete `apps/web/public/brand/hero-illustration.jpg` and confirm that
  `grep -rn hero-illustration apps/web` returns nothing (FR-005).

## Phase 3: Polish & Verification

- [x] T004 Run `pnpm --filter web lint` and `pnpm --filter web exec tsc --noEmit`.
- [x] T005 Walk `specs/024-hero-design-element/quickstart.md` in the local dev server, including
  a screenshot of the hero at desktop width.

## Dependencies & Execution Order

T001 → T002 → T003 → T004 → T005. All tasks are sequential, and there is a single story, so
nothing runs in parallel.

## Implementation Strategy

US1 is the whole feature and the MVP. Ship it as one PR.
