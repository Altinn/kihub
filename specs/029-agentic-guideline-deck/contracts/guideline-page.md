# Contract: guideline page and frontpage card

Implements FR-001–FR-004, FR-008, FR-011, FR-012, FR-016.

## A. Page — `/retningslinje` (`src/app/(app)/retningslinje/page.tsx`, Server Component)

Inside the `(app)` layout (session required, header, footer, skip link, preview banner logic untouched).
`isGuidelineDeckEnabled()` false → `notFound()`. `metadata.title = 'Retningslinje for agentisk KI i Digdir'`.
Fully dynamic like the other pages (no `revalidate`/`force-static`).

Structure (one `main`, one `h1`, no skipped levels):

1. `h1` «Retningslinje for agentisk KI i Digdir».
2. Intro `ds-paragraph` (what it is; deck of 104 slides, main part 1–69 and «Vedlegg» 70–104).
3. `<DeckFrame />` (below): «Fullskjerm» + the ⓘ help + the frame.
4. Short contact line — omitted until Roberto names a contact (open question).

## B. `DeckFrame` (`src/components/DeckFrame.tsx`, `'use client'`)

| Piece | Behaviour |
|---|---|
| hash | `useSyncExternalStore` over `hashchange`; server snapshot `''`; accepted only if `/^#\d{1,3}(\.\d{1,2})?$/` |
| full screen | `<button class="ds-button" data-variant="primary">Fullskjerm</button>` (rendered after mount). Calls `requestFullscreen()` on the iframe, **raced against a 700 ms timeout** (in the Claude desktop pane the promise never settles, so a plain `await` left the button dead). If the frame is not the `fullscreenElement` by then, or the call is refused or unsupported (iPhone Safari), it shows the **overlay**: the SAME iframe gets `app-deck-frame--overlay` (`position: fixed; inset: 0`), so the deck is not reloaded and keeps its slide. A primary close button «Lukk fullskjerm (Esc)» sits fixed top-right and follows the frame in the DOM, so one Tab from the deck reaches it; Esc closes it (page and same-origin frame); `html.app-deck-lock` stops page scroll; **keyboard focus goes into the deck** on open (`frame.focus()` + `contentWindow.focus()` — a focused button swallowed the arrow keys, found by the owner) and back to «Fullskjerm» on close. If native full screen engages late, native wins and the overlay is dropped |
| help | a small `<button class="ds-button" data-variant="tertiary" data-icon="true" data-tooltip={HELP}>` with `InformationSquareIcon` and sr-only text «Slik bruker du presentasjonen». Designsystemet's tooltip (`data-tooltip`) opens on hover and on keyboard focus and exposes the text as `aria-description`. HELP: arrows/click to turn, Home/End, best in full screen (Esc to leave), browser zoom does not enlarge text |
| frame | after mount: `<iframe class="app-deck-frame" src={DECK_ENTRY + hash} title="Retningslinje for agentisk KI i Digdir (presentasjon)" allow="fullscreen" allowFullScreen>` inside `div.app-deck`, the 16:9 box that keeps the page layout stable when the frame is lifted; fragment-only `src` change on `hashchange` |
| no JS | `<noscript>` `ds-alert`: «Presentasjonen krever JavaScript.» |
| load failure | the deck route answers 404 → the iframe would show the plain «Not found»; to keep FR-012, the page does a cheap server-side `store.exists('index.html')`-style check (HEAD/stat) and, when missing, renders the `ds-alert` «Presentasjonen er ikke tilgjengelig akkurat nå» **instead of** `DeckFrame` |

`DECK_ENTRY = '/retningslinje/deck/index.html'` (exported from `lib/guideline-deck.ts`, also used by the
banner test). Styling: `.app-deck { aspect-ratio: 16 / 9 }`, `.app-deck-frame { width/height: 100%; border: 1px solid
var(--ds-color-neutral-border-subtle); border-radius: var(--ds-border-radius-md) }`, `.app-deck-frame--overlay`
(`position: fixed; inset: 0; z-index`), `.app-deck-close`, `html.app-deck-lock { overflow: hidden }` in
`styles/app.css`, Designsystemet tokens only.

## C. Frontpage card — `GuidelineBanner` (`src/components/GuidelineBanner.tsx`, Server Component)

Rendered by `app/(app)/page.tsx` between `SubscriptionsBanner` and `ContributeBanner` only when
`isGuidelineDeckEnabled()`. One link (`a.ds-card.app-guideline`, `data-color="accent"`) to `/retningslinje`,
accessible name = its heading via `aria-labelledby="fp-guideline-heading"`; no nested interactive elements.

Left column: tag «Opplæring», `h2` «Retningslinje for agentisk KI i Digdir» (no underline), one line
«Interaktiv gjennomgang på 104 lysbilder, i ditt eget tempo.», and a styled **«Åpne retningslinjen →» button**
(a `span.ds-button` inside the link, so still one tab stop). Right column: a **cover preview**
(`aria-hidden`) — dark neutral panel with «Opplæring · Digdir», «Retningslinje for agentisk KI», a play
button, «1 / 104», and Digdir's coral circle and yellow square as graphics. It is **drawn from Designsystemet
tokens, not an image of the real first slide**: the deck is INTERN and anything under `public/` is served to
anyone. Light accent tint surface (`accent-surface-tinted`, `accent-border-subtle`, via the documented
`--dsc-card-*` variables). Below 48 rem it stacks to one column and the cover grows with its content instead
of clipping at 16:9. The design follows the project lead's mockup, minus its extra links and the «Nytt»
badge (which would go stale).

## D. Reserved address

`RESERVED_PAGE_SLUGS` gains `retningslinje` (drift test in `tests/unit/page-slug.test.ts`).

## E. Tests

- unit `guideline-banner` / `guideline-deck`: banner renders only when enabled; link target; hash
  grammar (`#53`, `#70.2` accepted; `#`, `#0x`, `#53;x`, `#1234`, `#53.123` rejected).
- `route-caching.test.ts`: add `retningslinje/page.tsx` and the deck route to the no-static-caching list.
- browser pass with the real deck (quickstart §4): `#1`, `#53`, `#70`, `#70.2`, `#104` on the page and in
  the full-screen tab; back button; zero console errors; axe on `/retningslinje` and `/`.
