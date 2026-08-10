import type { Role } from '@kihub/governance-core';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPublishedLearningPageBySlug, readLearningLibrary } from '@/lib/learning';
import type { LearningPage } from '@/payload-types';

/**
 * 014 T044 (US4) — the access matrix and the no-draft-leak invariant across all four learning
 * collections (FR-031/032/033, SC-003).
 *
 * Exercised through the Payload local API with `overrideAccess: false` + an explicit `user` — the
 * same enforcement path the admin UI and the REST/GraphQL API take, which is what makes this a real
 * test of the access rules rather than of our read layer (the `news-access.test.ts` posture).
 */
let payload: Payload;
const testId = 'learning-access-0001';
type Doc = { id: number; role: Role };
const users: Record<'reader' | 'contributor' | 'reviewer' | 'approver' | 'admin', Doc> =
  {} as never;
let categoryId: number;
let publishedSlug: string;
let draftSlug: string;
let mediaId: number;

function lexical(text: string): LearningPage['body'] {
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
          children: [
            { type: 'text', text, format: 0, style: '', mode: 'normal', detail: 0, version: 1 },
          ],
        },
      ],
    },
  } as LearningPage['body'];
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
  for (const collection of [
    'learning-pages',
    'learning-subcategories',
    'learning-categories',
  ] as const) {
    await payload.delete({
      collection,
      where: { title: { like: `%${testId}%` } },
      overrideAccess: true,
    });
  }
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
  users.reviewer = await makeUser('reviewer');
  users.approver = await makeUser('approver');
  users.admin = await makeUser('admin');

  const category = await payload.create({
    collection: 'learning-categories',
    data: { title: `Kategori ${testId}` },
    overrideAccess: true,
  });
  categoryId = category.id;

  const published = await payload.create({
    collection: 'learning-pages',
    data: {
      title: `Publisert ${testId}`,
      category: categoryId,
      status: 'published',
      body: lexical('publisert innhold'),
    } as never,
    overrideAccess: true,
  });
  publishedSlug = published.slug as string;

  const draft = await payload.create({
    collection: 'learning-pages',
    data: {
      title: `Utkast ${testId}`,
      category: categoryId,
      status: 'draft',
      body: lexical('hemmelig utkast'),
    } as never,
    overrideAccess: true,
  });
  draftSlug = draft.slug as string;

  const sharp = (await import('sharp')).default;
  const png = await sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 1, g: 2, b: 3 } },
  })
    .png()
    .toBuffer();
  const media = await payload.create({
    collection: 'media',
    data: { alt: `Bilde ${testId}` } as never,
    file: { name: 'access.png', data: png, mimetype: 'image/png', size: png.byteLength },
    overrideAccess: true,
  });
  mediaId = media.id;
});

afterAll(async () => {
  await cleanup();
});

const EDITOR_ROLES = ['contributor', 'reviewer', 'approver', 'admin'] as const;

describe('FR-031 — only Contributor+ may write', () => {
  it('REFUSES a Reader on every learning collection', async () => {
    await expect(
      payload.create({
        collection: 'learning-categories',
        data: { title: `Leser lager ${testId}` },
        overrideAccess: false,
        user: users.reader,
      }),
    ).rejects.toThrow();

    await expect(
      payload.create({
        collection: 'learning-subcategories',
        data: { title: `Leser lager gruppe ${testId}`, category: categoryId },
        overrideAccess: false,
        user: users.reader,
      }),
    ).rejects.toThrow();

    await expect(
      payload.create({
        collection: 'learning-pages',
        data: {
          title: `Leser lager side ${testId}`,
          category: categoryId,
          body: lexical('nei'),
        } as never,
        overrideAccess: false,
        user: users.reader,
      }),
    ).rejects.toThrow();
  });

  it('REFUSES an anonymous write', async () => {
    await expect(
      payload.create({
        collection: 'learning-categories',
        data: { title: `Anonym ${testId}` },
        overrideAccess: false,
      }),
    ).rejects.toThrow();
  });

  it.each(EDITOR_ROLES)('ALLOWS %s to author a page', async (role) => {
    const page = await payload.create({
      collection: 'learning-pages',
      data: {
        title: `Skrevet av ${role} ${testId}`,
        category: categoryId,
        body: lexical('innhold'),
      } as never,
      overrideAccess: false,
      user: users[role],
    });
    expect(page.id).toBeTruthy();
    // The author is stamped from the acting user.
    const authorId = typeof page.author === 'object' && page.author ? page.author.id : page.author;
    expect(authorId).toBe(users[role].id);
  });

  it('REFUSES a Reader deleting or updating an existing page', async () => {
    const page = await payload.find({
      collection: 'learning-pages',
      where: { title: { equals: `Publisert ${testId}` } },
      limit: 1,
      overrideAccess: true,
    });
    const id = page.docs[0].id;

    await expect(
      payload.update({
        collection: 'learning-pages',
        id,
        data: { title: 'kapret' },
        overrideAccess: false,
        user: users.reader,
      }),
    ).rejects.toThrow();

    await expect(
      payload.delete({
        collection: 'learning-pages',
        id,
        overrideAccess: false,
        user: users.reader,
      }),
    ).rejects.toThrow();
  });
});

describe('FR-032 — drafts never leak to non-editors', () => {
  it('does not return a draft to a Reader through the data interface', async () => {
    const result = await payload.find({
      collection: 'learning-pages',
      where: { title: { like: `%${testId}%` } },
      limit: 100,
      overrideAccess: false,
      user: users.reader,
    });
    const titles = result.docs.map((d) => d.title);
    expect(titles).toContain(`Publisert ${testId}`);
    expect(titles).not.toContain(`Utkast ${testId}`);
  });

  it('does not return a draft to an ANONYMOUS reader', async () => {
    const result = await payload.find({
      collection: 'learning-pages',
      where: { title: { like: `%${testId}%` } },
      limit: 100,
      overrideAccess: false,
    });
    expect(result.docs.map((d) => d.title)).not.toContain(`Utkast ${testId}`);
  });

  it('does not return a draft even when a Reader asks for it BY SLUG', async () => {
    const result = await payload.find({
      collection: 'learning-pages',
      where: { slug: { equals: draftSlug } },
      limit: 1,
      overrideAccess: false,
      user: users.reader,
    });
    expect(result.docs).toHaveLength(0);
  });

  it('DOES return the draft to an editor — the back-office must see its own drafts', async () => {
    const result = await payload.find({
      collection: 'learning-pages',
      where: { slug: { equals: draftSlug } },
      limit: 1,
      overrideAccess: false,
      user: users.contributor,
    });
    expect(result.docs).toHaveLength(1);
  });

  it('keeps the read layer published-only regardless of role (defence in depth)', async () => {
    // The second line of defence: even if an access rule regressed, lib/learning.ts filters.
    expect(await getPublishedLearningPageBySlug(draftSlug)).toBeNull();
    expect(await getPublishedLearningPageBySlug(publishedSlug)).not.toBeNull();

    const library = await readLearningLibrary();
    expect(library.pages.map((p) => p.title)).not.toContain(`Utkast ${testId}`);
  });
});

describe('FR-031 — media access', () => {
  it('REFUSES a Reader deleting a media document', async () => {
    await expect(
      payload.delete({
        collection: 'media',
        id: mediaId,
        overrideAccess: false,
        user: users.reader,
      }),
    ).rejects.toThrow();
  });

  it('keeps an image available to editors after the page using it is unpublished', async () => {
    const page = await payload.create({
      collection: 'learning-pages',
      data: {
        title: `Bruker bilde ${testId}`,
        category: categoryId,
        status: 'published',
        body: lexical('med bilde'),
      } as never,
      overrideAccess: true,
    });
    await payload.update({
      collection: 'learning-pages',
      id: page.id,
      data: { status: 'draft' },
      overrideAccess: true,
    });

    // The asset itself is untouched and still reusable (spec US4 scenario 5).
    const media = await payload.findByID({
      collection: 'media',
      id: mediaId,
      overrideAccess: false,
      user: users.contributor,
    });
    expect(media.id).toBe(mediaId);
  });
});

describe('categories and subcategories are readable by everyone', () => {
  it('lets a Reader read the grouping collections — the sidebar needs them', async () => {
    const categories = await payload.find({
      collection: 'learning-categories',
      where: { title: { like: `%${testId}%` } },
      overrideAccess: false,
      user: users.reader,
    });
    expect(categories.docs.length).toBeGreaterThan(0);
  });
});
