/**
 * 029 — the browser-safe, pure part of the guideline-deck seam (the `*-view.ts` pattern, like
 * `news-view.ts`): the entry address and the slide-address grammar. It imports NOTHING, because the
 * client component `DeckFrame` uses it — importing `lib/guideline-deck.ts` there would drag Node's
 * filesystem module and the Azure SDK into the browser bundle (Turbopack refuses with a panic).
 */

/**
 * The deck's entry address. It must end in `index.html`: Next strips trailing slashes, so
 * `/retningslinje/deck/` would 404, and the bundle's assets are relative (`assets/deck.js`).
 */
export const DECK_ENTRY = '/retningslinje/deck/index.html';

/** Accepts only `#N` or `#N.b` (N: 1–3 digits, b: 1–2 digits), the deck's own slide-address grammar. */
const HASH_PATTERN = /^#\d{1,3}(?:\.\d{1,2})?$/;

export function parseDeckHash(hash: string): string {
  return HASH_PATTERN.test(hash) ? hash : '';
}

/** The iframe / full-screen address for a (possibly empty or invalid) page hash. */
export function buildDeckSrc(hash: string): string {
  return `${DECK_ENTRY}${parseDeckHash(hash)}`;
}
