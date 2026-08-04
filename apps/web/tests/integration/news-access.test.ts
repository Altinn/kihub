import type { Role } from '@kihub/governance-core';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { News } from '@/payload-types';

/**
 * T009 (US2/US3, FR-002/003/006/007/013) — the News authoring access matrix and the published-only
 * visibility invariant, exercised through the Payload local API with `overrideAccess: false` + an
 * explicit `user` (the same enforcement path the admin/REST API takes). Proves: Contributor+ can
 * author/publish/delete; Reader/anonymous are refused; slugs are unique; and a Reader-scoped read
 * returns only published articles (never a draft, including by slug).
 */
let payload: Payload;
const testId = 'news-access-0001';
type Doc = { id: number; role: Role };
const users: Record<'reader' | 'contributor', Doc> = {} as never;
let publishedId: number;
let draftId: number;
let draftSlug: string;

/** Minimal valid lexical editor state for the required rich-text `body`. */
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

/**
 * Create a news doc as `user` (or anonymously). The `data` cast at the Payload boundary keeps call
 * sites typed for the fields we set while satisfying Payload's create-input type (its rich-text and
 * hook-derived `slug` typing is stricter than what we hand-build here).
 */
function createNews(
  data: { title: string; body: News['body']; slug?: string; status?: 'draft' | 'published' },
  user?: Doc,
) {
  return payload.create({
    collection: 'news',
    data: data as never,
    overrideAccess: false,
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
    collection: 'news',
    where: { title: { like: `%${testId}%` } },
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

const authorId = (doc: { author?: unknown }) =>
  typeof doc.author === 'object' && doc.author ? (doc.author as { id: number }).id : doc.author;

beforeAll(async () => {
  payload = await getPayload({ config });
  await cleanup();

  users.reader = await makeUser('reader');
  users.contributor = await makeUser('contributor');

  const published = await createNews(
    { title: `Published ${testId}`, body: lexical('published body'), status: 'published' },
    users.contributor,
  );
  publishedId = published.id;

  const draft = await createNews({ title: `Draft ${testId}`, body: lexical('draft body') }, users.contributor);
  draftId = draft.id;
  draftSlug = draft.slug ?? '';
}, 120000);

afterAll(async () => {
  if (payload) await cleanup();
});

describe('News authoring access + visibility (T009)', () => {
  it('auto-derives a slug and defaults author to the creator (FR-011/013)', () => {
    expect(draftSlug).toBe(`draft-${testId}`);
    expect(publishedId).toBeGreaterThan(0);
  });

  it('sets publishDate and status on publish; defaults new docs to draft (FR-003)', async () => {
    const pub = await payload.findByID({ collection: 'news', id: publishedId, overrideAccess: true });
    expect(pub.status).toBe('published');
    expect(pub.publishDate).toBeTruthy();
    expect(authorId(pub)).toBe(users.contributor.id);

    const draft = await payload.findByID({ collection: 'news', id: draftId, overrideAccess: true });
    expect(draft.status).toBe('draft');
  });

  it('refuses create for a Reader and for an anonymous request (FR-007)', async () => {
    await expect(
      createNews({ title: `ReaderTry ${testId}`, body: lexical('x') }, users.reader),
    ).rejects.toThrow();

    await expect(createNews({ title: `AnonTry ${testId}`, body: lexical('x') })).rejects.toThrow();
  });

  it('lets a Contributor update (publish) and delete (FR-002)', async () => {
    const created = await createNews({ title: `Editable ${testId}`, body: lexical('x') }, users.contributor);
    const published = await payload.update({
      collection: 'news',
      id: created.id,
      data: { status: 'published' },
      overrideAccess: false,
      user: users.contributor,
    });
    expect(published.status).toBe('published');
    expect(published.publishDate).toBeTruthy();

    await payload.delete({
      collection: 'news',
      id: created.id,
      overrideAccess: false,
      user: users.contributor,
    });
    const gone = await payload.findByID({
      collection: 'news',
      id: created.id,
      overrideAccess: true,
      disableErrors: true,
    });
    expect(gone).toBeNull();
  });

  it('enforces slug uniqueness (FR-013)', async () => {
    await createNews(
      { title: `Dup A ${testId}`, slug: `dup-${testId}`, body: lexical('a') },
      users.contributor,
    );
    await expect(
      createNews({ title: `Dup B ${testId}`, slug: `dup-${testId}`, body: lexical('b') }, users.contributor),
    ).rejects.toThrow();
  });

  it('shows employees (Reader) only published articles, never drafts — incl. by slug (US3, FR-006)', async () => {
    const asReader = await payload.find({
      collection: 'news',
      where: { title: { like: `%${testId}%` } },
      limit: 100,
      overrideAccess: false,
      user: users.reader,
    });
    expect(asReader.docs.length).toBeGreaterThan(0);
    expect(asReader.docs.every((d) => d.status === 'published')).toBe(true);
    expect(asReader.docs.some((d) => d.id === draftId)).toBe(false);

    const bySlug = await payload.find({
      collection: 'news',
      where: { slug: { equals: draftSlug } },
      limit: 1,
      overrideAccess: false,
      user: users.reader,
    });
    expect(bySlug.docs.length).toBe(0);
  });
});
