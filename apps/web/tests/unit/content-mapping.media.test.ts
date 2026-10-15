import { describe, expect, it } from 'vitest';
import { toAuthor, toContentImage } from '@/lib/content/payload/media';
import type { Media, User } from '@/payload-types';

/** 023 T010 — Payload Media/User → ContentImage/Author, mapped exactly (research R3). */

const media = (overrides: Partial<Media> = {}): Media => ({
  id: 7,
  alt: 'Alt-tekst',
  url: '/payload-api/media/file/a.png',
  width: 2400,
  height: 1600,
  focalX: 0,
  focalY: 35,
  updatedAt: '2026-09-01T10:00:00.000Z',
  createdAt: '2026-09-01T10:00:00.000Z',
  ...overrides,
});

describe('toContentImage', () => {
  it('maps the original, alt, focal point and version source', () => {
    expect(toContentImage(media({ sizes: {} }))).toEqual({
      url: '/payload-api/media/file/a.png',
      width: 2400,
      height: 1600,
      alt: 'Alt-tekst',
      focalX: 0,
      focalY: 35,
      updatedAt: '2026-09-01T10:00:00.000Z',
      renditions: {},
    });
  });

  it('keeps a focal value of 0 and a null focal point as-is', () => {
    expect(toContentImage(media({ focalX: 0, focalY: 0 }))?.focalX).toBe(0);
    const unset = toContentImage(media({ focalX: null, focalY: undefined }));
    expect(unset?.focalX).toBeNull();
    expect(unset?.focalY).toBeNull();
  });

  it('maps only the size keys that exist, keeping null urls', () => {
    const image = toContentImage(
      media({
        sizes: {
          card: { url: '/c.png', width: 800, height: 500, mimeType: 'image/png', filesize: 1, filename: 'c.png' },
          content: { url: null, width: null, height: null },
        },
      }),
    );
    expect(image?.renditions).toEqual({
      card: { url: '/c.png', width: 800, height: 500 },
      content: { url: null, width: null, height: null },
    });
    expect(image?.renditions).not.toHaveProperty('card2x');
    expect(image?.renditions).not.toHaveProperty('content2x');
  });

  it('defaults missing nullable fields to null', () => {
    const image = toContentImage(media({ url: undefined, width: undefined, height: null, updatedAt: '' }));
    expect(image).toMatchObject({ url: null, width: null, height: null });
  });

  it('is null for an unset relation or a bare (unpopulated) id', () => {
    expect(toContentImage(null)).toBeNull();
    expect(toContentImage(undefined)).toBeNull();
    expect(toContentImage(9999)).toBeNull();
  });
});

describe('toAuthor', () => {
  const user = (overrides: Partial<User>): User =>
    ({ id: 1, email: 'ada@digdir.no', updatedAt: '', createdAt: '', ...overrides }) as User;

  it('maps name and email', () => {
    expect(toAuthor(user({ name: 'Ada Lovelace' }))).toEqual({ name: 'Ada Lovelace', email: 'ada@digdir.no' });
  });

  it('keeps a missing name as null (email-only byline)', () => {
    expect(toAuthor(user({ name: null }))).toEqual({ name: null, email: 'ada@digdir.no' });
  });

  it('is null for an unset relation or a bare id', () => {
    expect(toAuthor(null)).toBeNull();
    expect(toAuthor(undefined)).toBeNull();
    expect(toAuthor(1)).toBeNull();
  });
});
