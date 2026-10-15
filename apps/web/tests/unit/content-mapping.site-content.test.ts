import { describe, expect, it } from 'vitest';
import { mergeFrontpage, mergeSiteChrome } from '@/lib/content/payload/site-content';
import type { LexicalDocument } from '@/lib/content/rich-text';
import { DEFAULT_FRONTPAGE, DEFAULT_SITE_CHROME } from '@/lib/site-content-defaults';

/**
 * 023 T026 — the Payload frontpage/site-chrome merge returns neutral content: rich text leaves it
 * format-tagged for stored AND defaulted sections (research R12); the 011 per-section fallback
 * rules are unchanged.
 */

const doc = (text: string): LexicalDocument => ({
  root: {
    type: 'root',
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
    children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text }] }],
  },
});

describe('mergeFrontpage', () => {
  it('wraps the seeded chip descriptions and request-access body when nothing is stored', () => {
    const merged = mergeFrontpage(null);
    expect(merged.hero).toBe(DEFAULT_FRONTPAGE.hero);
    expect(merged.tiles).toBe(DEFAULT_FRONTPAGE.tiles);
    merged.subscriptions.chips.forEach((chip, i) => {
      expect(chip.name).toBe(DEFAULT_FRONTPAGE.subscriptions.chips[i]!.name);
      expect(chip.description).toEqual({
        format: 'lexical',
        document: DEFAULT_FRONTPAGE.subscriptions.chips[i]!.description,
      });
    });
    expect(merged.subscriptions.requestAccess).toEqual({
      label: DEFAULT_FRONTPAGE.subscriptions.requestAccess.label,
      body: { format: 'lexical', document: DEFAULT_FRONTPAGE.subscriptions.requestAccess.body },
    });
  });

  it('wraps stored chip descriptions and leaves a missing one undefined', () => {
    const merged = mergeFrontpage({
      subscriptions: {
        heading: 'Egen',
        chips: [
          { name: 'A', description: doc('Om A') as never },
          { name: 'B', description: null },
        ],
      },
    });
    expect(merged.subscriptions.chips).toEqual([
      { name: 'A', description: { format: 'lexical', document: doc('Om A') } },
      { name: 'B', description: undefined },
    ]);
  });

  it('falls back per field for a stored request-access section', () => {
    const labelOnly = mergeFrontpage({
      subscriptions: { heading: 'Egen', requestAccess: { label: 'Slik', body: null } },
    });
    expect(labelOnly.subscriptions.requestAccess).toEqual({
      label: 'Slik',
      body: { format: 'lexical', document: DEFAULT_FRONTPAGE.subscriptions.requestAccess.body },
    });
    const bodyOnly = mergeFrontpage({
      subscriptions: { heading: 'Egen', requestAccess: { label: null, body: doc('Skriv') as never } },
    });
    expect(bodyOnly.subscriptions.requestAccess).toEqual({
      label: DEFAULT_FRONTPAGE.subscriptions.requestAccess.label,
      body: { format: 'lexical', document: doc('Skriv') },
    });
  });

  it('uses the default tiles unless exactly two are stored', () => {
    expect(
      mergeFrontpage({ tiles: [{ tag: 'T', title: 'Ett', href: '/a', variant: 'tinted' }] }).tiles,
    ).toBe(DEFAULT_FRONTPAGE.tiles);
  });
});

describe('mergeSiteChrome (unchanged by 023)', () => {
  it('falls back per section', () => {
    expect(mergeSiteChrome(null)).toEqual(DEFAULT_SITE_CHROME);
    const navOnly = mergeSiteChrome({ nav: [{ label: 'X', href: '/x' }] });
    expect(navOnly.nav).toEqual([{ label: 'X', href: '/x' }]);
    expect(navOnly.footer).toBe(DEFAULT_SITE_CHROME.footer);
  });
});
