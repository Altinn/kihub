# Tasks: Inter everywhere + Digdir pink and yellow

**Input**: Design documents from `/specs/025-inter-brand-colors/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: none requested. Verification is the existing suite plus quickstart.md.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Foundational — core colors

- [x] T001 Add `"pink": "#F45F63"` and `"yellow": "#E5AA20"` to `themes.kihub.colors`, with
  `overrides.colors.{pink,yellow}.base-default` pinned to the same hex, in
  `apps/web/designsystemet.config.json`. Then run `pnpm --filter web theme:build` (R3).
- [x] T002 Expose `--kihub-pink`, `--kihub-pink-hover`, `--kihub-yellow` and `--kihub-yellow-hover`
  from `--ds-color-{pink,yellow}-base-{default,hover}` in
  `apps/web/src/styles/kihub-ds-bridge.css`.

## Phase 2: User Story 1 — One typeface across the portal (P1)

**Independent Test**: The computed font of headings and body is Inter on `/`, `/news`, `/laering`
and `/bidra`.

- [x] T003 [P] [US1] Point `--kihub-font-display` at `var(--font-kihub-ui)`, and set
  `.kihub-h1`–`.kihub-h4` and `.kihub-tile__title` to `font-weight: var(--kihub-weight-semibold)`,
  in `apps/web/src/styles/kihub-fonts.css` (R1–R2).
- [x] T004 [US1] Remove the Source Serif `localFont` (and its class on `<html>`) and update the
  doc comment in `apps/web/src/app/themed-html.tsx`.
- [x] T005 [US1] Delete `apps/web/src/fonts/SourceSerif4-Variable.woff2` and
  `SourceSerif4-OFL.txt`, then update `apps/web/src/fonts/README.md` and the type line and
  local-deviation list in `apps/web/src/styles/kihub/README.md`.

## Phase 3: User Story 2 — Homepage cards in Digdir pink and yellow (P1)

**Independent Test**: On `/`, "Verktøy" is pink and "KI Prosjekter i Digdir" is yellow, both with
dark text.

- [x] T006 [P] [US2] Add `.fp-tile--pink` and `.fp-tile--yellow` (background, hover, dark ink, dark
  arrow with white glyph, reduced-motion safe) in `apps/web/src/styles/portal.css`.
- [x] T007 [US2] Map `tinted` → `fp-tile--pink` and `accent` → `fp-tile--yellow`, and use the
  default dark `kihub-tag`, in `apps/web/src/components/FrontpageTile.tsx`.
- [x] T008 [P] [US2] Relabel the `variant` options to "Pink (Digdir rød)" / "Yellow (Digdir gul)"
  in `apps/web/src/globals/Frontpage.ts`. Values stay unchanged.
- [x] T009 [P] [US2] Align the hero coral to `#F45F63` in
  `apps/web/public/brand/hero-design-element.svg`, and fix the doc comment in
  `apps/web/src/components/ContributeBanner.tsx`.

## Phase 4: Polish & Verification

- [x] T010 Run lint, `tsc --noEmit` and the web test suite (`set -a; source apps/web/.env; set +a`).
- [x] T011 Walk quickstart.md in the local dev server, with screenshots of `/`.

## Dependencies & Execution Order

T001 → T002 → T006/T007. US1 (T003–T005) is independent of the colors. T008 and T009 are
independent. T010 and T011 come last.

## Implementation Strategy

Both stories are P1 and ship together as one PR.
