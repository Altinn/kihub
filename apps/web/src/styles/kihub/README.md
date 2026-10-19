# KI HUB design system — direction 1a

White ground, one blue accent (#0062BA), near-black ink, plus Digdir's graphic colors pink
(#F45F63) and yellow (#E5AA20) since 025. Type: **Inter** throughout (025; the design project's
Source Serif 4 display face is overridden locally, see below). Accent and
neutral steps are taken from Designsystemet (digdir), so KI HUB stays visually
compatible with Digdir services. This layer sits ON TOP of `@digdir/designsystemet-css`
(the constitution's mandatory UI system) — it does not replace it.

> **Synced from claude.ai/design** — source of truth is the `kihub/` folder in the
> "KIHub Design System" design project
> (`claude.ai/design/p/71acae73-dfe7-4914-a7cd-e6ea0e698060`). When the design project
> changes, re-copy `tokens.css` / `components.css` verbatim and mirror `tokens.js` into
> `tokens.ts`. Local deviations from the design project:
>
> - `tokens.js` → `tokens.ts` (this repo is TypeScript; content is otherwise identical).
> - `tailwind.preset.js` is omitted — this app does not use Tailwind.
> - Fonts are loaded with `next/font` in `src/app/themed-html.tsx` instead of Google
>   Fonts `<link>` tags; `../kihub-fonts.css` points the two font tokens at the
>   `next/font` CSS variables. That override file is local-only, never synced.
> - **Color values resolve through Designsystemet's official theming pipeline**:
>   `apps/web/designsystemet.config.json` (which pins this design system's exact hex values as
>   overrides) generates `design-tokens/` + `design-tokens-build/kihub.css` via
>   `pnpm --filter web theme:build`; `../kihub-ds-bridge.css` (local-only, never synced)
>   re-points the `--kihub-*` color tokens at the generated `--ds-*` variables. The literal hex
>   values in `tokens.css` stay for sync fidelity but are overridden by the bridge — to change a
>   color, change the config (and the design project), not this folder.
> - **025 — Inter everywhere + Digdir pink/yellow** (`specs/025-inter-brand-colors/`):
>   `../kihub-fonts.css` points `--kihub-font-display` at Inter and sets display headings to
>   semibold, so the `"Source Serif 4"` value in `tokens.css`/`tokens.ts` is inert. Frontpage
>   card titles are 24px regular (`portal.css`). `pink`/`yellow` are named colors in
>   `designsystemet.config.json`, bridged as `--kihub-pink` / `--kihub-yellow` (no `tokens.css`
>   counterpart). The frontpage tiles use them as flat fills via `portal.css`
>   `.fp-tile--pink/--yellow`, not `.kihub-tile--accent`.

## Files

| File | What it is |
| --- | --- |
| `tokens.css` | All design tokens as CSS custom properties on `:root`. The source of truth. |
| `components.css` | Small class layer built on the tokens: type, buttons, tags, cards, tiles, inputs, layout helpers. |
| `tokens.ts` | The same tokens as a TS module (`import { color, space } from "@/styles/kihub/tokens"`). |

## Where it is wired up

`src/app/themed-html.tsx` (the shared `(app)`/`(auth)` shell) imports, in order:
Designsystemet CSS → Designsystemet theme → `tokens.css` → `components.css` →
`kihub-fonts.css`, and puts the `next/font` variable classes on `<html>`.
The Payload admin (`(payload)` route group) has its own root layout and is untouched,
per the constitution's Designsystemet exemption.

## Use it

```tsx
export function Hero() {
  return (
    <section className="kihub-container kihub-section">
      <p className="kihub-eyebrow kihub-eyebrow--accent">Digdir / KITT-teamet</p>
      <h1 className="kihub-h1">
        Kunstig intelligens<br />
        <span className="kihub-accent-word">i Digdir</span>
      </h1>
      <p className="kihub-lead">
        Vi hjelper deg og ditt team i gang med verktøy og veiledning for en trygg
        og innovativ bruk av KI i offentlig sektor.
      </p>
      <div className="kihub-row" style={{ marginTop: "var(--kihub-space-6)" }}>
        <a className="kihub-btn kihub-btn--primary" href="/laering">KI Læring →</a>
        <a className="kihub-btn kihub-btn--secondary" href="/om">Om KITT</a>
      </div>
    </section>
  );
}
```

## Rules that keep it clean

- **One accent.** `--kihub-accent` is the only chromatic colour for interactive UI. Digdir pink and yellow (025) are graphic colours for large surfaces such as the frontpage tiles, always with dark ink. Status colours are for status only, never decoration.
- **Two surfaces.** White ground plus `--kihub-surface-accent` (#EEF4FA). A third background is a smell.
- **Ink for weight, not colour.** Emphasis comes from size and `--kihub-text` vs `--kihub-text-subtle`, not from more hues.
- **One typeface.** Everything is Inter (025): headings in semibold, body in regular.
- **Never remove the focus ring.** 3px outer outline + 3px inner white ring, offset 3px.
- **Radii stay small.** 4px is the default; 8–12px for cards and media only.
- **No gradients, no glass, no coloured shadows.**
