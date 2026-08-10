import { describe, expect, it } from 'vitest';
import {
  buildLearningTree,
  learningPageHref,
  LEARNING_CODE_LANGUAGES,
  type LearningLibrary,
} from '@/lib/learning-view';

/**
 * 014 T012 — `buildLearningTree` (contracts/learning-read.md §B, guarantees B1–B9). Pure input →
 * pure output, no database: the whole point of keeping the assembly out of the read layer.
 */

const cat = (id: number, title: string, order?: number, description?: string) => ({
  id,
  title,
  order,
  description,
});
const sub = (id: number, title: string, category: number, order?: number) => ({
  id,
  title,
  category,
  order,
});
const page = (
  id: number,
  title: string,
  category: number,
  opts: { subcategory?: number | null; order?: number; slug?: string | null } = {},
) => ({
  id,
  title,
  slug: opts.slug === undefined ? title.toLowerCase().replace(/\s+/g, '-') : opts.slug,
  category,
  subcategory: opts.subcategory ?? null,
  order: opts.order,
});

const library = (over: Partial<LearningLibrary> = {}): LearningLibrary => ({
  categories: [],
  subcategories: [],
  pages: [],
  ...over,
});

describe('learningPageHref', () => {
  it('is the single expression of the flat address shape (FR-010)', () => {
    expect(learningPageHref('hva-er-agenter')).toBe('/laering/hva-er-agenter');
  });
});

describe('buildLearningTree — ordering (B1, FR-015)', () => {
  it('orders categories by order then title', () => {
    const tree = buildLearningTree(
      library({
        categories: [cat(1, 'Referanse', 20), cat(2, 'Grunnleggende', 10), cat(3, 'Avansert', 10)],
        pages: [page(10, 'A', 1), page(11, 'B', 2), page(12, 'C', 3)],
      }),
    );
    // order 10 group sorts alphabetically among itself, then order 20.
    expect(tree.map((c) => c.title)).toEqual(['Avansert', 'Grunnleggende', 'Referanse']);
  });

  it('orders pages by order then title, and treats a missing order as the default 100', () => {
    const tree = buildLearningTree(
      library({
        categories: [cat(1, 'K')],
        pages: [
          page(10, 'Zebra', 1, { order: 10 }),
          page(11, 'Alpha', 1), // no order → 100
          page(12, 'Beta', 1, { order: 100 }),
        ],
      }),
    );
    expect(tree[0].pages.map((p) => p.title)).toEqual(['Zebra', 'Alpha', 'Beta']);
  });

  it('is stable for items an editor never ordered — alphabetical, not input order', () => {
    const first = buildLearningTree(
      library({
        categories: [cat(1, 'K')],
        pages: [page(10, 'Ceta', 1), page(11, 'Alfa', 1), page(12, 'Beta', 1)],
      }),
    );
    const reversed = buildLearningTree(
      library({
        categories: [cat(1, 'K')],
        pages: [page(12, 'Beta', 1), page(11, 'Alfa', 1), page(10, 'Ceta', 1)],
      }),
    );
    expect(first[0].pages.map((p) => p.title)).toEqual(['Alfa', 'Beta', 'Ceta']);
    expect(reversed[0].pages.map((p) => p.title)).toEqual(first[0].pages.map((p) => p.title));
  });

  it('sorts Norwegian letters with nb collation', () => {
    const tree = buildLearningTree(
      library({
        categories: [cat(1, 'K')],
        pages: [page(10, 'Øving', 1), page(11, 'Alfa', 1), page(12, 'Ære', 1)],
      }),
    );
    // æ, ø, å sort AFTER z in Norwegian.
    expect(tree[0].pages.map((p) => p.title)).toEqual(['Alfa', 'Ære', 'Øving']);
  });
});

describe('buildLearningTree — grouping (B2, B3)', () => {
  it('puts a page with a subcategory into that group, and one without directly on the category', () => {
    const tree = buildLearningTree(
      library({
        categories: [cat(1, 'Grunnleggende')],
        subcategories: [sub(5, 'Tips & triks', 1)],
        pages: [page(10, 'Direkte', 1), page(11, 'Gruppert', 1, { subcategory: 5 })],
      }),
    );
    expect(tree[0].pages.map((p) => p.title)).toEqual(['Direkte']);
    expect(tree[0].groups).toHaveLength(1);
    expect(tree[0].groups[0]).toMatchObject({ title: 'Tips & triks' });
    expect(tree[0].groups[0].pages.map((p) => p.title)).toEqual(['Gruppert']);
  });

  it('emits ungrouped pages before subcategory groups (B3)', () => {
    const tree = buildLearningTree(
      library({
        categories: [cat(1, 'K')],
        subcategories: [sub(5, 'Gruppe', 1)],
        pages: [page(10, 'Ugruppert', 1), page(11, 'I gruppe', 1, { subcategory: 5 })],
      }),
    );
    // The contract is positional: `pages` renders first, then `groups`.
    expect(tree[0].pages).toHaveLength(1);
    expect(tree[0].groups).toHaveLength(1);
  });

  it('treats a subcategory belonging to a DIFFERENT category as ungrouped, never reparenting', () => {
    const tree = buildLearningTree(
      library({
        categories: [cat(1, 'Eier', 10), cat(2, 'Annen', 20)],
        subcategories: [sub(5, 'Fremmed gruppe', 2)],
        // Data anomaly the FR-014 hook prevents; the tree must not move the page under category 2.
        pages: [page(10, 'Side', 1, { subcategory: 5 })],
      }),
    );
    expect(tree).toHaveLength(1);
    expect(tree[0].title).toBe('Eier');
    expect(tree[0].pages.map((p) => p.title)).toEqual(['Side']);
    expect(tree[0].groups).toEqual([]);
  });
});

describe('buildLearningTree — pruning (B4, FR-008)', () => {
  it('omits a category with no pages anywhere beneath it', () => {
    const tree = buildLearningTree(
      library({
        categories: [cat(1, 'Full', 10), cat(2, 'Tom', 20, 'Har beskrivelse men ingen sider')],
        pages: [page(10, 'Side', 1)],
      }),
    );
    expect(tree.map((c) => c.title)).toEqual(['Full']);
  });

  it('omits an empty subcategory group while keeping its category and sibling pages', () => {
    const tree = buildLearningTree(
      library({
        categories: [cat(1, 'K')],
        subcategories: [sub(5, 'Tom gruppe', 1), sub(6, 'Full gruppe', 1)],
        pages: [page(10, 'Direkte', 1), page(11, 'Gruppert', 1, { subcategory: 6 })],
      }),
    );
    expect(tree[0].groups.map((g) => g.title)).toEqual(['Full gruppe']);
    expect(tree[0].pages.map((p) => p.title)).toEqual(['Direkte']);
  });

  it('returns an empty tree for an empty library', () => {
    expect(buildLearningTree(library())).toEqual([]);
  });

  it('drops a page whose category does not resolve (B7)', () => {
    const tree = buildLearningTree(
      library({
        categories: [cat(1, 'K')],
        pages: [page(10, 'Gyldig', 1), page(11, 'Foreldreløs', 999)],
      }),
    );
    expect(tree[0].pages.map((p) => p.title)).toEqual(['Gyldig']);
  });

  it('drops a page with no usable handle rather than rendering a broken link', () => {
    const tree = buildLearningTree(
      library({
        categories: [cat(1, 'K')],
        pages: [page(10, 'Med handle', 1), page(11, 'Uten handle', 1, { slug: null })],
      }),
    );
    expect(tree[0].pages.map((p) => p.title)).toEqual(['Med handle']);
  });
});

describe('buildLearningTree — current page (B5, B6, FR-003/FR-004)', () => {
  const lib = library({
    categories: [cat(1, 'Første', 10), cat(2, 'Andre', 20)],
    subcategories: [sub(5, 'Gruppe', 2)],
    pages: [
      page(10, 'Side en', 1),
      page(11, 'Side to', 2, { subcategory: 5 }),
    ],
  });

  it('marks exactly the current page and the category containing it', () => {
    const tree = buildLearningTree(lib, 'side-to');
    expect(tree.find((c) => c.title === 'Første')?.containsCurrent).toBe(false);
    const second = tree.find((c) => c.title === 'Andre');
    expect(second?.containsCurrent).toBe(true);
    expect(second?.groups[0].pages[0].isCurrent).toBe(true);
  });

  it('marks nothing current when no slug is given (the overview route)', () => {
    const tree = buildLearningTree(lib);
    expect(tree.every((c) => !c.containsCurrent)).toBe(true);
    expect(tree.flatMap((c) => c.pages).every((p) => !p.isCurrent)).toBe(true);
  });

  it('marks nothing current for an unknown slug', () => {
    const tree = buildLearningTree(lib, 'finnes-ikke');
    expect(tree.every((c) => !c.containsCurrent)).toBe(true);
  });
});

describe('buildLearningTree — overview data (B8)', () => {
  it('points the category entry link at its first page and carries the description', () => {
    const tree = buildLearningTree(
      library({
        categories: [cat(1, 'K', 10, 'En beskrivelse')],
        pages: [page(10, 'Andre', 1, { order: 20 }), page(11, 'Første', 1, { order: 10 })],
      }),
    );
    expect(tree[0].description).toBe('En beskrivelse');
    expect(tree[0].href).toBe(learningPageHref('første'));
  });

  it('falls back to an empty description rather than null', () => {
    const tree = buildLearningTree(
      library({ categories: [cat(1, 'K')], pages: [page(10, 'S', 1)] }),
    );
    expect(tree[0].description).toBe('');
  });

  it('uses the first page of a subcategory group when the category has no ungrouped pages', () => {
    const tree = buildLearningTree(
      library({
        categories: [cat(1, 'K')],
        subcategories: [sub(5, 'Gruppe', 1)],
        pages: [page(10, 'Bare i gruppe', 1, { subcategory: 5 })],
      }),
    );
    expect(tree[0].href).toBe(learningPageHref('bare-i-gruppe'));
  });
});

describe('buildLearningTree — status is not its concern (B9, FR-032)', () => {
  it('renders whatever pages it is given, because the read layer owns the published filter', () => {
    // Guards the invariant: if this function ever started filtering on status, the rule would live
    // in two places and could drift. The read layer is the single owner.
    const tree = buildLearningTree(
      library({
        categories: [cat(1, 'K')],
        pages: [{ ...page(10, 'Gitt av leselaget', 1) }],
      }),
    );
    expect(tree[0].pages).toHaveLength(1);
  });
});

describe('LEARNING_CODE_LANGUAGES (FR-026/028)', () => {
  it('is the curated set, and includes plaintext for the fallback path', () => {
    expect(Object.keys(LEARNING_CODE_LANGUAGES)).toEqual([
      'shell',
      'json',
      'yaml',
      'typescript',
      'javascript',
      'python',
      'markdown',
      'plaintext',
    ]);
  });

  it('labels are Norwegian where the language name is not a proper noun', () => {
    expect(LEARNING_CODE_LANGUAGES.plaintext).toBe('Ren tekst');
  });
});
