import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPublishedLearningPageBySlug, readLearningLibrary } from '@/lib/learning';
import { buildLearningTree } from '@/lib/learning-view';
import type { LearningPage } from '@/payload-types';

/**
 * 014 T020 (US1) — the read layer against a real database (contracts/learning-read.md §A,
 * guarantees A1–A4). Proves the two things a unit test cannot: that the queries really return
 * published-only, and that reading the library costs a FIXED number of queries however many pages
 * exist (SC-010).
 */
let payload: Payload;
const testId = 'learning-reads-0001';
let categoryId: number;
let subcategoryId: number;

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

function createPage(data: {
  title: string;
  category: number;
  subcategory?: number;
  status?: 'draft' | 'published';
  order?: number;
}) {
  return payload.create({
    collection: 'learning-pages',
    data: { ...data, body: lexical(`body of ${data.title}`) } as never,
    overrideAccess: true,
  });
}

async function cleanup() {
  await payload.delete({
    collection: 'learning-pages',
    where: { title: { like: `%${testId}%` } },
    overrideAccess: true,
  });
  await payload.delete({
    collection: 'learning-subcategories',
    where: { title: { like: `%${testId}%` } },
    overrideAccess: true,
  });
  await payload.delete({
    collection: 'learning-categories',
    where: { title: { like: `%${testId}%` } },
    overrideAccess: true,
  });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await cleanup();

  const category = await payload.create({
    collection: 'learning-categories',
    data: { title: `Kategori ${testId}`, description: 'En beskrivelse', order: 1 },
    overrideAccess: true,
  });
  categoryId = category.id;

  const subcategory = await payload.create({
    collection: 'learning-subcategories',
    data: { title: `Gruppe ${testId}`, category: categoryId, order: 1 },
    overrideAccess: true,
  });
  subcategoryId = subcategory.id;

  await createPage({ title: `Publisert A ${testId}`, category: categoryId, order: 1, status: 'published' });
  await createPage({ title: `Publisert B ${testId}`, category: categoryId, subcategory: subcategoryId, order: 2, status: 'published' });
  await createPage({ title: `Utkast ${testId}`, category: categoryId, order: 3, status: 'draft' });
});

afterAll(async () => {
  await cleanup();
});

describe('readLearningLibrary (A1, A3)', () => {
  it('returns only published pages — a draft is never in the library', async () => {
    const library = await readLearningLibrary();
    const titles = library.pages.map((p) => p.title);
    expect(titles).toContain(`Publisert A ${testId}`);
    expect(titles).toContain(`Publisert B ${testId}`);
    expect(titles).not.toContain(`Utkast ${testId}`);
  });

  it('returns relationships as ids, not populated documents (depth: 0 — the SC-010 guarantee)', async () => {
    const library = await readLearningLibrary();
    const page = library.pages.find((p) => p.title === `Publisert B ${testId}`);
    expect(typeof page?.category).toBe('number');
    expect(typeof page?.subcategory).toBe('number');
  });

  it('pre-sorts every collection by order then title', async () => {
    const library = await readLearningLibrary();
    const ours = library.pages.filter((p) => p.title.includes(testId));
    expect(ours.map((p) => p.title)).toEqual([
      `Publisert A ${testId}`,
      `Publisert B ${testId}`,
    ]);
  });
});

describe('readLearningLibrary — query cost (A2, SC-010)', () => {
  it('costs exactly three queries, and does not grow with the number of pages', async () => {
    // Count `find` calls rather than SQL: `find` is the unit that would become N+1 if the tree were
    // assembled by querying per category, which is the regression this guards.
    const original = payload.find.bind(payload);
    const calls: string[] = [];
    payload.find = ((args: Parameters<typeof original>[0]) => {
      calls.push(args.collection);
      return original(args);
    }) as typeof payload.find;

    try {
      await readLearningLibrary();
      const before = calls.length;
      expect(before).toBe(3);
      expect(new Set(calls)).toEqual(
        new Set(['learning-categories', 'learning-subcategories', 'learning-pages']),
      );

      // Add more pages; the query count must not move.
      calls.length = 0;
      await createPage({ title: `Ekstra 1 ${testId}`, category: categoryId, status: 'published' });
      await createPage({ title: `Ekstra 2 ${testId}`, category: categoryId, subcategory: subcategoryId, status: 'published' });
      calls.length = 0;
      await readLearningLibrary();
      expect(calls.length).toBe(before);
    } finally {
      payload.find = original;
    }
  });
});

describe('buildLearningTree against real data (US1 end to end)', () => {
  it('groups the published pages under their category and subcategory, excluding the draft', async () => {
    const library = await readLearningLibrary();
    const tree = buildLearningTree(library);
    const category = tree.find((c) => c.title === `Kategori ${testId}`);

    expect(category).toBeDefined();
    expect(category?.description).toBe('En beskrivelse');

    const allTitles = [
      ...(category?.pages ?? []).map((p) => p.title),
      ...(category?.groups ?? []).flatMap((g) => g.pages.map((p) => p.title)),
    ];
    expect(allTitles).toContain(`Publisert A ${testId}`);
    expect(allTitles).toContain(`Publisert B ${testId}`);
    expect(allTitles).not.toContain(`Utkast ${testId}`);

    expect(category?.groups.map((g) => g.title)).toContain(`Gruppe ${testId}`);
  });

  it('marks the current page and opens only its category', async () => {
    const library = await readLearningLibrary();
    const slug = library.pages.find((p) => p.title === `Publisert A ${testId}`)?.slug;
    expect(slug).toBeTruthy();

    const tree = buildLearningTree(library, slug!);
    const ours = tree.find((c) => c.title === `Kategori ${testId}`);
    expect(ours?.containsCurrent).toBe(true);
    // Every other category must be closed.
    expect(tree.filter((c) => c.title !== `Kategori ${testId}`).every((c) => !c.containsCurrent)).toBe(
      true,
    );
  });
});

describe('getPublishedLearningPageBySlug (FR-012, FR-032)', () => {
  it('returns a published page by its handle', async () => {
    const library = await readLearningLibrary();
    const slug = library.pages.find((p) => p.title === `Publisert A ${testId}`)!.slug!;
    const page = await getPublishedLearningPageBySlug(slug);
    expect(page?.title).toBe(`Publisert A ${testId}`);
  });

  it('returns null for a draft handle, so the route 404s instead of leaking it', async () => {
    const draft = await payload.find({
      collection: 'learning-pages',
      where: { title: { equals: `Utkast ${testId}` } },
      limit: 1,
      overrideAccess: true,
    });
    const slug = (draft.docs[0] as LearningPage).slug!;
    expect(slug).toBeTruthy();
    expect(await getPublishedLearningPageBySlug(slug)).toBeNull();
  });

  it('returns null for an unknown handle', async () => {
    expect(await getPublishedLearningPageBySlug('finnes-ikke-i-det-hele-tatt')).toBeNull();
  });
});

describe('slug derivation against the database (FR-011)', () => {
  it('derives a handle from the title, mapping Norwegian letters', async () => {
    const page = await createPage({ title: `Få dybde og størrelse ${testId}`, category: categoryId, status: 'published' });
    expect(page.slug).toBe(`fa-dybde-og-storrelse-${testId}`);
  });

  it('keeps the handle stable when the title changes', async () => {
    const created = await createPage({ title: `Opprinnelig tittel ${testId}`, category: categoryId, status: 'published' });
    const updated = await payload.update({
      collection: 'learning-pages',
      id: created.id,
      data: { title: `Endret tittel ${testId}` },
      overrideAccess: true,
    });
    expect(updated.slug).toBe(created.slug);
  });
});
