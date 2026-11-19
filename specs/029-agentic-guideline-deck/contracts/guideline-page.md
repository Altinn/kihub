# Contract: guideline page and frontpage card

Implements FR-001–FR-004, FR-008, FR-011, FR-012, FR-016.

## A. Page — `/retningslinje` (`src/app/(app)/retningslinje/page.tsx`, Server Component)

Inside the `(app)` layout (session required, header, footer, skip link, preview banner logic untouched).
`isGuidelineDeckEnabled()` false → `notFound()`. `metadata.title = 'Retningslinje for agentisk KI i Digdir'`.
Fully dynamic like the other pages (no `revalidate`/`force-static`).

Structure (one `main`, one `h1`, no skipped levels):

1. `h1` «Retningslinje for agentisk KI i Digdir».
2. Intro `ds-paragraph` (what it is; deck of 104 slides, main part 1–69 and «Vedlegg» 70–104).
3. `ds-alert` (info) «Slik bruker du presentasjonen»: arrow keys / click to step, Home/End, back button
   returns to the previous slide, full screen gives the best reading experience, **browser zoom does not
   enlarge the text — use full screen and a larger window**, works best on desktop.
4. `<DeckFrame />` (below).
5. Short contact line — omitted until Roberto names a contact (open question).

## B. `DeckFrame` (`src/components/DeckFrame.tsx`, `'use client'`)

| Piece | Behaviour |
|---|---|
| hash | `useSyncExternalStore` over `hashchange`; server snapshot `''`; accepted only if `/^#\d{1,3}(\.\d{1,2})?$/` |
| full screen | `<button class="ds-button" data-variant="primary">Fullskjerm</button>` (rendered after mount). Calls `requestFullscreen()` on the iframe, **raced against a 700 ms timeout** (in the Claude desktop pane the promise never settles, so a plain `await` left the button dead). If the frame is not the `fullscreenElement` by then, or the call is refused or unsupported (iPhone Safari), it shows the **overlay**: the SAME iframe gets `app-deck-frame--overlay` (`position: fixed; inset: 0`), so the deck is not reloaded and keeps its slide. A primary close button «Lukk fullskjerm (Esc)» sits fixed top-right; Esc closes it (page and same-origin frame); `html.app-deck-lock` stops page scroll; focus goes to the close button on open and back to «Fullskjerm» on close. If native full screen engages late, native wins and the overlay is dropped |
| new tab | `<a class="ds-link" href={DECK_ENTRY + hash} target="_blank" rel="noopener">Åpne i ny fane</a>` — present in the server HTML (no hash) and updated after hydration |
| frame | after mount: `<iframe class="app-deck-frame" src={DECK_ENTRY + hash} title="Retningslinje for agentisk KI i Digdir (presentasjon)" allow="fullscreen" allowFullScreen>` inside `div.app-deck`, the 16:9 box that keeps the page layout stable when the frame is lifted; fragment-only `src` change on `hashchange` |
| no JS | `<noscript>` `ds-alert`: «Presentasjonen krever JavaScript. Bruk «Åpne i ny fane» over for å åpne den alene.» |
| load failure | the deck route answers 404 → the iframe would show the plain «Not found»; to keep FR-012, the page does a cheap server-side `store.exists('index.html')`-style check (HEAD/stat) and, when missing, renders the `ds-alert` «Presentasjonen er ikke tilgjengelig akkurat nå» **instead of** `DeckFrame` |

`DECK_ENTRY = '/retningslinje/deck/index.html'` (exported from `lib/guideline-deck.ts`, also used by the
banner test). Styling: `.app-deck { aspect-ratio: 16 / 9 }`, `.app-deck-frame { width/height: 100%; border: 1px solid
var(--ds-color-neutral-border-subtle); border-radius: var(--ds-border-radius-md) }`, `.app-deck-frame--overlay`
(`position: fixed; inset: 0; z-index`), `.app-deck-close`, `html.app-deck-lock { overflow: hidden }` in
`styles/app.css`, Designsystemet tokens only.

## C. Frontpage card — `GuidelineBanner` (`src/components/GuidelineBanner.tsx`, Server Component)

Rendered by `app/(app)/page.tsx` between `SubscriptionsBanner` and `ContributeBanner` only when
`isGuidelineDeckEnabled()`. One link (`a.ds-card.app-banner`, no nested interactive elements) to
`/retningslinje`, accessible name = its heading via `aria-labelledby="fp-guideline-heading"`:
tag «Retningslinje», `h2` «Retningslinje for agentisk KI i Digdir», one sentence, CTA «Åpne
retningslinjen» with the existing arrow chip. Tokens/classes reused from `ContributeBanner`; the
surface is the neutral/tinted card (not the solid accent already used by the contribute banner), so the
two banners are distinguishable.

## D. Reserved address

`RESERVED_PAGE_SLUGS` gains `retningslinje` (drift test in `tests/unit/page-slug.test.ts`).

## E. Tests

- unit `guideline-banner` / `guideline-deck`: banner renders only when enabled; link target; hash
  grammar (`#53`, `#70.2` accepted; `#`, `#0x`, `#53;x`, `#1234`, `#53.123` rejected).
- `route-caching.test.ts`: add `retningslinje/page.tsx` and the deck route to the no-static-caching list.
- browser pass with the real deck (quickstart §4): `#1`, `#53`, `#70`, `#70.2`, `#104` on the page and in
  the full-screen tab; back button; zero console errors; axe on `/retningslinje` and `/`.
