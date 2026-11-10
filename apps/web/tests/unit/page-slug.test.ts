import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  PAGE_SLUG_PATTERN,
  RESERVED_PAGE_SLUGS,
  normalizePageSlug,
  resolvePageSlug,
  validatePageSlug,
} from '@/lib/page-slug';
import { slugify } from '@/lib/slug';

/** 027 T035 — contracts/pages.md §B and the research R12 drift guard. */

const PATTERN_MESSAGE = 'Adressen kan bare inneholde små bokstaver a–z, tall og bindestrek.';
const reserved = (slug: string) => `Adressen «${slug}» er reservert av KI Hub. Velg en annen.`;

describe('validatePageSlug', () => {
  // Case/slash variants are accepted: the admin form validates what the editor typed before the
  // collection hook normalises it (`Om-KI-Hub` is saved as `om-ki-hub`).
  it.each(['om-ki-hub', 'kontakt', 'ki-2026', 'a', 'Om-KI-Hub', '/om-ki-hub/', ' kontakt '])('accepts %j', (value) => {
    expect(validatePageSlug(value)).toBe(true);
  });

  it.each([
    ['news', 'news'],
    ['/News/', 'news'],
    ['LAERING', 'laering'],
    ['/Laering/', 'laering'],
    [' events ', 'events'],
    ['api', 'api'],
    ['cms', 'cms'],
    ['payload-api', 'payload-api'],
    ['signin', 'signin'],
    ['bidra', 'bidra'],
    ['brand', 'brand'],
    ['preview', 'preview'],
  ])('rejects reserved %j with the «reservert» message', (value, normalized) => {
    expect(validatePageSlug(value)).toBe(reserved(normalized));
  });

  it.each(['om/kontakt', 'om ki', 'æøå', '-x', 'x-', 'a--b', '', '/', null, undefined, 42])(
    'rejects %j with the pattern message',
    (value) => {
      expect(validatePageSlug(value)).toBe(PATTERN_MESSAGE);
    },
  );

  it('normalises case and surrounding slashes', () => {
    expect(normalizePageSlug('  /Om-KI-Hub/ ')).toBe('om-ki-hub');
  });

  it('resolvePageSlug normalises a given address, else derives one from the title', () => {
    expect(resolvePageSlug(' /Om-KI-Hub/ ', 'Annet')).toBe('om-ki-hub');
    expect(resolvePageSlug('', 'Om KI Hub')).toBe('om-ki-hub');
    expect(resolvePageSlug(null, 'News')).toBe('news');
    expect(resolvePageSlug(undefined, '   ')).toBe('');
    expect(resolvePageSlug('', undefined)).toBe('');
  });

  it('a blank address is judged by the one derived from the title (admin form, before the hook)', () => {
    expect(validatePageSlug(resolvePageSlug('', 'Om KI Hub'))).toBe(true);
    expect(validatePageSlug(resolvePageSlug('', 'News'))).toBe(reserved('news'));
    expect(validatePageSlug(resolvePageSlug('', ''))).toBe(PATTERN_MESSAGE);
  });

  it('accepts what slugify derives from a Norwegian title', () => {
    expect(PAGE_SLUG_PATTERN.test(slugify('Om KI Hub — kontakt & støtte'))).toBe(true);
  });
});

/**
 * Drift guard: every top-level address a built-in route or `public/` file already serves must be in
 * `RESERVED_PAGE_SLUGS`, or a page could be saved on an address it can never win (FR-021). A new
 * route fails this test until the list is updated, flagging the conflict before it ships.
 */
describe('RESERVED_PAGE_SLUGS covers every built-in top-level segment', () => {
  const APP = fileURLToPath(new URL('../../src/app/', import.meta.url));
  const PUBLIC = fileURLToPath(new URL('../../public/', import.meta.url));

  const entries = (path: string) => readdirSync(path, { withFileTypes: true });
  const dirs = (path: string) =>
    entries(path)
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

  /** Route groups `(x)` add no segment; `[x]` is dynamic; `_x` is private; `@x` is a parallel slot. */
  const isSegment = (name: string) => !/^[([_@]/.test(name);
  const isGroup = (name: string) => /^\(.+\)$/.test(name);
  /**
   * Next metadata routes are FILES that serve a top-level address: `icon.tsx` → `/icon`,
   * `opengraph-image.png` → `/opengraph-image.png`, `robots.ts` → `/robots.txt`, …
   */
  const METADATA_FILE = /^(favicon|icon|apple-icon|opengraph-image|twitter-image|robots|sitemap|manifest)\d*\.(\w+)$/;
  const metadataAddress = (file: string): string | null => {
    const match = METADATA_FILE.exec(file);
    if (!match) return null;
    const [, name = '', ext = ''] = match;
    if (name === 'robots') return 'robots.txt';
    if (name === 'sitemap') return 'sitemap.xml';
    if (name === 'manifest') return 'manifest.webmanifest';
    // Generated images (`.tsx`/`.ts`/`.js`) have no extension in the URL; static files keep theirs.
    return /^(tsx|ts|jsx|js)$/.test(ext) ? name : file;
  };

  /** Top-level addresses served from `dir`, descending through (nested) route groups. */
  function segmentsIn(dir: string): string[] {
    const found: string[] = [];
    for (const entry of entries(dir)) {
      if (entry.isDirectory()) {
        if (isGroup(entry.name)) found.push(...segmentsIn(`${dir}${entry.name}/`));
        else if (isSegment(entry.name)) found.push(entry.name);
      } else {
        const address = metadataAddress(entry.name);
        if (address) found.push(address);
      }
    }
    return found;
  }

  function topLevelSegments(): string[] {
    // `/api/<x>` is not `/<x>`, but a page named after an API route reads as a system address.
    return [...segmentsIn(APP), ...dirs(`${APP}api`).filter(isSegment)];
  }

  it('the scanner sees nested groups and metadata files', () => {
    expect(metadataAddress('icon.tsx')).toBe('icon');
    expect(metadataAddress('opengraph-image2.ts')).toBe('opengraph-image');
    expect(metadataAddress('icon.png')).toBe('icon.png');
    expect(metadataAddress('robots.ts')).toBe('robots.txt');
    expect(metadataAddress('layout.tsx')).toBeNull();
    expect(metadataAddress('themed-html.tsx')).toBeNull();
    expect(RESERVED_PAGE_SLUGS.has('icon')).toBe(true);
  });

  it('scans the expected route groups', () => {
    const groups = dirs(APP).filter(isGroup);
    expect(groups).toEqual(expect.arrayContaining(['(app)', '(auth)', '(payload)']));
  });

  it.each(topLevelSegments())('route segment %j is reserved', (segment) => {
    expect(RESERVED_PAGE_SLUGS.has(segment)).toBe(true);
  });

  it.each(readdirSync(PUBLIC).filter((name) => !name.startsWith('.')))(
    'public entry %j is reserved',
    (name) => {
      expect(RESERVED_PAGE_SLUGS.has(name)).toBe(true);
    },
  );

  it('the catch-all page route itself exists at the (app) root', () => {
    expect(dirs(`${APP}(app)`)).toContain('[...path]');
  });
});
