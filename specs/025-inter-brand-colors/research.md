# Research: Inter everywhere + Digdir pink and yellow

## R1 — Font: re-point the display token, drop Source Serif 4

- **Decision**: In the local override `src/styles/kihub-fonts.css`, set
  `--kihub-font-display` to the same Inter `next/font` variable as `--kihub-font-ui`. Remove the
  Source Serif `localFont` from `themed-html.tsx`, delete `SourceSerif4-Variable.woff2` and its
  OFL text, and update `src/fonts/README.md`.
- **Rationale**: Every serif usage (the `kihub-h*` classes, lead text, tile titles, inline `font:`
  shorthands in `portal.css`, `NewsCard`, `NextEventCard`, `SiteFooter`, `ProjectCard`) resolves
  through `--kihub-font-display`. One token change covers the whole portal. `kihub/` is synced
  verbatim from the design project, so the override belongs in the local-only file, as the font
  wiring already does. Inter is already self-hosted and is already Designsystemet's theme font.
- **Alternatives considered**: editing `kihub/tokens.css`. That would break sync fidelity.
  Renaming the token across call sites is a large diff for no visual gain. Both rejected.

## R2 — Heading weight

- **Decision**: In `kihub-fonts.css`, raise the weight of `.kihub-h1`–`.kihub-h4` and
  `.kihub-tile__title` to `--kihub-weight-semibold` (600), within the shipped `wght 400..600` axis.
  Keep the existing tracking tokens.
- **Rationale**: Display text set in a sans-serif at 400 reads thin and loses hierarchy against
  body text in the same face. 600 is the top of the file's weight axis, so no new font file is
  needed.

**Revised after user review (R5)**: semibold stays on `.kihub-h1`–`h4`, but NOT on the
frontpage card titles. See R5.

## R3 — Colors: named Designsystemet colors, bridged into kihub tokens

- **Decision**: Add `"pink": "#F45F63"` and `"yellow": "#E5AA20"` to `designsystemet.config.json`
  `themes.kihub.colors`, and pin `base-default` to the exact hex in `overrides`. Run
  `pnpm --filter web theme:build`. In `kihub-ds-bridge.css`, expose `--kihub-pink`,
  `--kihub-yellow` and their hover steps from `--ds-color-{pink,yellow}-base-*`.
- **Rationale**: The config is the single source of truth for color values (README + bridge), and
  the schema accepts any named color. Designsystemet components can then use
  `data-color="pink"` / `"yellow"` too. Running `theme:build` on unchanged `main` was verified to
  reproduce the committed output byte-for-byte, so the diff contains only the new colors.
- **Values**: from the Digdir profile guide («Rød» F45F63, «Gul» E5AA20). Contrast: `#1E2124`
  text gives 5.13:1 on pink and 7.78:1 on yellow (AA). White gives 3.15 and 2.08 (fails), so the
  cards use dark ink.

## R4 — Cards: restyle the existing variants instead of adding new ones

- **Decision**: Keep the `variant` values `tinted`/`accent`. In `portal.css`, scoped to the
  frontpage tiles, color `tinted` → pink and `accent` → yellow. Both use dark text, a dark tag chip
  and a dark arrow circle with a white glyph. Relabel the select options in
  `src/globals/Frontpage.ts`.
- **Rationale**: The values are stored in a Postgres enum. New values would need a migration, and
  production's already-saved global would keep showing the old blue until an editor changed it
  (SC-003). A label change is not a schema change, so there is no migration and generated types
  are unchanged.
- **Alternatives considered**: new `pink`/`yellow` enum values plus a migration plus a data
  backfill. More work and more risk, under a constitution (v4.0.0) that is moving this content to
  Umbraco anyway. Rejected.

## R5 — Review revision: plain card titles, no motion on cards

- **Decision**: In `portal.css`, `.fp-tile .kihub-tile__title`, `.kihub-card--inverted .kihub-h3`
  and `.fp-contribute .fp-contribute__heading` get `--kihub-font-size-h4` (24px) at
  `--kihub-weight-regular`. Remove `.kihub-tile__title` from the semibold list in
  `kihub-fonts.css`. Delete the contribute banner's `::before` light sweep (`fp-contribute-sweep`
  keyframes), its hover background shift and the arrow `translateX` on hover. Remove the same
  hover shift and arrow motion from `.fp-tile`, and drop the now-unused `--kihub-*-hover` bridge
  tokens.
- **Rationale**: The user reviewed the change live. 30px semibold card titles read too big and
  bold compared with the hero. The banner's sweep (and every hover shift) changed the rendered
  color, but the brief is pure Digdir colors as flat fills. The banner keeps the Digdir-blue accent
  `#0062BA` (≈ the guide's «Mørk blå» `#0062B8`).
- **Unchanged**: focus rings (`.kihub-tile:focus-visible`, `.kihub-focusable`). The
  subscriptions chips' hover tint is on buttons inside the card, not on the card itself.
