import { describe, expect, it } from 'vitest';
import { DEFAULT_FRONTPAGE, type RichTextValue } from '@/lib/site-content-defaults';

/** Recursively joins every lexical text node's `text`, for asserting a rich-text field isn't empty
 * without depending on its exact node structure (Altinn/kihub#148 made these fields richText). */
function plainTextOf(value: RichTextValue | undefined): string {
  function walk(node: unknown): string {
    if (!node || typeof node !== 'object') return '';
    const n = node as { text?: unknown; children?: unknown };
    const own = typeof n.text === 'string' ? n.text : '';
    const kids = Array.isArray(n.children) ? n.children.map(walk).join('') : '';
    return own + kids;
  }
  return value ? walk(value.root) : '';
}

/**
 * 017 (US1/US2, FR-001/002/004) — pins the Altinn/kihub#144 fix at the content layer: no chip may
 * carry a dead `href` (the false-affordance bug) or an empty explanation, and the "Hvordan bestille
 * tilgang?" request-access CTA must always exist with real content. A future edit that reintroduces
 * a `href` field or drops `requestAccess` breaks this test.
 */
describe('DEFAULT_FRONTPAGE subscriptions (Altinn/kihub#144)', () => {
  it('never carries a stray href on a chip', () => {
    for (const chip of DEFAULT_FRONTPAGE.subscriptions.chips) {
      expect((chip as { href?: unknown }).href).toBeUndefined();
    }
  });

  it('gives every seeded chip a non-empty explanation', () => {
    expect(DEFAULT_FRONTPAGE.subscriptions.chips.length).toBeGreaterThan(0);
    for (const chip of DEFAULT_FRONTPAGE.subscriptions.chips) {
      expect(plainTextOf(chip.description).length).toBeGreaterThan(0);
    }
  });

  it('always defines a request-access call-to-action with a label and body', () => {
    expect(DEFAULT_FRONTPAGE.subscriptions.requestAccess.label.length).toBeGreaterThan(0);
    expect(plainTextOf(DEFAULT_FRONTPAGE.subscriptions.requestAccess.body).length).toBeGreaterThan(
      0,
    );
  });
});
