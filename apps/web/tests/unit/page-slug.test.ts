import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  PAGE_SLUG_PATTERN,
  RESERVED_PAGE_SLUGS,
  normalizePageSlug,
  validatePageSlug,
} from '@/lib/page-slug';
import { slugify } from '@/lib/slug';

/** 027 T035 — contracts/pages.md §B and the research R12 drift guard. */

const PATTERN_MESSAGE = 'Adressen kan bare inneholde små bokstaver a–z, tall og bindestrek.';
const reserved = (slug: string) => `Adressen «${slug}» er reservert av KI Hub. Velg en annen.`;

describe('validatePageSlug', () => {
  it.each(['om-ki-hub', 'kontakt', 'ki-2026', 'a'])('accepts %j', (value) => {
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

  it.each(['om/kontakt', 'om ki', 'æøå', '-x', 'x-', 'a--b', '', 'Om-KI-Hub', null, undefined, 42])(
    'rejects %j with the pattern message',
    (value) => {
      expect(validatePageSlug(value)).toBe(PATTERN_MESSAGE);
    },
  );

  it('normalises case and surrounding slashes', () => {
    expect(normalizePageSlug('  /Om-KI-Hub/ ')).toBe('om-ki-hub');
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

  const dirs = (path: string) =>
    readdirSync(path, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

  /** Route groups `(x)` add no segment; `[x]` is dynamic; `_x` is private; `@x` is a parallel slot. */
  const isSegment = (name: string) => !/^[([_@]/.test(name);
  const isGroup = (name: string) => /^\(.+\)$/.test(name);

  function topLevelSegments(): string[] {
    const segments: string[] = [];
    for (const name of dirs(APP)) {
      if (isGroup(name)) segments.push(...dirs(`${APP}${name}`).filter(isSegment));
      else if (isSegment(name)) segments.push(name);
    }
    // `/api/<x>` is not `/<x>`, but a page named after an API route reads as a system address.
    segments.push(...dirs(`${APP}api`).filter(isSegment));
    return segments;
  }

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
    expect(dirs(`${APP}(app)`)).toContain('[slug]');
  });
});
