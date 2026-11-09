import type { Role } from '@kihub/governance-core';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getEventBySlug } from '@/lib/events';
import { getLearningPageBySlug } from '@/lib/learning';
import { getNewsBySlug } from '@/lib/news';
import { getPageBySlug } from '@/lib/pages';
import type { ReadOptions } from '@/lib/payload-queries';
import { getProjectBySlug } from '@/lib/projects';

/**
 * 027 T017 — contracts/content-drafts.md A1/A3/A4/A5, table-driven over every draft-enabled
 * collection, through the Payload local API with `overrideAccess: false` + an explicit `user` (the
 * enforcement path the admin and the REST/GraphQL API take), plus the `lib/*` by-slug readers.
 *
 * A1 a never-published draft is invisible to a reader (collection access AND read layer);
 * A3 a reader cannot read version history (it holds draft content);
 * A4 a contributor can list versions, and a draft read returns the latest draft;
 * A5 a contributor can publish, after which the reader sees it.
 */
let payload: Payload;
const testId = 'content-drafts-0001';
type Doc = { id: number; role: Role };
const users: Record<'reader' | 'contributor', Doc> = {} as never;
let categoryId: number;

type Slug = 'news' | 'projects' | 'events' | 'learning-pages' | 'pages';

function lexical(text: string) {
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
  };
}

const CASES: {
  collection: Slug;
  data: (title: string) => Record<string, unknown>;
  bySlug: (slug: string, opts?: ReadOptions) => Promise<{ title?: string | null } | null>;
}[] = [
  { collection: 'news', data: (title) => ({ title, body: lexical(title) }), bySlug: getNewsBySlug },
  { collection: 'projects', data: (title) => ({ title, body: lexical(title) }), bySlug: getProjectBySlug },
  {
    collection: 'events',
    data: (title) => ({ title, description: lexical(title), startDateTime: '2030-01-15T09:00:00.000Z' }),
    bySlug: getEventBySlug,
  },
  {
    collection: 'learning-pages',
    data: (title) => ({ title, body: lexical(title), category: categoryId }),
    bySlug: getLearningPageBySlug,
  },
  // 027 US3 (T036)
  { collection: 'pages', data: (title) => ({ title, body: lexical(title) }), bySlug: getPageBySlug },
];

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
  for (const { collection } of CASES) {
    await payload.delete({ collection, where: { title: { like: `%${testId}%` } }, overrideAccess: true });
  }
  await payload.delete({
    collection: 'learning-categories',
    where: { title: { like: `%${testId}%` } },
    overrideAccess: true,
  });
  await payload.delete({
    collection: 'users',
    where: { entraOid: { like: `test-oid-${testId}%` } },
    overrideAccess: true,
  });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await cleanup();
  users.reader = await makeUser('reader');
  users.contributor = await makeUser('contributor');
  const category = await payload.create({
    collection: 'learning-categories',
    data: { title: `Kategori ${testId}` },
    overrideAccess: true,
  });
  categoryId = category.id;
}, 120000);

afterAll(async () => {
  if (payload) await cleanup();
});

describe.each(CASES)('$collection — Payload drafts (027)', ({ collection, data, bySlug }) => {
  async function createDraft(label: string) {
    return payload.create({
      collection,
      data: data(`${label} ${collection} ${testId}`) as never,
      draft: true,
      overrideAccess: false,
      user: users.contributor,
    });
  }

  it('A1: a never-published draft is invisible to a reader and to the read layer', async () => {
    const draft = await createDraft('Utkast');
    expect(draft._status).toBe('draft');
    expect(draft.slug).toBeTruthy();

    const asReader = await payload.find({
      collection,
      where: { id: { equals: draft.id } },
      overrideAccess: false,
      user: users.reader,
    });
    expect(asReader.docs).toHaveLength(0);
    await expect(
      payload.findByID({ collection, id: draft.id, overrideAccess: false, user: users.reader }),
    ).rejects.toThrow();

    expect(await bySlug(draft.slug as string)).toBeNull();
    // …but an editor's preview read returns it.
    expect((await bySlug(draft.slug as string, { preview: true }))?.title).toBe(draft.title);
  });

  it('A3: a reader cannot read version history', async () => {
    const draft = await createDraft('Historikk');
    await expect(
      payload.findVersions({
        collection,
        where: { parent: { equals: draft.id } },
        overrideAccess: false,
        user: users.reader,
      }),
    ).rejects.toThrow();
  });

  it('A4: a contributor lists versions; a draft read returns the latest draft', async () => {
    const draft = await createDraft('Versjoner');
    await payload.update({
      collection,
      id: draft.id,
      data: { title: `Endret ${collection} ${testId}` } as never,
      draft: true,
      overrideAccess: false,
      user: users.contributor,
    });

    const versions = await payload.findVersions({
      collection,
      where: { parent: { equals: draft.id } },
      overrideAccess: false,
      user: users.contributor,
    });
    expect(versions.totalDocs).toBeGreaterThanOrEqual(2);

    const latest = await payload.findByID({
      collection,
      id: draft.id,
      draft: true,
      overrideAccess: false,
      user: users.contributor,
    });
    expect(latest.title).toBe(`Endret ${collection} ${testId}`);
  });

  it('A5: a contributor can publish, after which the reader sees it', async () => {
    const draft = await createDraft('Publiser');
    const published = await payload.update({
      collection,
      id: draft.id,
      data: { _status: 'published' } as never,
      overrideAccess: false,
      user: users.contributor,
    });
    expect(published._status).toBe('published');

    const asReader = await payload.findByID({
      collection,
      id: draft.id,
      overrideAccess: false,
      user: users.reader,
    });
    expect(asReader.title).toBe(draft.title);
    expect((await bySlug(draft.slug as string))?.title).toBe(draft.title);
  });
});
