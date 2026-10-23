# Data model: 026

There are no persisted entities, and no collection, global, field or migration change (FR-023).
What this file pins down is how **stored** values map to the new presentation, so saved editor
content keeps rendering.

## Theme configuration

`designsystemet.config.json` (contracts/theme.md) generates `design-tokens/` and
`design-tokens-build/kihub.css` with `pnpm --filter web theme:build`.

- **Colours:** `accent`, `brand1`, `brand2`, `brand3`, `neutral`, plus the generated `info`,
  `success`, `warning` and `danger`.
- **Schemes:** light, dark and auto. The app sets light on `<html>` and dark on the footer and
  subscriptions subtrees.

## Stored CMS value → UI mapping

| Stored value (unchanged) | Where | New rendering |
| --- | --- | --- |
| `frontpage.tiles[].variant = 'tinted'` | FrontpageTile | `a.ds-card.app-tint[data-variant=tinted][data-color=brand1]`, the light Rød tint |
| `frontpage.tiles[].variant = 'accent'` | FrontpageTile | `a.ds-card.app-tint[data-variant=tinted][data-color=brand2]`, the light Gul tint |
| `frontpage.hero.accentWord` | FrontpageHero | `<span class="app-accent-word">` in `--ds-color-accent-text-subtle` (text role, AA) |
| `frontpage.subscriptions.chips[]` / `requestAccess` | SubscriptionsBanner | unchanged data; the markup follows contracts/components.md |
| `site-chrome.nav[]`, `footer.*` | SiteHeader / SiteFooter | unchanged data |
| `events.type` (webinar, verksted, kurs, konferanse, internt) | EventTypeBadge, calendar | `ds-tag data-color` = info, warning, success, danger, neutral (R10) |
| `artifacts.lifecycle` | LifecycleBadge | `ds-tag data-color` with a Norwegian label (mapping lives in `lib/registry-view.ts`) |
| Lexical heading `h1…h6` in body | `lib/ds-richtext` | level = max(2, n); `data-size` = {2: md, 3: sm, 4: xs, 5+: 2xs} |

## Pure helpers (unit-tested)

- `richTextHeading(level)` returns `{ tag, size }`. It is used by both the Lexical converters and
  react-markdown.
- `tileAppearance(variant)` returns `{ color }` (`brand1` or `brand2`).
- `eventsFilterState(searchParams)` and `registryFilterState(searchParams)` return the checked
  state for each option, plus the hidden inputs to keep. These are built on the existing
  `events-view` / `registry-view` parsers.
