import path from 'node:path';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveHeroSource } from '@/lib/news-view';
import type { Media, News } from '@/payload-types';

/**
 * 020 T012 + T023 — news hero images against the real upload pipeline (contracts/cms-news-hero.md
 * A3.2, A3.5). Runs in `disk` mode, like media-upload.test.ts.
 *
 * A3.2 is asserted on PIXELS, not just dimensions: the fixture is blue with a red strip in its
 * right-most 200px, so a focal point at x=95 must put red in the card's right-most column, while
 * the default centre framing must not. That is the reported bug (text at the edge cropped away)
 * stated as a test.
 */
let payload: Payload;
const testId = 'news-hero-0001';

function lexical(text: string): News['body'] {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          textFormat: 0,
          children: [{ type: 'text', text, format: 0, style: '', mode: 'normal', detail: 0, version: 1 }],
        },
      ],
    },
  } as News['body'];
}

/** 3200x1000, solid blue with a solid red strip in the right-most 200px (the "text at the edge"). */
async function edgeStripPng(): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  const red = await sharp({
    create: { width: 200, height: 1000, channels: 3, background: { r: 230, g: 20, b: 20 } },
  })
    .png()
    .toBuffer();
  return sharp({ create: { width: 3200, height: 1000, channels: 3, background: { r: 20, g: 40, b: 220 } } })
    .composite([{ input: red, left: 3000, top: 0 }])
    .png()
    .toBuffer();
}

async function uploadEdgeStrip(focal: { focalX: number; focalY: number }, name: string): Promise<Media> {
  const data = await edgeStripPng();
  return (await payload.create({
    collection: 'media',
    data: { alt: `Kantstripe ${testId}`, ...focal } as never,
    file: { name, data, mimetype: 'image/png', size: data.byteLength },
    overrideAccess: true,
  })) as Media;
}

/** Mean RGB of the card file's right-most 10px column. */
async function rightEdgeColour(doc: Media): Promise<{ r: number; b: number }> {
  const sharp = (await import('sharp')).default;
  const staticDir = payload.collections.media.config.upload.staticDir as string;
  const file = path.resolve(staticDir, doc.sizes?.card?.filename as string);
  const { width, height } = await sharp(file).metadata();
  // Materialise the column first: `sharp().extract().stats()` would report the WHOLE input image —
  // `stats()` ignores pipeline operations.
  const column = await sharp(file)
    .extract({ left: (width as number) - 10, top: 0, width: 10, height: height as number })
    .toBuffer();
  const stats = await sharp(column).stats();
  return { r: stats.channels[0]!.mean, b: stats.channels[2]!.mean };
}

async function cleanup() {
  await payload.delete({ collection: 'news', where: { title: { like: `%${testId}%` } }, overrideAccess: true });
  await payload.delete({ collection: 'media', where: { alt: { like: `%${testId}%` } }, overrideAccess: true });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

describe('focal-point framing of the card size (A3.2, FR-004, SC-001)', () => {
  it('frames the card on the focal point: an edge strip at x=95 stays visible', async () => {
    const doc = await uploadEdgeStrip({ focalX: 95, focalY: 50 }, 'edge-focal.png');

    expect(doc.focalX).toBe(95);
    expect(doc.sizes?.card).toMatchObject({ width: 800, height: 500 });
    expect(doc.sizes?.card2x).toMatchObject({ width: 1600, height: 1000 });

    const edge = await rightEdgeColour(doc);
    expect(edge.r).toBeGreaterThan(180);
    expect(edge.b).toBeLessThan(80);
  });

  it('control: the default centre framing crops the same strip away', async () => {
    const doc = await uploadEdgeStrip({ focalX: 50, focalY: 50 }, 'edge-centre.png');
    const edge = await rightEdgeColour(doc);
    expect(edge.b).toBeGreaterThan(180);
    expect(edge.r).toBeLessThan(80);
  });
});

describe('news → media relationship (A3.5, FR-008, FR-010)', () => {
  it('populates heroImage at depth 1, and falls back to the legacy URL once the media is deleted', async () => {
    const hero = await uploadEdgeStrip({ focalX: 50, focalY: 50 }, 'hero.png');
    const legacyUrl = 'https://legacy.example/hero.jpg';
    const article = await payload.create({
      collection: 'news',
      data: {
        title: `Toppbilde ${testId}`,
        body: lexical('brødtekst'),
        status: 'published',
        heroImage: hero.id,
        heroImageUrl: legacyUrl,
      } as never,
      overrideAccess: true,
    });

    const populated = (await payload.findByID({ collection: 'news', id: article.id, depth: 1 })) as News;
    expect(typeof populated.heroImage).toBe('object');
    expect(resolveHeroSource(populated).kind).toBe('upload');

    await payload.delete({ collection: 'media', id: hero.id, overrideAccess: true });

    const after = (await payload.findByID({ collection: 'news', id: article.id, depth: 1 })) as News;
    expect(after.heroImage ?? null).toBeNull();
    expect(after.heroImageUrl).toBe(legacyUrl);
    expect(resolveHeroSource(after)).toEqual({ kind: 'legacy', url: legacyUrl });
  });
});
