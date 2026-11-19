# Data Model: Agentic-AI guideline deck (029)

No Payload collection, global, field or migration is added. Nothing is stored in PostgreSQL.

## Guideline deck (external, read-only)

A bundle of static files in the private store. The application never writes to it.

| Aspect | Value |
|---|---|
| Store (azure) | container `GUIDELINE_DECK_CONTAINER` (default `kihub-protected`), blob prefix `retningslinje/` |
| Store (disk) | `apps/web/protected-static/retningslinje/` (gitignored) or `GUIDELINE_DECK_DIR` |
| Entry | `index.html` (stable name — part of the public address) |
| Layout | relative paths only: `assets/*.css`, `assets/deck.js`, `assets/fonts/InterVariable.woff2`, `assets/blob.svg` |
| Version | informational only (v2.2 today); read from the bundle, not stored |
| Never served | files whose extension is not on the whitelist (`README.md`, source maps, dotfiles) |

## Guideline page / frontpage card

Fixed Norwegian text in code. Hash grammar accepted by the page: `#N` or `#N.b`, `N` 1–3 digits,
`b` 1–2 digits; anything else is ignored.

## Feature switch

`GUIDELINE_DECK_ENABLED` — exactly `"true"` enables; unset/anything else disables (card hidden, page and
deck address 404 for everyone).

## State transitions

| State | Card | `/retningslinje` | `/retningslinje/deck/*` |
|---|---|---|---|
| switch off (default) | hidden | 404 (signed-out visitors are redirected to sign-in by the layout first) | 404 (also for signed-out requests) |
| switch on, no session | hidden (frontpage is gated) | 303 → `/signin` | 303 → `/signin` |
| switch on, employee, deck uploaded | shown | 200 | 200 (whitelisted files) / 404 (others) |
| switch on, employee, deck missing | shown | 200 with fallback message | 404 |
