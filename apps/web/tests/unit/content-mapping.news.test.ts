import { describe, expect, it } from 'vitest';
import { toContentImage } from '@/lib/content/payload/media';
import { resolveHeroSource, toNewsArticle } from '@/lib/content/payload/news';
import type { Media, News, User } from '@/payload-types';

/**
 * 023 T019 — Payload News → NewsArticle (data-model.md). The `resolveHeroSource` cases moved here
 * from news-view.test.ts (020 contracts/hero-image-rendering.md B4.1, FR-008/FR-010) with the same
 * inputs and the same precedence; only the result shape changed (`upload` → `image`, carrying a
 * `ContentImage`).
 */

const UPDATED = '2026-09-23T10:00:00.000Z';

function media(overrides: Partial<Media> = {}): Media {
  return {
    id: 1,
    alt: 'Et bilde med tekst i høyre kant',
    url: '/payload-api/media/file/bilde.png',
    width: 3000,
    height: 1000,
    focalX: 90,
    focalY: 20,
    updatedAt: UPDATED,
    createdAt: UPDATED,
    sizes: {},
    ...overrides,
  } as Media;
}

describe('resolveHeroSource (B4.1, FR-008/FR-010)', () => {
  it('prefers a populated upload even when a legacy URL is also set', () => {
    const m = media();
    expect(resolveHeroSource({ heroImage: m, heroImageUrl: 'https://legacy.example/a.jpg' })).toEqual({
      kind: 'image',
      image: toContentImage(m),
    });
  });

  it('does not treat a media document without a file URL as an upload', () => {
    expect(resolveHeroSource({ heroImage: media({ url: null }), heroImageUrl: null })).toEqual({ kind: 'none' });
  });

  it('falls back to the legacy URL when the media was deleted (null) or is unpopulated (an id)', () => {
    expect(resolveHeroSource({ heroImage: null, heroImageUrl: 'https://legacy.example/a.jpg' })).toEqual({
      kind: 'legacy',
      url: 'https://legacy.example/a.jpg',
    });
    expect(resolveHeroSource({ heroImage: 42, heroImageUrl: 'https://legacy.example/a.jpg' })).toEqual({
      kind: 'legacy',
      url: 'https://legacy.example/a.jpg',
    });
  });

  it('trims the legacy URL', () => {
    expect(resolveHeroSource({ heroImage: null, heroImageUrl: '  https://legacy.example/a.jpg ' })).toEqual({
      kind: 'legacy',
      url: 'https://legacy.example/a.jpg',
    });
  });

  it('is none when neither is usable, including a whitespace-only legacy URL', () => {
    expect(resolveHeroSource({ heroImage: undefined, heroImageUrl: '   ' })).toEqual({ kind: 'none' });
    expect(resolveHeroSource({ heroImage: null, heroImageUrl: null })).toEqual({ kind: 'none' });
  });
});

describe('toNewsArticle', () => {
  const body = {
    root: { type: 'root', children: [], direction: 'ltr', format: '', indent: 0, version: 1 },
  } as News['body'];
  const news = (overrides: Partial<News> = {}): News => ({
    id: 9,
    title: 'Tittel',
    slug: 'tittel',
    body,
    status: 'published',
    updatedAt: UPDATED,
    createdAt: UPDATED,
    ...overrides,
  });

  it('maps to the neutral shape', () => {
    const author = { id: 1, name: 'Ada', email: 'ada@digdir.no' } as User;
    expect(
      toNewsArticle(
        news({ summary: 'Ingress', publishDate: '2026-10-14T22:30:00.000Z', tags: ['KI'], author }),
      ),
    ).toEqual({
      id: '9',
      slug: 'tittel',
      title: 'Tittel',
      summary: 'Ingress',
      body: { format: 'lexical', document: body },
      publishDate: '2026-10-14T22:30:00.000Z',
      tags: ['KI'],
      author: { name: 'Ada', email: 'ada@digdir.no' },
      hero: { kind: 'none' },
    });
  });

  it('removes empty tags and maps missing values to neutral defaults', () => {
    const item = toNewsArticle(news({ slug: null, tags: ['KI', '', 'Strategi'], author: 3 }));
    expect(item.tags).toEqual(['KI', 'Strategi']);
    expect(item).toMatchObject({ slug: '', summary: null, publishDate: null, author: null });
    expect(toNewsArticle(news({ tags: null })).tags).toEqual([]);
  });

  it('resolves the hero', () => {
    expect(toNewsArticle(news({ heroImage: media() })).hero.kind).toBe('image');
    expect(toNewsArticle(news({ heroImageUrl: 'https://x.example/a.jpg' })).hero).toEqual({
      kind: 'legacy',
      url: 'https://x.example/a.jpg',
    });
  });

  it('carries no CMS-internal fields', () => {
    const item = toNewsArticle(news({ featured: true })) as unknown as Record<string, unknown>;
    for (const key of ['status', 'featured', 'heroImage', 'heroImageUrl', 'createdAt', 'updatedAt']) {
      expect(item).not.toHaveProperty(key);
    }
  });
});
