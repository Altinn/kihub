import { describe, expect, it } from 'vitest';
import { tileAppearance } from '@/lib/frontpage-view';

/**
 * 026 — the stored tile variants keep rendering (no migration), stay distinct, and use a Digdir
 * graphic colour's light tint as the card surface (the digdir.no card pattern).
 */
describe('tileAppearance', () => {
  it('renders the stored "tinted" variant on the Rød (brand1) tint', () => {
    expect(tileAppearance('tinted')).toEqual({ color: 'brand1' });
  });

  it('renders the stored "accent" variant on the Gul (brand2) tint', () => {
    expect(tileAppearance('accent')).toEqual({ color: 'brand2' });
  });

  it('keeps the two variants distinct', () => {
    expect(tileAppearance('tinted').color).not.toBe(tileAppearance('accent').color);
  });
});
