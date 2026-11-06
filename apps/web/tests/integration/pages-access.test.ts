import type { Role } from '@kihub/governance-core';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPageBySlug } from '@/lib/pages';
import type { Page } from '@/payload-types';

/**
 * 027 T036 (US3, FR-018–FR-028) — the `pages` collection's access matrix, address rules and the
 * published-only invariant, through the Payload local API with `overrideAccess: false` + an explicit
 * `user` (the path the admin and REST/GraphQL API take), plus the `lib/pages.ts` read layer.
 */
let payload: Payload;
const testId = 'pages-access-0001';
type Doc = { id: number; role: Role };
const users: Record<'reader' | 'contributor', Doc> = {} as never;

const RESERVED = (slug: string) => `Adressen «${slug}» er reservert av KI Hub. Velg en annen.`;
const PATTERN = 'Adressen kan bare inneholde små bokstaver a–z, tall og bindestrek.';

function lexical(text: string): Page['body'] {
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
  } as Page['body'];
}

type PageInput = { title: string; slug?: string; summary?: string; _status?: 'draft' | 'published' };

function createPage(data: PageInput, user?: Doc, opts: { draft?: boolean } = {}) {
  return payload.create({
    collection: 'pages',
    data: { body: lexical(data.title), ...data } as never,
    draft: opts.draft,
    overrideAccess: false,
    ...(user ? { user } : {}),
  });
}

/** Payload's ValidationError carries per-field messages in `data.errors`. */
async function expectFieldError(promise: Promise<unknown>, message: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e as { name?: string; data?: { errors?: { path: string; message: string }[] } },
  );
  expect(error?.name).toBe('ValidationError');
  expect(error?.data?.errors).toEqual(
    expect.arrayContaining([expect.objectContaining({ path: 'slug', message })]),
  );
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
    collection: 'pages',
    // `news` can only exist if the «News»-title test regressed; it is reserved, so no real page has it.
    where: { or: [{ title: { like: `%${testId}%` } }, { slug: { equals: 'news' } }] },
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
}, 120000);

afterAll(async () => {
  if (payload) await cleanup();
});

describe('pages — authoring access (FR-018/026)', () => {
  it('a contributor creates, publishes and deletes; the author defaults to them', async () => {
    const draft = await createPage({ title: `Kontakt ${testId}` }, users.contributor, { draft: true });
    expect(draft._status).toBe('draft');
    expect(draft.slug).toBe(`kontakt-${testId}`);
    expect(typeof draft.author === 'object' ? draft.author?.id : draft.author).toBe(users.contributor.id);

    const published = await payload.update({
      collection: 'pages',
      id: draft.id,
      data: { _status: 'published' },
      overrideAccess: false,
      user: users.contributor,
    });
    expect(published._status).toBe('published');

    await payload.delete({ collection: 'pages', id: draft.id, overrideAccess: false, user: users.contributor });
    expect(
      await payload.findByID({ collection: 'pages', id: draft.id, overrideAccess: true, disableErrors: true }),
    ).toBeNull();
  });

  it('a reader and an anonymous request cannot create', async () => {
    await expect(createPage({ title: `Leser ${testId}` }, users.reader)).rejects.toThrow();
    await expect(createPage({ title: `Anonym ${testId}` })).rejects.toThrow();
  });

  it('a reader cannot read version history (it holds draft content)', async () => {
    const draft = await createPage({ title: `Historikk ${testId}` }, users.contributor, { draft: true });
    await expect(
      payload.findVersions({
        collection: 'pages',
        where: { parent: { equals: draft.id } },
        overrideAccess: false,
        user: users.reader,
      }),
    ).rejects.toThrow();
  });
});

describe('pages — visibility (FR-022/025)', () => {
  it('a draft is invisible to the reader and the read layer, but returned in preview', async () => {
    const draft = await createPage({ title: `Utkast ${testId}` }, users.contributor, { draft: true });
    const slug = draft.slug as string;

    const asReader = await payload.find({
      collection: 'pages',
      where: { slug: { equals: slug } },
      overrideAccess: false,
      user: users.reader,
    });
    expect(asReader.docs).toHaveLength(0);
    expect(await getPageBySlug(slug)).toBeNull();
    expect((await getPageBySlug(slug, { preview: true }))?.title).toBe(draft.title);
  });

  it('a published page is returned to the reader and by the read layer', async () => {
    const page = await createPage(
      { title: `Om oss ${testId}`, summary: 'Ingress', _status: 'published' },
      users.contributor,
    );
    const asReader = await payload.findByID({
      collection: 'pages',
      id: page.id,
      overrideAccess: false,
      user: users.reader,
    });
    expect(asReader.title).toBe(page.title);
    expect((await getPageBySlug(page.slug as string))?.id).toBe(page.id);
  });

  it('in preview, a colliding draft of another page does not shadow the page that owns the address', async () => {
    // Version rows are not unique-indexed, so another page's draft (e.g. an autosave while the
    // editor types an address already in use) can claim the same slug. Found in the T046 walkthrough.
    const slug = `kollisjon-${testId}`;
    const owner = await createPage({ title: `Eier ${testId}`, slug, _status: 'published' }, users.contributor);
    const other = await createPage({ title: `Annen ${testId}` }, users.contributor, { draft: true });
    await payload.update({
      collection: 'pages',
      id: other.id,
      data: { slug },
      draft: true,
      autosave: true,
      overrideAccess: false,
      user: users.contributor,
    });

    expect((await getPageBySlug(slug))?.id).toBe(owner.id);
    expect((await getPageBySlug(slug, { preview: true }))?.id).toBe(owner.id);

    // …and with more claimants than any fixed window would hold.
    for (const n of [1, 2, 3]) {
      const extra = await createPage({ title: `Ekstra ${n} ${testId}` }, users.contributor, { draft: true });
      await payload.update({
        collection: 'pages',
        id: extra.id,
        data: { slug },
        draft: true,
        autosave: true,
        overrideAccess: false,
        user: users.contributor,
      });
    }
    expect((await getPageBySlug(slug, { preview: true }))?.id).toBe(owner.id);
  });

  it('the read layer rejects addresses no page could have, without querying', async () => {
    for (const slug of ['', 'favicon.png', 'a/b', 'News', '../x']) {
      expect(await getPageBySlug(slug, { preview: true })).toBeNull();
    }
  });
});

describe('pages — addresses (FR-019–FR-021, FR-024)', () => {
  it('refuses a reserved address, in any spelling', async () => {
    await expectFieldError(
      createPage({ title: `Reservert ${testId}`, slug: 'news', _status: 'published' }, users.contributor),
      RESERVED('news'),
    );
    await expectFieldError(
      createPage({ title: `Reservert2 ${testId}`, slug: '/Laering/', _status: 'published' }, users.contributor),
      RESERVED('laering'),
    );
  });

  it('refuses a title «News» whose derived address is reserved', async () => {
    // No explicit slug: the beforeValidate hook derives `news` from the title, which is then refused.
    await expectFieldError(
      payload.create({
        collection: 'pages',
        data: { title: 'News', body: lexical(`derived ${testId}`), _status: 'published' } as never,
        overrideAccess: false,
        user: users.contributor,
      }),
      RESERVED('news'),
    );
  });

  it('refuses a nested or malformed address', async () => {
    await expectFieldError(
      createPage({ title: `Nøstet ${testId}`, slug: 'om/kontakt', _status: 'published' }, users.contributor),
      PATTERN,
    );
  });

  it('normalises what the editor typed', async () => {
    const page = await createPage(
      { title: `Normalisert ${testId}`, slug: ` /Normalisert-${testId}/ `, _status: 'published' },
      users.contributor,
    );
    expect(page.slug).toBe(`normalisert-${testId}`);
  });

  it('a draft may hold a reserved address, but cannot be published with it', async () => {
    // Autosave creates the draft before the editor finishes typing, and drafts skip validation
    // (`drafts.validate: false`), so the rule must bite at publish.
    const draft = await createPage(
      { title: `Sen validering ${testId}`, slug: 'events' },
      users.contributor,
      { draft: true },
    );
    await expectFieldError(
      payload.update({
        collection: 'pages',
        id: draft.id,
        data: { _status: 'published' },
        overrideAccess: false,
        user: users.contributor,
      }),
      RESERVED('events'),
    );
  });

  it('a blank address is derived from the title', async () => {
    const page = await createPage(
      { title: `Avledet ${testId}`, slug: '', _status: 'published' },
      users.contributor,
    );
    expect(page.slug).toBe(`avledet-${testId}`);
  });

  it('a title-only update keeps the stored address (links to it keep working)', async () => {
    const page = await createPage({ title: `Stabil ${testId}`, _status: 'published' }, users.contributor);
    const renamed = await payload.update({
      collection: 'pages',
      id: page.id,
      data: { title: `Nytt navn ${testId}` },
      overrideAccess: false,
      user: users.contributor,
    });
    expect(renamed.title).toBe(`Nytt navn ${testId}`);
    expect(renamed.slug).toBe(page.slug);
  });

  it('an explicitly cleared address is re-derived from the title', async () => {
    const page = await createPage({ title: `Tømt ${testId}`, _status: 'published' }, users.contributor);
    const cleared = await payload.update({
      collection: 'pages',
      id: page.id,
      data: { title: `Ny adresse ${testId}`, slug: '' },
      overrideAccess: false,
      user: users.contributor,
    });
    expect(cleared.slug).toBe(`ny-adresse-${testId}`);
  });

  it('refuses a duplicate address', async () => {
    await createPage(
      { title: `Dup A ${testId}`, slug: `dup-${testId}`, _status: 'published' },
      users.contributor,
    );
    await expect(
      createPage({ title: `Dup B ${testId}`, slug: `dup-${testId}`, _status: 'published' }, users.contributor),
    ).rejects.toThrow();
  });
});
