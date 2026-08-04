/**
 * Derive a URL-safe slug from a title (Phase 7, FR-013). Lowercases, maps common Norwegian
 * letters, strips diacritics, turns any run of non-alphanumeric characters into a single hyphen,
 * and trims leading/trailing hyphens. Pure and deterministic so it can be unit-tested and reused
 * by the News collection's `beforeValidate` hook.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
