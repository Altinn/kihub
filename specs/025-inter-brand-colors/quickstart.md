# Quickstart: verify Inter + pink/yellow cards

Prerequisites: local DB running (`kihub-postgres` on 55432) and `apps/web/.env` present.

1. `pnpm --filter web theme:build`. Expect `design-tokens-build/kihub.css` to define
   `--ds-color-pink-base-default: #f45f63` and `--ds-color-yellow-base-default: #e5aa20`.
2. Start the dev server (`.claude/launch.json` → `kihub-web-024`, port 3024), sign in as the mock
   persona, and open `/`.
3. **Expect**: the "Verktøy" card is pink and the "KI Prosjekter i Digdir" card is yellow, each
   with dark title, dark tag chip and dark arrow circle (US2 #1). Tab to each card: the focus
   ring is visible (US2 #3).
4. **Expect**: `getComputedStyle(h1).fontFamily` starts with the Inter `next/font` family on `/`,
   `/news`, `/laering` and `/bidra`, and no `SourceSerif4` request appears in the network panel
   (US1).
5. Contrast: `#1E2124` on `#F45F63` = 5.13:1 and on `#E5AA20` = 7.78:1 (SC-002).
6. `/cms` → Frontpage → Tiles: the variant options read with the new color labels.
7. `pnpm --filter web lint`, `pnpm --filter web exec tsc --noEmit` and the test suite all pass.
