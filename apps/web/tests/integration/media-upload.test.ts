import type { Role } from '@kihub/governance-core';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * 014 T043 (US3) — the `media` upload collection (contracts/media-storage.md §A).
 *
 * Asserts what the collection promises: raster images are accepted and get their generated sizes,
 * SVG and oversized files are refused, `alt` is mandatory, and only Contributor+ can upload. Runs in
 * `disk` mode, so no Azure configuration is involved (guarantee B1.4).
 */
let payload: Payload;
const testId = 'media-upload-0001';
type Doc = { id: number; role: Role };
const users: Record<'reader' | 'contributor', Doc> = {} as never;

/**
 * Fixtures are GENERATED with sharp rather than inlined as base64. A hand-pasted 1x1 PNG passes
 * `sharp().metadata()` but fails re-encoding with "vipspng: libpng read error", which surfaces as an
 * opaque Payload FileUploadError — a fixture problem that looks exactly like a product bug.
 */
async function png(width: number, height: number): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  return sharp({
    create: { width, height, channels: 3, background: { r: 20, g: 90, b: 180 } },
  })
    .png()
    .toBuffer();
}

/** Small enough that the 760-wide `content` size must not enlarge it. */
const SMALL = { width: 8, height: 8 };

function upload(
  data: { alt?: string },
  file: { name: string; data: Buffer; mimetype: string; size: number },
  user?: Doc,
) {
  return payload.create({
    collection: 'media',
    data: data as never,
    file,
    overrideAccess: user !== undefined ? false : true,
    ...(user ? { user } : {}),
  });
}

async function makeUser(role: Doc['role']): Promise<Doc> {
  const doc = await payload.create({
    collection: 'users',
    data: {
      entraOid: `test-oid-${testId}-${role}`,
      email: `${role}.${testId}@digdir.no`,
      name: `Test ${role}`,
      tenantId: '00000000-0000-0000-0000-000000000000',
      role,
    },
    overrideAccess: true,
  });
  return { id: doc.id, role: doc.role as Role };
}

async function cleanup() {
  await payload.delete({
    collection: 'media',
    where: { alt: { like: `%${testId}%` } },
    overrideAccess: true,
  });
  const existing = await payload.find({
    collection: 'users',
    where: { entraOid: { like: `test-oid-${testId}%` } },
    limit: 100,
    overrideAccess: true,
  });
  if (existing.docs.length) {
    await payload.delete({
      collection: 'users',
      where: { id: { in: existing.docs.map((d) => d.id) } },
      overrideAccess: true,
    });
  }
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await cleanup();
  users.reader = await makeUser('reader');
  users.contributor = await makeUser('contributor');
});

afterAll(async () => {
  await cleanup();
});

describe('accepted uploads (FR-022, FR-023)', () => {
  it('stores a PNG with its alt text', async () => {
    const data = await png(SMALL.width, SMALL.height);
    const doc = await upload(
      { alt: `Et diagram ${testId}` },
      { name: 'diagram.png', data, mimetype: 'image/png', size: data.byteLength },
    );
    expect(doc.alt).toBe(`Et diagram ${testId}`);
    expect(doc.mimeType).toBe('image/png');
    expect(doc.filename).toBeTruthy();
  });

  it('generates the content sizes and downscales a large source (FR-023)', async () => {
    const wide = await png(2000, 1000);
    const doc = await upload(
      { alt: `Bredt skjermbilde ${testId}` },
      { name: 'wide.png', data: wide, mimetype: 'image/png', size: wide.byteLength },
    );

    expect(doc.width).toBe(2000);
    // The reading-column size, not the original.
    expect(doc.sizes?.content?.width).toBe(760);
    expect(doc.sizes?.content2x?.width).toBe(1520);
  });

  it('does not enlarge an image smaller than the target size', async () => {
    const data = await png(SMALL.width, SMALL.height);
    const doc = await upload(
      { alt: `Lite ikon ${testId}` },
      { name: 'tiny.png', data, mimetype: 'image/png', size: data.byteLength },
    );
    // withoutEnlargement — an 8px source is never blown up to 760.
    expect(doc.sizes?.content?.width ?? SMALL.width).toBeLessThanOrEqual(SMALL.width);
  });
});

describe('refused uploads (FR-022)', () => {
  it('REFUSES an SVG — script-capable and served from our own origin', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await expect(
      upload(
        { alt: `Vektorbilde ${testId}` },
        { name: 'evil.svg', data: svg, mimetype: 'image/svg+xml', size: svg.byteLength },
      ),
    ).rejects.toThrow();
  });

  it('REFUSES a non-image file', async () => {
    const pdf = Buffer.from('%PDF-1.4 not really a pdf');
    await expect(
      upload(
        { alt: `Dokument ${testId}` },
        { name: 'doc.pdf', data: pdf, mimetype: 'application/pdf', size: pdf.byteLength },
      ),
    ).rejects.toThrow();
  });

  it('REFUSES a file over the 5 MB limit, with a Norwegian message', async () => {
    // The hook reads `req.file.size`, so the declared size is what is checked — no need to
    // materialise 6 MB of pixels.
    await expect(
      upload(
        { alt: `For stor ${testId}` },
        { name: 'huge.png', data: await png(SMALL.width, SMALL.height), mimetype: 'image/png', size: 6 * 1024 * 1024 },
      ),
    ).rejects.toThrow(/for stor|5 MB/i);
  });

  it('REQUIRES alt text (FR-021)', async () => {
    await expect(
      upload({}, {
        name: 'no-alt.png',
        data: await png(SMALL.width, SMALL.height),
        mimetype: 'image/png',
        size: SMALL.width,
      }),
    ).rejects.toThrow();
  });
});

describe('access control (FR-031)', () => {
  it('allows a Contributor to upload', async () => {
    const data = await png(SMALL.width, SMALL.height);
    const doc = await upload(
      { alt: `Bidragsyter lastet opp ${testId}` },
      { name: 'contrib.png', data, mimetype: 'image/png', size: data.byteLength },
      users.contributor,
    );
    expect(doc.id).toBeTruthy();
  });

  it('REFUSES a Reader', async () => {
    await expect(
      upload(
        { alt: `Leser prøver ${testId}` },
        { name: 'reader.png', data: await png(SMALL.width, SMALL.height), mimetype: 'image/png', size: SMALL.width },
        users.reader,
      ),
    ).rejects.toThrow();
  });

  it('REFUSES an anonymous upload', async () => {
    await expect(
      payload.create({
        collection: 'media',
        data: { alt: `Anonym ${testId}` } as never,
        file: {
          name: 'anon.png',
          data: await png(SMALL.width, SMALL.height),
          mimetype: 'image/png',
          size: SMALL.width,
        },
        overrideAccess: false,
      }),
    ).rejects.toThrow();
  });

  it('lets everyone READ — a published page’s image must be fetchable', async () => {
    const data = await png(SMALL.width, SMALL.height);
    const created = await upload(
      { alt: `Lesbar for alle ${testId}` },
      { name: 'public.png', data, mimetype: 'image/png', size: data.byteLength },
    );
    const asReader = await payload.findByID({
      collection: 'media',
      id: created.id,
      overrideAccess: false,
      user: users.reader,
    });
    expect(asReader.id).toBe(created.id);
  });
});
