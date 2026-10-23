import { describe, expect, it } from 'vitest';
import { HAMBURGER_SAFETY_MARGIN, itemsWrap, nextHamburgerState } from '@/lib/header-view';

/** 026 — the header's content-driven hamburger switch (Designsystemet's header pattern). */
describe('itemsWrap', () => {
  it('is false for a single line of items', () => {
    expect(itemsWrap([{ bottom: 40 }, { bottom: 40 }, { bottom: 40 }])).toBe(false);
  });

  it('is true as soon as one item drops to a new line', () => {
    expect(itemsWrap([{ bottom: 40 }, { bottom: 40 }, { bottom: 80 }])).toBe(true);
  });

  it('is false for zero or one item', () => {
    expect(itemsWrap([])).toBe(false);
    expect(itemsWrap([{ bottom: 40 }])).toBe(false);
  });
});

describe('nextHamburgerState', () => {
  it('switches to the hamburger when the items wrap, remembering the width', () => {
    expect(
      nextHamburgerState({ isHamburger: false, switchedAtWidth: 0, windowWidth: 900, wrapped: true }),
    ).toEqual({ isHamburger: true, switchedAtWidth: 900 });
  });

  it('keeps the full menu while the items fit', () => {
    expect(
      nextHamburgerState({ isHamburger: false, switchedAtWidth: 0, windowWidth: 1200, wrapped: false }),
    ).toEqual({ isHamburger: false, switchedAtWidth: 0 });
  });

  it('stays a hamburger until the window is wider than the switch point plus the margin', () => {
    const at = (windowWidth: number) =>
      nextHamburgerState({ isHamburger: true, switchedAtWidth: 900, windowWidth, wrapped: false }).isHamburger;
    expect(at(900)).toBe(true);
    expect(at(900 + HAMBURGER_SAFETY_MARGIN)).toBe(true);
    expect(at(900 + HAMBURGER_SAFETY_MARGIN + 1)).toBe(false);
  });
});
