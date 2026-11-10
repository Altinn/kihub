import { describe, expect, it } from 'vitest';
import {
  buildPageSection,
  hasUnpublishedAncestor,
  pageAddress,
  pageAncestors,
  parsePagePath,
  type PageInChain,
  type PageRef,
  type SectionItem,
} from '@/lib/page-tree';

/** 028 US2/US3 — contracts/page-hierarchy.md §C. */

describe('parsePagePath', () => {
  it('accepts one to three valid segments', () => {
    expect(parsePagePath(['om-ki-hub'])).toEqual(['om-ki-hub']);
    expect(parsePagePath(['kom-i-gang', 'koble-til'])).toEqual(['kom-i-gang', 'koble-til']);
    expect(parsePagePath(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('refuses no segments and more than three', () => {
    expect(parsePagePath([])).toBeNull();
    expect(parsePagePath(['a', 'b', 'c', 'd'])).toBeNull();
  });

  it('refuses a first segment a built-in section owns, at any depth', () => {
    expect(parsePagePath(['news'])).toBeNull();
    expect(parsePagePath(['news', 'x', 'koble-til'])).toBeNull();
    expect(parsePagePath(['laering', 'x'])).toBeNull();
  });

  it('allows a reserved word in a later segment (it can never be saved as a slug anyway)', () => {
    expect(parsePagePath(['kom-i-gang', 'news'])).toEqual(['kom-i-gang', 'news']);
  });

  it('refuses segments that are not page addresses, after decoding', () => {
    expect(parsePagePath(['kom-i-gang', 'Æ'])).toBeNull();
    expect(parsePagePath(['Kom-i-gang'])).toBeNull();
    expect(parsePagePath(['favicon.png'])).toBeNull();
    expect(parsePagePath(['%E0'])).toBeNull();
    expect(parsePagePath(['kom%2Di%2Dgang'])).toEqual(['kom-i-gang']);
  });
});

const page = (id: number, slug: string, parent: PageInChain['parent'] = null, status = 'published'): PageInChain => ({
  id,
  slug,
  _status: status,
  parent,
});

describe('pageAddress', () => {
  const root = page(1, 'kom-i-gang');
  const child = page(2, 'koble-til', root);
  const grandchild = page(3, 'fra-app', child);

  it('joins the ancestors’ slugs and the page’s own, one to three levels', () => {
    expect(pageAddress(root)).toBe('/kom-i-gang');
    expect(pageAddress(child)).toBe('/kom-i-gang/koble-til');
    expect(pageAddress(grandchild)).toBe('/kom-i-gang/koble-til/fra-app');
  });

  it('gives readers the flat address under an unpublished ancestor, editors the nested one', () => {
    const draftRoot = page(10, 'utkast-seksjon', null, 'draft');
    const underDraft = page(11, 'barn', draftRoot);
    expect(pageAddress(underDraft, { publishedOnly: true })).toBe('/barn');
    expect(pageAddress(underDraft)).toBe('/utkast-seksjon/barn');
    expect(hasUnpublishedAncestor(underDraft)).toBe(true);

    const underDraftMiddle = page(12, 'dypt', page(13, 'midt', root, 'draft'));
    expect(pageAddress(underDraftMiddle, { publishedOnly: true })).toBe('/dypt');
    expect(pageAddress(grandchild, { publishedOnly: true })).toBe('/kom-i-gang/koble-til/fra-app');
  });

  it('returns null for more than three levels, a cycle or a missing slug', () => {
    const fourth = page(4, 'fjerde', grandchild);
    expect(pageAddress(fourth)).toBeNull();
    // An unpopulated id beyond the populated depth means the chain is too deep.
    expect(pageAddress(page(5, 'x', page(6, 'y', page(7, 'z', 99))))).toBeNull();

    const a = page(20, 'a');
    const b = page(21, 'b', a);
    a.parent = b;
    expect(pageAddress(b)).toBeNull();
    expect(pageAncestors(b)).toBeNull();

    expect(pageAddress({ id: 30, slug: null })).toBeNull();
    expect(pageAddress(page(31, 'ok', { id: 32, slug: null, _status: 'published' }))).toBeNull();
  });
});

describe('buildPageSection', () => {
  const ref = (id: number, title: string, slug: string, parent: number | null, order?: number): PageRef => ({
    id,
    title,
    slug,
    parent,
    order,
  });
  const pages: PageRef[] = [
    ref(1, 'Kom i gang', 'kom-i-gang', null),
    ref(2, 'Tredje', 'tredje', 1, 30),
    ref(3, 'Første', 'forste', 1, 10),
    ref(4, 'Andre', 'andre', 1, 20),
    ref(5, 'Øving', 'oving', 3),
    ref(6, 'Alfa', 'alfa', 3),
    ref(7, 'Om KI Hub', 'om-ki-hub', null),
    ref(8, 'Annen seksjon', 'annen-seksjon', null),
    ref(9, 'Annet barn', 'annet-barn', 8),
  ];
  type Shape = string | [string, Shape[]];
  const shape = (item: SectionItem): Shape =>
    item.children.length ? [item.title, item.children.map(shape)] : item.title;

  it('lists the root, then children by order, grandchildren nested; equal order → Norwegian alphabetical', () => {
    const section = buildPageSection(pages, 1, 4);
    expect(section?.title).toBe('Kom i gang');
    // «Øving» sorts after «Alfa» in Norwegian collation (Ø is near the end of the alphabet).
    expect(shape(section!.root)).toEqual([
      'Kom i gang',
      [['Første', ['Alfa', 'Øving']], 'Andre', 'Tredje'],
    ]);
  });

  it('builds nested hrefs and marks only the current page', () => {
    const section = buildPageSection(pages, 1, 6)!;
    expect(section.root.href).toBe('/kom-i-gang');
    const first = section.root.children[0]!;
    expect(first.href).toBe('/kom-i-gang/forste');
    expect(first.children[0]?.href).toBe('/kom-i-gang/forste/alfa');
    const current: string[] = [];
    const walk = (item: SectionItem): void => {
      if (item.isCurrent) current.push(item.title);
      item.children.forEach(walk);
    };
    walk(section.root);
    expect(current).toEqual(['Alfa']);
  });

  it('returns null when the root is not published (not in the list) or has no children', () => {
    expect(buildPageSection(pages.filter((p) => p.id !== 1), 1, 3)).toBeNull();
    expect(buildPageSection(pages, 7, 7)).toBeNull();
  });

  it('accepts a populated parent object as well as an id', () => {
    const section = buildPageSection(
      [ref(1, 'Rot', 'rot', null), { ...ref(2, 'Barn', 'barn', null), parent: { id: 1 } }],
      1,
      2,
    );
    expect(section?.root.children.map((x) => x.title)).toEqual(['Barn']);
  });
});
