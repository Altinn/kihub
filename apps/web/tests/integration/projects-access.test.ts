import type { Role } from '@kihub/governance-core';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPublishedProjectBySlug, listPublishedProjects } from '@/lib/projects';
import type { Project } from '@/payload-types';

/**
 * T006/T012 (016 US1/US3, FR-006/007/009) — the Projects authoring access matrix and the
 * published-only visibility invariant, exercised through the Payload local API with
 * `overrideAccess: false` + an explicit `user` (the same enforcement path the admin/REST API
 * takes). Proves: Contributor+ can author/publish/delete; Reader/anonymous are refused; slugs are
 * unique; and both the collection's own access rule and the `lib/projects.ts` read layer agree —
 * neither ever surfaces a draft, including by slug.
 */
let payload: Payload;
const testId = 'projects-access-0001';
type Doc = { id: number; role: Role };
const users: Record<'reader' | 'contributor', Doc> = {} as never;
let publishedId: number;
let draftId: number;
let draftSlug: string;

/** Minimal valid lexical editor state for the required rich-text `body`. */
function lexical(text: string): Project['body'] {
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
  } as Project['body'];
}

function createProject(
  data: { title: string; body: Project['body']; slug?: string; status?: 'draft' | 'published' },
  user?: Doc,
) {
  return payload.create({
    collection: 'projects',
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
    collection: 'projects',
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

beforeAll(async () => {
  payload = await getPayload({ config });
  await cleanup();

  users.reader = await makeUser('reader');
  users.contributor = await makeUser('contributor');

  const published = await createProject(
    { title: `Published ${testId}`, body: lexical('published body'), status: 'published' },
    users.contributor,
  );
  publishedId = published.id;

  const draft = await createProject({ title: `Draft ${testId}`, body: lexical('draft body') }, users.contributor);
  draftId = draft.id;
  draftSlug = draft.slug ?? '';
}, 120000);

afterAll(async () => {
  if (payload) await cleanup();
});

describe('Projects authoring access + visibility (T006/T012)', () => {
  it('auto-derives a slug and defaults new docs to draft (FR-006)', () => {
    expect(draftSlug).toBe(`draft-${testId}`);
    expect(publishedId).toBeGreaterThan(0);
  });

  it('refuses create for a Reader and for an anonymous request (FR-006)', async () => {
    await expect(
      createProject({ title: `ReaderTry ${testId}`, body: lexical('x') }, users.reader),
    ).rejects.toThrow();

    await expect(createProject({ title: `AnonTry ${testId}`, body: lexical('x') })).rejects.toThrow();
  });

  it('lets a Contributor update (publish) and delete (FR-006)', async () => {
    const created = await createProject({ title: `Editable ${testId}`, body: lexical('x') }, users.contributor);
    const published = await payload.update({
      collection: 'projects',
      id: created.id,
      data: { status: 'published' },
      overrideAccess: false,
      user: users.contributor,
    });
    expect(published.status).toBe('published');

    await payload.delete({
      collection: 'projects',
      id: created.id,
      overrideAccess: false,
      user: users.contributor,
    });
    const gone = await payload.findByID({
      collection: 'projects',
      id: created.id,
      overrideAccess: true,
      disableErrors: true,
    });
    expect(gone).toBeNull();
  });

  it('enforces slug uniqueness', async () => {
    await createProject(
      { title: `Dup A ${testId}`, slug: `dup-${testId}`, body: lexical('a') },
      users.contributor,
    );
    await expect(
      createProject({ title: `Dup B ${testId}`, slug: `dup-${testId}`, body: lexical('b') }, users.contributor),
    ).rejects.toThrow();
  });

  it('shows employees (Reader) only published projects, never drafts — incl. by slug (FR-007)', async () => {
    const asReader = await payload.find({
      collection: 'projects',
      where: { title: { like: `%${testId}%` } },
      limit: 100,
      overrideAccess: false,
      user: users.reader,
    });
    expect(asReader.docs.length).toBeGreaterThan(0);
    expect(asReader.docs.every((d) => d.status === 'published')).toBe(true);
    expect(asReader.docs.some((d) => d.id === draftId)).toBe(false);

    const bySlug = await payload.find({
      collection: 'projects',
      where: { slug: { equals: draftSlug } },
      limit: 1,
      overrideAccess: false,
      user: users.reader,
    });
    expect(bySlug.docs.length).toBe(0);
  });

  it('the read layer never returns a draft, in the list or by slug (FR-007/009)', async () => {
    const list = await listPublishedProjects();
    expect(list.some((p) => p.id === draftId)).toBe(false);
    expect(list.some((p) => p.id === publishedId)).toBe(true);

    const byDraftSlug = await getPublishedProjectBySlug(draftSlug);
    expect(byDraftSlug).toBeNull();

    const published = await payload.findByID({ collection: 'projects', id: publishedId, overrideAccess: true });
    const byPublishedSlug = await getPublishedProjectBySlug(published.slug ?? '');
    expect(byPublishedSlug?.id).toBe(publishedId);
  });
});
