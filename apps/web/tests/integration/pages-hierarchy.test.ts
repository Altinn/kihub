import type { Role } from '@kihub/governance-core';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PAGE_HIERARCHY_MESSAGES as MSG } from '@/lib/page-hierarchy';
import { pageAddress, type PageInChain } from '@/lib/page-tree';
import { getPageBySlug, getPageSection } from '@/lib/pages';
import type { Page } from '@/payload-types';

/**
 * 028 US2/US3 — page hierarchy through the Payload local API with `overrideAccess: false` and an
 * editor (the path the admin and the REST API take): the hierarchy rules (contracts/page-hierarchy.md
 * §B), address resolution in the read layer (§C, §D) and the section read (§D).
 */
let payload: Payload;
const testId = 'pages-hier-0001';
type Doc = { id: number; role: Role };
let editor: Doc;

const slug = (name: string) => `${name}-${testId}`;

function body(text: string): Page['body'] {
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

async function create(
  name: string,
  data: { parent?: number | null; order?: number; title?: string } = {},
  status: 'published' | 'draft' = 'published',
) {
  return payload.create({
    collection: 'pages',
    data: {
      title: data.title ?? `${name} ${testId}`,
      slug: slug(name),
      body: body(name),
      _status: status,
      ...data,
    } as never,
    draft: status === 'draft',
    overrideAccess: false,
    user: editor,
  });
}

function setParent(id: number, parent: number | null) {
  return payload.update({
    collection: 'pages',
    id,
    data: { parent } as never,
    overrideAccess: false,
    user: editor,
  });
}

async function expectRefused(promise: Promise<unknown>, message: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e as { message?: string; status?: number },
  );
  expect(error?.message).toBe(message);
  expect(error?.status).toBe(400);
}

async function cleanup() {
  // Children first is not required (the FK is ON DELETE SET NULL), but keeps the run quiet.
  await payload.delete({
    collection: 'pages',
    where: { slug: { like: `%${testId}` } },
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
  const user = await payload.create({
    collection: 'users',
    data: {
      entraOid: `test-oid-${testId}-editor`,
      email: `editor.${testId}@digdir.no`,
      name: 'Test editor',
      tenantId: '00000000-0000-0000-0000-000000000000',
      role: 'contributor',
    },
    overrideAccess: true,
  });
  editor = { id: user.id, role: user.role as Role };
}, 120000);

afterAll(async () => {
  if (payload) await cleanup();
});

describe('hierarchy rules (FR-010)', () => {
  it('accepts a three-level chain and refuses a fourth level', async () => {
    const a = await create('a1');
    const b = await create('b1', { parent: a.id });
    const c = await create('c1', { parent: b.id });
    expect(typeof c.parent === 'object' ? c.parent?.id : c.parent).toBe(b.id);
    await expectRefused(create('d1', { parent: c.id }), MSG.depth);
  });

  it('refuses a page as its own parent', async () => {
    const a = await create('self');
    await expectRefused(setParent(a.id, a.id), MSG.self);
  });

  it('refuses a cycle (a page under one of its own descendants)', async () => {
    const a = await create('cyc-a');
    const b = await create('cyc-b', { parent: a.id });
    const c = await create('cyc-c', { parent: b.id });
    await expectRefused(setParent(a.id, c.id), MSG.cycle);
    await expectRefused(setParent(a.id, b.id), MSG.cycle);
  });

  it('refuses moving a subtree so that the hierarchy gets a fourth level', async () => {
    const a = await create('mv-a');
    const b = await create('mv-b', { parent: a.id });
    const x = await create('mv-x');
    const y = await create('mv-y', { parent: x.id });
    // x has a child, so under b (level 2) x would be level 3 and y level 4.
    await expectRefused(setParent(x.id, b.id), MSG.depth);
    // Under a (level 1) it fits: x level 2, y level 3.
    const moved = await setParent(x.id, a.id);
    expect(typeof moved.parent === 'object' ? moved.parent?.id : moved.parent).toBe(a.id);
    expect(y.id).toBeGreaterThan(0);
  });

  it('refuses a parent that does not exist', async () => {
    await expectRefused(create('ghost', { parent: 999999999 }), MSG.missing);
  });

  it('a partial update without `parent` keeps the stored one and is checked against it', async () => {
    const a = await create('keep-a');
    const b = await create('keep-b', { parent: a.id });
    const renamed = await payload.update({
      collection: 'pages',
      id: b.id,
      data: { title: `Nytt ${testId}` },
      overrideAccess: false,
      user: editor,
    });
    expect(typeof renamed.parent === 'object' ? renamed.parent?.id : renamed.parent).toBe(a.id);
  });

  it('deleting a parent makes its children top-level pages', async () => {
    const a = await create('del-a');
    const b = await create('del-b', { parent: a.id });
    await payload.delete({ collection: 'pages', id: a.id, overrideAccess: false, user: editor });
    const after = await payload.findByID({ collection: 'pages', id: b.id, depth: 0, overrideAccess: true });
    expect(after.parent ?? null).toBeNull();
  });
});

describe('addresses from the read layer (FR-011, FR-013, FR-016)', () => {
  it('resolves a page by its slug with the parent chain populated', async () => {
    const a = await create('adr-a');
    const b = await create('adr-b', { parent: a.id });
    await create('adr-c', { parent: b.id });
    const page = await getPageBySlug(slug('adr-c'));
    expect(pageAddress(page as PageInChain, { publishedOnly: true })).toBe(
      `/${slug('adr-a')}/${slug('adr-b')}/${slug('adr-c')}`,
    );
  });

  it('readers get the flat address under a never-published parent; preview gets the nested one', async () => {
    const root = await create('drf-root', {}, 'draft');
    await create('drf-child', { parent: root.id });

    const reader = await getPageBySlug(slug('drf-child'));
    expect(reader).not.toBeNull();
    expect(pageAddress(reader as PageInChain, { publishedOnly: true })).toBe(`/${slug('drf-child')}`);

    const preview = await getPageBySlug(slug('drf-child'), { preview: true });
    expect(pageAddress(preview as PageInChain)).toBe(`/${slug('drf-root')}/${slug('drf-child')}`);
  });

  it('a draft child under a published parent is not found for readers', async () => {
    const root = await create('dc-root');
    await create('dc-child', { parent: root.id }, 'draft');
    expect(await getPageBySlug(slug('dc-child'))).toBeNull();
    expect(await getPageBySlug(slug('dc-child'), { preview: true })).not.toBeNull();
  });

  it('preview uses the parent set in the latest draft', async () => {
    const a = await create('pv-a');
    const b = await create('pv-b');
    const child = await create('pv-child', { parent: a.id });
    await payload.update({
      collection: 'pages',
      id: child.id,
      data: { parent: b.id } as never,
      draft: true,
      overrideAccess: false,
      user: editor,
    });
    const reader = await getPageBySlug(slug('pv-child'));
    const preview = await getPageBySlug(slug('pv-child'), { preview: true });
    expect(pageAddress(reader as PageInChain, { publishedOnly: true })).toBe(`/${slug('pv-a')}/${slug('pv-child')}`);
    expect(pageAddress(preview as PageInChain)).toBe(`/${slug('pv-b')}/${slug('pv-child')}`);
  });
});

describe('section read (FR-020, FR-021, FR-023)', () => {
  it('lists published pages only, ordered, also in preview', async () => {
    const root = await create('sec-root', { title: `Seksjon ${testId}` });
    await create('sec-30', { parent: root.id, order: 30, title: `C ${testId}` });
    await create('sec-10', { parent: root.id, order: 10, title: `A ${testId}` });
    await create('sec-20', { parent: root.id, order: 20, title: `B ${testId}` });
    await create('sec-draft', { parent: root.id, order: 5, title: `Utkast ${testId}` }, 'draft');

    for (const preview of [false, true]) {
      const page = await getPageBySlug(slug('sec-20'), { preview });
      const section = await getPageSection(page!, { preview });
      expect(section?.title).toBe(`Seksjon ${testId}`);
      expect(section?.root.children.map((x) => x.title)).toEqual([`A ${testId}`, `B ${testId}`, `C ${testId}`]);
      expect(section?.root.children.find((x) => x.isCurrent)?.title).toBe(`B ${testId}`);
    }
  });

  it('has no menu when the root is not published, or the page stands alone', async () => {
    const root = await create('nos-root', {}, 'draft');
    await create('nos-child', { parent: root.id });
    const child = await getPageBySlug(slug('nos-child'));
    expect(await getPageSection(child!)).toBeNull();

    await create('alone');
    const alone = await getPageBySlug(slug('alone'));
    expect(await getPageSection(alone!)).toBeNull();
  });
});
