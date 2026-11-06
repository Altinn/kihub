import { describe, expect, it } from 'vitest';
import { isSafeInternalPath, previewPathFor, previewUrl } from '@/lib/preview-paths';

/** 027 T019 — contracts/preview-route.md §A. */
describe('previewPathFor', () => {
  it.each([
    ['news', 'hei', '/news/hei'],
    ['learning-pages', 'kom-i-gang', '/laering/kom-i-gang'],
    ['projects', 'kitt', '/prosjekter/kitt'],
    ['events', 'ki-frokost', '/events/ki-frokost'],
    ['pages', 'om-ki-hub', '/om-ki-hub'],
  ] as const)('%s + %s → %s', (collection, slug, expected) => {
    expect(previewPathFor(collection, slug)).toBe(expected);
  });

  it('encodes the slug', () => {
    expect(previewPathFor('news', 'a b/c')).toBe('/news/a%20b%2Fc');
  });
});

describe('previewUrl', () => {
  it('points at /api/preview with the encoded public path', () => {
    expect(previewUrl('news', 'hei')).toBe('/api/preview?path=%2Fnews%2Fhei');
    expect(previewUrl('pages', 'om-ki-hub')).toBe('/api/preview?path=%2Fom-ki-hub');
  });

  it.each([null, undefined, '', '   '])('returns null for slug %j (button hidden)', (slug) => {
    expect(previewUrl('projects', slug)).toBeNull();
  });
});

describe('isSafeInternalPath', () => {
  it.each(['/', '/news/x', '/om-ki-hub?x=1', '/laering/kom-i-gang#del-2', '/news/a%20b'])(
    'accepts %s',
    (path) => {
      expect(isSafeInternalPath(path)).toBe(true);
    },
  );

  it.each([
    '',
    'news/x',
    '//evil.com',
    '//evil.com/news',
    '/\\evil.com',
    '/news\\..\\x',
    'https://evil.com',
    'javascript:alert(1)',
    ' /news',
    '/news\n/x',
    '/news\u0000',
    `/${'a'.repeat(512)}`,
  ])('rejects %j', (path) => {
    expect(isSafeInternalPath(path)).toBe(false);
  });

  it.each([undefined, null, 42, {}, ['/news']])('rejects non-string %j', (value) => {
    expect(isSafeInternalPath(value)).toBe(false);
  });
});
