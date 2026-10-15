import { describe, expect, it } from 'vitest';
import { toLearningArticle } from '@/lib/content/payload/learning';
import type { LearningCategory, LearningPage, LearningSubcategory, User } from '@/payload-types';

/** 023 T023 — Payload LearningPage → LearningArticle (data-model.md). */

const body = {
  root: { type: 'root', children: [], direction: 'ltr', format: '', indent: 0, version: 1 },
} as LearningPage['body'];

const page = (overrides: Partial<LearningPage> = {}): LearningPage => ({
  id: 5,
  title: 'Introduksjon',
  slug: 'introduksjon',
  category: 1,
  body,
  status: 'published',
  updatedAt: '2026-10-02T13:45:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

describe('toLearningArticle', () => {
  it('resolves populated category/subcategory to titles and the author to a byline', () => {
    const category = { id: 1, title: 'Kom i gang' } as LearningCategory;
    const subcategory = { id: 2, title: 'Verktøy' } as LearningSubcategory;
    const author = { id: 3, name: null, email: 'grace@digdir.no' } as User;
    expect(toLearningArticle(page({ category, subcategory, author, summary: 'Kort' }))).toEqual({
      id: '5',
      slug: 'introduksjon',
      title: 'Introduksjon',
      summary: 'Kort',
      body: { format: 'lexical', document: body },
      updatedAt: '2026-10-02T13:45:00.000Z',
      categoryTitle: 'Kom i gang',
      subcategoryTitle: 'Verktøy',
      author: { name: null, email: 'grace@digdir.no' },
    });
  });

  it('maps unset or unpopulated relations to "" / null', () => {
    const item = toLearningArticle(page({ category: 1, subcategory: null, author: 3, slug: null }));
    expect(item).toMatchObject({ categoryTitle: '', subcategoryTitle: '', author: null, slug: '', summary: null });
    expect(toLearningArticle(page({ subcategory: undefined, author: undefined })).author).toBeNull();
  });

  it('carries no CMS-internal fields', () => {
    const item = toLearningArticle(page({ order: 3 })) as unknown as Record<string, unknown>;
    for (const key of ['status', 'order', 'category', 'subcategory', 'createdAt']) {
      expect(item).not.toHaveProperty(key);
    }
  });
});
