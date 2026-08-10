import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { LearningPage } from '@/payload-types';

/**
 * 014 T028 (US2) — the two editorial safety rules, exercised through the API path rather than the
 * admin form:
 *
 * - FR-014: a page's subcategory must belong to the page's own category. `filterOptions` only
 *   constrains the admin dropdown, so this asserts the `beforeValidate` hook — the enforcement that
 *   the REST/GraphQL path actually goes through.
 * - FR-016: deleting a category or subcategory that still holds content is refused, so pages can
 *   never be orphaned into invisibility.
 */
let payload: Payload;
const testId = 'learning-hierarchy-0001';
let categoryA: number;
let categoryB: number;
let subOfA: number;
let subOfB: number;

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

function createPage(data: { title: string; category: number; subcategory?: number }) {
  return payload.create({
    collection: 'learning-pages',
    data: { ...data, body: lexical(data.title), status: 'published' } as never,
    overrideAccess: true,
  });
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
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await cleanup();

  categoryA = (
    await payload.create({
      collection: 'learning-categories',
      data: { title: `Kategori A ${testId}`, order: 1 },
      overrideAccess: true,
    })
  ).id;
  categoryB = (
    await payload.create({
      collection: 'learning-categories',
      data: { title: `Kategori B ${testId}`, order: 2 },
      overrideAccess: true,
    })
  ).id;
  subOfA = (
    await payload.create({
      collection: 'learning-subcategories',
      data: { title: `Gruppe i A ${testId}`, category: categoryA },
      overrideAccess: true,
    })
  ).id;
  subOfB = (
    await payload.create({
      collection: 'learning-subcategories',
      data: { title: `Gruppe i B ${testId}`, category: categoryB },
      overrideAccess: true,
    })
  ).id;
});

afterAll(async () => {
  await cleanup();
});

describe('FR-014 — a subcategory must belong to the page’s category', () => {
  it('accepts a subcategory of the same category', async () => {
    const page = await createPage({
      title: `Gyldig kombinasjon ${testId}`,
      category: categoryA,
      subcategory: subOfA,
    });
    expect(page.id).toBeTruthy();
  });

  it('accepts a page with no subcategory at all', async () => {
    const page = await createPage({ title: `Uten underkategori ${testId}`, category: categoryA });
    expect(page.subcategory).toBeFalsy();
  });

  it('REJECTS a subcategory belonging to a different category, on create', async () => {
    await expect(
      createPage({
        title: `Ugyldig kombinasjon ${testId}`,
        category: categoryA,
        subcategory: subOfB,
      }),
    ).rejects.toThrow(/annen kategori/i);
  });

  it('REJECTS it on update too — not just on create', async () => {
    const page = await createPage({ title: `Skal ikke flyttes ${testId}`, category: categoryA });
    await expect(
      payload.update({
        collection: 'learning-pages',
        id: page.id,
        data: { subcategory: subOfB },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/annen kategori/i);
  });

  it('REJECTS a partial update that sets only the subcategory, using the STORED category', async () => {
    // The guard against a hook that only looks at incoming data: here `category` is absent from the
    // patch, so the check has to fall back to `originalDoc`.
    const page = await createPage({ title: `Delvis oppdatering ${testId}`, category: categoryA });
    await expect(
      payload.update({
        collection: 'learning-pages',
        id: page.id,
        data: { subcategory: subOfB },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/annen kategori/i);
  });

  it('allows moving a page to another category together with a matching subcategory', async () => {
    const page = await createPage({
      title: `Flyttes med gruppe ${testId}`,
      category: categoryA,
      subcategory: subOfA,
    });
    const moved = await payload.update({
      collection: 'learning-pages',
      id: page.id,
      data: { category: categoryB, subcategory: subOfB },
      overrideAccess: true,
    });
    expect(moved.id).toBe(page.id);
  });
});

describe('FR-016 — no orphaned content on delete', () => {
  it('refuses to delete a category that still holds pages, naming the count', async () => {
    await createPage({ title: `Blokkerer sletting ${testId}`, category: categoryB });
    await expect(
      payload.delete({ collection: 'learning-categories', id: categoryB, overrideAccess: true }),
    ).rejects.toThrow(/side/i);
  });

  it('refuses to delete a category that still holds subcategories', async () => {
    const emptyCategory = (
      await payload.create({
        collection: 'learning-categories',
        data: { title: `Bare grupper ${testId}` },
        overrideAccess: true,
      })
    ).id;
    await payload.create({
      collection: 'learning-subcategories',
      data: { title: `Ensom gruppe ${testId}`, category: emptyCategory },
      overrideAccess: true,
    });

    await expect(
      payload.delete({ collection: 'learning-categories', id: emptyCategory, overrideAccess: true }),
    ).rejects.toThrow(/underkategori/i);
  });

  it('refuses to delete a subcategory that still holds pages', async () => {
    const category = (
      await payload.create({
        collection: 'learning-categories',
        data: { title: `Sletteprøve ${testId}` },
        overrideAccess: true,
      })
    ).id;
    const subcategory = (
      await payload.create({
        collection: 'learning-subcategories',
        data: { title: `Gruppe med side ${testId}`, category },
        overrideAccess: true,
      })
    ).id;
    await createPage({ title: `Side i gruppe ${testId}`, category, subcategory });

    await expect(
      payload.delete({
        collection: 'learning-subcategories',
        id: subcategory,
        overrideAccess: true,
      }),
    ).rejects.toThrow(/side/i);
  });

  it('ALLOWS the delete once the content has been moved away', async () => {
    const category = (
      await payload.create({
        collection: 'learning-categories',
        data: { title: `Tømmes ${testId}` },
        overrideAccess: true,
      })
    ).id;
    const subcategory = (
      await payload.create({
        collection: 'learning-subcategories',
        data: { title: `Tømmes gruppe ${testId}`, category },
        overrideAccess: true,
      })
    ).id;
    const page = await createPage({ title: `Blir flyttet ${testId}`, category, subcategory });

    // Move the page out of the subcategory, then out of the category.
    await payload.update({
      collection: 'learning-pages',
      id: page.id,
      data: { category: categoryA, subcategory: null },
      overrideAccess: true,
    });

    await expect(
      payload.delete({ collection: 'learning-subcategories', id: subcategory, overrideAccess: true }),
    ).resolves.toBeTruthy();
    await expect(
      payload.delete({ collection: 'learning-categories', id: category, overrideAccess: true }),
    ).resolves.toBeTruthy();
  });

  it('allows deleting a genuinely empty category', async () => {
    const empty = (
      await payload.create({
        collection: 'learning-categories',
        data: { title: `Helt tom ${testId}` },
        overrideAccess: true,
      })
    ).id;
    await expect(
      payload.delete({ collection: 'learning-categories', id: empty, overrideAccess: true }),
    ).resolves.toBeTruthy();
  });
});

describe('FR-013 — the hierarchy cannot be deepened', () => {
  it('has no subcategory field on learning-subcategories, so nesting is structurally impossible', () => {
    const fields = payload.collections['learning-subcategories'].config.fields
      .map((f) => ('name' in f ? f.name : ''))
      .filter(Boolean);
    expect(fields).toContain('category');
    expect(fields).not.toContain('subcategory');
    expect(fields).not.toContain('parent');
  });
});
