# Quickstart / validation: 026

## Prerequisites

- **`apps/web/.env`** must exist, copied from `.env.example`, with `AUTH_MODE=mock`, local
  `DATABASE_URI`, `PAYLOAD_SECRET` and `AUTH_SECRET`. It is missing on the current machine as of
  2026-10-21, and the running dev server fails with `MissingSecret`.
- **A local Postgres** with the push-mode `kihub` database.

## Static gates (every slice)

```bash
pnpm --filter web theme:build
```

```bash
pnpm --filter web lint
```

```bash
pnpm --filter web exec tsc --noEmit
```

```bash
pnpm --filter web test -- tests/unit
```

`next build` runs in the final slice. It needs a migrated scratch DB and `AUTH_MODE=entra`;
see the 014 notes in CLAUDE.md.

## Source checks (SC-006 / SC-007)

```bash
grep -rnE "kihub-(h[1-4]|btn|tag|card|link|lead|prose|eyebrow|tile|input|focusable)" apps/web/src --include='*.tsx'
```

This should find nothing after slice 7. While work is in progress, only unconverted routes appear.

```bash
grep -rn "style={{" apps/web/src/components apps/web/src/app
```

This should find only documented dynamic values.

```bash
grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(|[0-9]+px" apps/web/src/styles/app.css
```

This should find only breakpoints in rem.

## Browser checks (per converted route; the in-app browser on localhost)

1. Sign in with the mock persona "Ada Employee".
2. Press Tab once. "Hopp til hovedinnhold" is visible; pressing Enter moves focus to main.
3. `read_page`: there is one `main`, one h1, and no skipped heading level.
4. Inject axe-core 4.10.x (pinned jsdelivr URL) and run `axe.run()`. There must be 0 violations at
   the wcag2a, wcag2aa, wcag21aa and wcag22aa levels.
5. Tab through every control, including the footer. Focus is visible everywhere.
6. Set the default font to 24px (emulate it with `document.documentElement.style.fontSize='150%'`
   only as a proxy, and note that it is a proxy). Text scales and nothing clips.
7. Resize to 320 by 800. There is no horizontal page scroll.
8. Routes with filters: apply the events and registry filters without JS. The URL updates and the
   checked state survives a reload.
9. Frontpage: both tile variants are distinct; the subscriptions dialogs open, close and are
   legible; no Rød, Gul or Blå appears behind text.

## Done (slice 7)

SC-001 through SC-008 hold, the constitution is at v4.0.0, and CLAUDE.md points at this plan.
