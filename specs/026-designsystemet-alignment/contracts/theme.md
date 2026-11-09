# Contract: theme and token usage (026)

## `apps/web/designsystemet.config.json`

```json
{
  "$schema": "./node_modules/@digdir/designsystemet/dist/config.schema.json",
  "outDir": "./design-tokens",
  "themes": {
    "kihub": {
      "colors": {
        "accent": "#0062BA",
        "brand1": "#F45F63",
        "brand2": "#E5AA20",
        "brand3": "#1E98F5",
        "neutral": "#1E2B3C"
      },
      "typography": { "fontFamily": "Inter" },
      "borderRadius": 4
    }
  }
}
```

There is no `overrides` block. Adding one requires a research note explaining why the generated
value is wrong, plus a matching dark value.

## `<html>` attributes

`lang="nb" data-color-scheme="light" data-size="md" data-color="accent"`. These are unchanged.

## Token rules for app CSS (`styles/app.css`)

| Need | Use | Never |
| --- | --- | --- |
| Text colour | `--ds-color-text-default`, `--ds-color-text-subtle`, `--ds-color-{name}-text-*` | `base-*` as text; brand1–3 as text |
| Surfaces | `--ds-color-background-*`, `--ds-color-surface-*` (of any colour, incl. the brand1–3 light tints behind Blåsvart text: `.app-tint`) | brand1–3 `base-*` behind text |
| Graphics only | `--ds-color-brand{1,2,3}-base-default` (shapes, bars, the design element) | — |
| Borders | `--ds-color-border-default` for affordances; `border-subtle` decorative only | `border-subtle` as the only cue for an interactive element |
| Focus | Designsystemet component focus, or `.ds-focus` / `--dsc-focus-*` | custom outline colours |
| Type | `.ds-heading` / `.ds-paragraph` `data-size`, `--ds-heading-*` / `--ds-body-*`, `--ds-font-weight-*` | px font sizes, `text-transform: uppercase`, letter-spacing |
| Spacing | `--ds-size-{0..30}` | raw px/rem |
| Radius / shadow | `--ds-border-radius-*`, `--ds-shadow-*` | raw values |
| Layout widths | plain values: 75rem content column, 40rem reading measure | app-defined custom properties (none exist) |
| Dark subtree | `data-color-scheme="dark"` on the element, plus role tokens | `rgba(255,255,255,x)` |

Permitted hard-coded values: `0`, `100%`, media-query breakpoints in `rem`, and grid fractions.

## Interim bridge (slices 0–6 only)

Every `--kihub-*` variable in `kihub-ds-bridge.css` is re-pointed:

- `--kihub-pink` → `--ds-color-brand1-base-default`;
- `--kihub-yellow` → `--ds-color-brand2-base-default`;
- type and size `--kihub-*` tokens map to `--ds-*` rem equivalents, so unconverted pages already
  scale with the user's font size.

The bridge, `styles/kihub/` and `kihub-fonts.css` are deleted in slice 7.
