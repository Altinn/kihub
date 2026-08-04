import { describe, expect, it } from 'vitest';
import { slugify } from '@/lib/slug';

/** T010 (US2, FR-013) — the pure slug derivation used by the News collection's beforeValidate hook. */
describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Q3 All Hands Recap')).toBe('q3-all-hands-recap');
  });

  it('collapses punctuation and repeated separators into single hyphens', () => {
    expect(slugify('Hello,   World!! —  Again')).toBe('hello-world-again');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  ...Launch Day!  ')).toBe('launch-day');
  });

  it('maps Norwegian letters and strips diacritics', () => {
    expect(slugify('Ny løsning på café')).toBe('ny-losning-pa-cafe');
  });

  it('leaves an already-slug-like string unchanged', () => {
    expect(slugify('already-a-slug')).toBe('already-a-slug');
  });
});
