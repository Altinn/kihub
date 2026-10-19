# Implementation Plan: Inter everywhere + Digdir pink and yellow

**Branch**: `025-inter-brand-colors` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/025-inter-brand-colors/spec.md`

## Summary

1. **Font** (R1–R2). Point `--kihub-font-display` at the self-hosted Inter in the local
   `kihub-fonts.css` override, raise heading and tile-title weight to 600, and drop Source Serif 4
   (the loader, the woff2 and its licence).
2. **Core colors** (R3). Add Digdir «Rød» `#F45F63` and «Gul» `#E5AA20` as named colors `pink` and
   `yellow` in `designsystemet.config.json` (with `base-default` pinned), regenerate with
   `theme:build`, and bridge them to `--kihub-pink*` / `--kihub-yellow*`.
3. **Homepage cards** (R4). `FrontpageTile` maps the stored variant to a frontpage-only class:
   `tinted` → `fp-tile--pink`, `accent` → `fp-tile--yellow`. Both use dark ink, a dark tag and a
   dark arrow. The CMS option labels are relabelled. No enum change, no migration.

It also aligns the 024 hero SVG's coral from the PDF's `#F05F63` to the guide's `#F45F63`.

## Technical Context

**Language/Version**: TypeScript 5 / React 19, Next.js 16.3.3, CSS custom properties

**Primary Dependencies**: `@digdir/designsystemet` 1.18.0 CLI (`theme:build`), `next/font/local`

**Storage**: N/A. The Payload `frontpage` global's `tiles.variant` enum is untouched; only its
labels change.

**Testing**: the existing suite, plus lint and `tsc --noEmit`; the browser walk in quickstart.md

**Target Platform**: KI Hub portal (`apps/web`), `(app)`/`(auth)` route groups

**Project Type**: web application (monorepo)

**Performance Goals**: one fewer font file per page (Source Serif 4 is no longer downloaded)

**Constraints**: WCAG 2.1 AA text contrast on both card colors. The synced `styles/kihub/` folder is
not edited.

**Scale/Scope**: about 8 files, plus the regenerated `design-tokens/` and `design-tokens-build/`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v4.0.0:

- **Design System constraint** (Designsystemet foundation + generated KI Hub theme + kihub token
  layer): PASS. The new colors enter through the official theming pipeline
  (`designsystemet.config.json` → `theme:build`) and are bridged into the kihub layer exactly like
  accent and neutral. No Designsystemet primitive is restyled. The font is Inter, which is already
  the theme's `typography.fontFamily`.
- **Principle II / IX (single source per module, Umbraco migration)**: PASS. No content-model
  change. Variant values are unchanged and only labels change, so the Payload → Umbraco parity
  goldens for the frontpage are unaffected in shape.
- **Start Simple / YAGNI**: PASS. There is no new enum value, migration or prop.
- **Synced folder rule** (`styles/kihub/README.md`): PASS. Overrides live in the local-only
  `kihub-fonts.css`, `kihub-ds-bridge.css` and `portal.css`. The README's local-deviation list is
  updated.

Post-design re-check: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/025-inter-brand-colors/
├── spec.md · plan.md · research.md · quickstart.md · tasks.md
└── checklists/requirements.md
```

`data-model.md` and `contracts/` are omitted: there is no data or interface change.

### Source Code (repository root)

```text
apps/web/
├── designsystemet.config.json            # + pink, yellow (+ base-default overrides)
├── design-tokens/ , design-tokens-build/ # regenerated (theme:build)
├── public/brand/hero-design-element.svg  # coral → #F45F63
└── src/
    ├── app/themed-html.tsx               # drop Source Serif localFont
    ├── fonts/                            # delete SourceSerif4-*; README update
    ├── globals/Frontpage.ts              # variant option labels
    ├── components/FrontpageTile.tsx      # variant → fp-tile--pink / --yellow
    ├── components/ContributeBanner.tsx   # doc comment (no longer "same fill as tile")
    └── styles/
        ├── kihub-fonts.css               # display → Inter, heading weight 600
        ├── kihub-ds-bridge.css           # --kihub-pink*, --kihub-yellow*
        ├── kihub/README.md               # local-deviation list + type line
        └── portal.css                    # .fp-tile--pink / --yellow
```

## Complexity Tracking

None.
