/**
 * 027 US3 — address rules for CMS pages served at `/<slug>` (research R12, contracts/pages.md §B).
 *
 * Pure, so the collection's `validate`, the read layer's cheap reject and the unit tests all share
 * one definition. Pages are flat: one lowercase segment, exactly what `lib/slug.ts`'s `slugify`
 * produces, so no `/` and therefore no nested addresses.
 *
 * Built-in sections always win (Next matches static segments before `[slug]`, FR-021), so a page on a
 * reserved address could never be reached. The list is guarded by a drift test
 * (`tests/unit/page-slug.test.ts`) that fails when a new top-level route or `public/` entry lands
 * without being added here.
 */

/** One segment of lowercase a–z, digits and single hyphens, no leading/trailing hyphen. */
export const PAGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Addresses KI Hub already uses (or must keep free). Every top-level route segment of the app, every
 * top-level `public/` entry, the API sub-routes (defensive: `/api/<x>` is not `/<x>`, but a page
 * named after one reads as a system address), and Next/browser system paths.
 */
export const RESERVED_PAGE_SLUGS: ReadonlySet<string> = new Set([
  // src/app/(app)
  'artifacts',
  'bidra',
  'events',
  'laering',
  'news',
  'prosjekter',
  'registry',
  // src/app/(auth)
  'signin',
  // src/app/(payload)
  'cms',
  'payload-api',
  // src/app/api and its sub-routes
  'api',
  'auth',
  'discovery',
  'preview',
  // public/
  'brand',
  // Next / browser system paths
  '_next',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
]);

export const PAGE_SLUG_PATTERN_MESSAGE =
  'Adressen kan bare inneholde små bokstaver a–z, tall og bindestrek.';

export function reservedPageSlugMessage(slug: string): string {
  return `Adressen «${slug}» er reservert av KI Hub. Velg en annen.`;
}

/** Trim, lowercase, strip leading/trailing `/` — so `/News/` is recognised as `news`. */
export function normalizePageSlug(value: string): string {
  return value.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
}

/**
 * `true` when `value` is a usable page address, else the Norwegian message Payload shows the editor.
 * The reserved check runs on the NORMALISED value first, so case/slash variants of a built-in
 * address get the clearer «reservert» message rather than the generic pattern one.
 */
export function validatePageSlug(value: unknown): true | string {
  const raw = typeof value === 'string' ? value : '';
  const normalized = normalizePageSlug(raw);
  if (RESERVED_PAGE_SLUGS.has(normalized)) return reservedPageSlugMessage(normalized);
  if (!PAGE_SLUG_PATTERN.test(raw)) return PAGE_SLUG_PATTERN_MESSAGE;
  return true;
}
