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

/**
 * 030 — remembering the reader's place. The place is a slide address (`#N` / `#N.b`) in the reader's own
 * browser storage, one value per signed-in user. Nothing here ever reaches a server.
 */

/** The minimal slice of `Storage` we use, so tests can pass a fake (or a throwing one). */
export type DeckPositionStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** One storage entry per user; `userKey` is the pseudonymous key the server derives (`deckUserKey`). */
export function deckPositionStorageKey(userKey: string): string {
  return `kihub:deck-position:${userKey}`;
}

/**
 * Where the deck STARTS: an explicit, valid page address wins (a shared `…#53` link), else the remembered
 * place, else the first slide (`''`). Both inputs are validated; neither is ever used as-is.
 */
export function resolveStartHash(pageHash: string, remembered: string): string {
  return parseDeckHash(pageHash) || parseDeckHash(remembered);
}

/** The remembered place, or `''` when there is none, it is not a slide address, or storage is unusable. */
export function readDeckPosition(storage: DeckPositionStorage | null, key: string): string {
  try {
    return parseDeckHash(storage?.getItem(key) ?? '');
  } catch {
    return '';
  }
}

/** Remember a place. Returns whether it was written; invalid input and blocked/full storage are ignored. */
export function writeDeckPosition(
  storage: DeckPositionStorage | null,
  key: string,
  hash: string,
): boolean {
  const valid = parseDeckHash(hash);
  if (!valid || !storage) return false;
  try {
    storage.setItem(key, valid);
    return true;
  } catch {
    return false;
  }
}
