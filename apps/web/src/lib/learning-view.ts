/**
 * 014 — pure view logic for KI Læring (contracts/learning-read.md §B). No Payload import, so
 * everything here is unit-testable in isolation (the `lib/news-view.ts` / `lib/events-view.ts`
 * pattern).
 *
 * The tree assembly is the only place that knows how a flat set of categories, subcategories and
 * pages becomes the sidebar: grouping, ordering, pruning empty groups, and which entry is current.
 * It deliberately does NOT filter on `status` — `lib/learning.ts` owns that rule, so "employees see
 * published only" exists in exactly one place and cannot drift (guarantee B9).
 */

const OSLO_TZ = 'Europe/Oslo';

/* ---------- Inputs (shapes the read layer produces) ---------- */

export interface LearningCategoryRef {
  id: number | string;
  title: string;
  description?: string | null;
  order?: number | null;
}

export interface LearningSubcategoryRef {
  id: number | string;
  title: string;
  /** Category id — the read layer queries at `depth: 0`, so relationships arrive as ids. */
  category: number | string;
  order?: number | null;
}

export interface LearningPageRef {
  id: number | string;
  title: string;
  slug?: string | null;
  category: number | string;
  subcategory?: number | string | null;
  order?: number | null;
}

export interface LearningLibrary {
  categories: LearningCategoryRef[];
  subcategories: LearningSubcategoryRef[];
  pages: LearningPageRef[];
}

/* ---------- Outputs (what the sidebar and overview render) ---------- */

export interface LearningTreePage {
  title: string;
  slug: string;
  href: string;
  isCurrent: boolean;
}

export interface LearningTreeGroup {
  title: string;
  pages: LearningTreePage[];
}

export interface LearningTreeCategory {
  title: string;
  description: string;
  /** Pages directly under the category — rendered BEFORE the groups (guarantee B3). */
  pages: LearningTreePage[];
  groups: LearningTreeGroup[];
  /** Drives `<details open>` so the current page's group is expanded server-side (FR-004). */
  containsCurrent: boolean;
  /** Entry link for the overview — the category's first page (guarantee B8). */
  href?: string;
}

export type LearningTree = LearningTreeCategory[];

/* ---------- Addressing (FR-010) ---------- */

/** The ONE place the learning address shape is expressed. */
export function learningPageHref(slug: string): string {
  return `/laering/${slug}`;
}

/* ---------- Ordering (FR-015) ---------- */

/** Missing order sorts as 100 — the field's default — so untouched items stay with their peers. */
const DEFAULT_ORDER = 100;

/**
 * `order` ascending, then `title` ascending. The title tiebreak is what makes the result stable:
 * items an editor never ordered all share the default and fall back to alphabetical rather than to
 * whatever the database happened to return (FR-015, "never reshuffling between page loads").
 */
function byOrderThenTitle<T extends { order?: number | null; title: string }>(a: T, b: T): number {
  const ao = a.order ?? DEFAULT_ORDER;
  const bo = b.order ?? DEFAULT_ORDER;
  if (ao !== bo) return ao - bo;
  return a.title.localeCompare(b.title, 'nb');
}

/* ---------- Tree assembly ---------- */

/** Relationship ids arrive as numbers from Postgres but as strings in some payloads; normalise. */
function key(id: number | string | null | undefined): string {
  return id === null || id === undefined ? '' : String(id);
}

function toTreePage(page: LearningPageRef, currentSlug?: string): LearningTreePage | null {
  // A page without a usable handle can never be linked; drop it rather than render a broken entry.
  if (!page.slug) return null;
  return {
    title: page.title,
    slug: page.slug,
    href: learningPageHref(page.slug),
    isCurrent: Boolean(currentSlug) && page.slug === currentSlug,
  };
}

/**
 * Build the resource-navigation tree (contracts/learning-read.md §B, guarantees B1–B9).
 *
 * Pure and O(n): the pages are bucketed once by category and subcategory, so this does not re-scan
 * the page list per category (SC-010 is a property of the read layer's three queries AND of this
 * function not being quadratic).
 */
export function buildLearningTree(library: LearningLibrary, currentSlug?: string): LearningTree {
  const { categories, subcategories, pages } = library;

  // Bucket pages once: category id -> ungrouped pages, and subcategory id -> pages.
  const ungroupedByCategory = new Map<string, LearningPageRef[]>();
  const pagesBySubcategory = new Map<string, LearningPageRef[]>();
  const knownCategories = new Set(categories.map((c) => key(c.id)));
  const subcategoryById = new Map(subcategories.map((s) => [key(s.id), s]));

  for (const page of pages) {
    const categoryKey = key(page.category);
    // A page whose category no longer resolves is dropped, never rendered as a broken entry (B7).
    if (!knownCategories.has(categoryKey)) continue;

    const subcategoryKey = key(page.subcategory);
    const subcategory = subcategoryKey ? subcategoryById.get(subcategoryKey) : undefined;

    // A subcategory belonging to a different category is a data anomaly the collection hook
    // prevents (FR-014); if one somehow exists, treat the page as ungrouped rather than moving it
    // under a foreign category.
    if (subcategory && key(subcategory.category) === categoryKey) {
      const bucket = pagesBySubcategory.get(subcategoryKey);
      if (bucket) bucket.push(page);
      else pagesBySubcategory.set(subcategoryKey, [page]);
    } else {
      const bucket = ungroupedByCategory.get(categoryKey);
      if (bucket) bucket.push(page);
      else ungroupedByCategory.set(categoryKey, [page]);
    }
  }

  const subcategoriesByCategory = new Map<string, LearningSubcategoryRef[]>();
  for (const subcategory of subcategories) {
    const categoryKey = key(subcategory.category);
    const bucket = subcategoriesByCategory.get(categoryKey);
    if (bucket) bucket.push(subcategory);
    else subcategoriesByCategory.set(categoryKey, [subcategory]);
  }

  const tree: LearningTree = [];

  for (const category of [...categories].sort(byOrderThenTitle)) {
    const categoryKey = key(category.id);

    const ungrouped = (ungroupedByCategory.get(categoryKey) ?? [])
      .sort(byOrderThenTitle)
      .map((p) => toTreePage(p, currentSlug))
      .filter((p): p is LearningTreePage => p !== null);

    const groups: LearningTreeGroup[] = [];
    for (const subcategory of (subcategoriesByCategory.get(categoryKey) ?? []).sort(
      byOrderThenTitle,
    )) {
      const groupPages = (pagesBySubcategory.get(key(subcategory.id)) ?? [])
        .sort(byOrderThenTitle)
        .map((p) => toTreePage(p, currentSlug))
        .filter((p): p is LearningTreePage => p !== null);
      // An empty subcategory group is omitted — never a heading that opens onto nothing (B4).
      if (groupPages.length) groups.push({ title: subcategory.title, pages: groupPages });
    }

    // A category with no published page anywhere beneath it is omitted entirely (FR-008, B4).
    if (!ungrouped.length && !groups.length) continue;

    const allPages = [...ungrouped, ...groups.flatMap((g) => g.pages)];

    tree.push({
      title: category.title,
      description: category.description ?? '',
      pages: ungrouped,
      groups,
      containsCurrent: allPages.some((p) => p.isCurrent),
      ...(allPages[0] ? { href: allPages[0].href } : {}),
    });
  }

  return tree;
}

/* ---------- Date display (FR-018) ---------- */

/**
 * nb-NO long form in Oslo time — "10. august 2026". The explicit `timeZone` is load-bearing: a page
 * saved at 00:30 Oslo time belongs to that Oslo calendar day, not the previous UTC one. Returns `''`
 * for a missing value so callers can omit the line entirely (the `formatNewsDate` contract).
 */
export function formatLearningUpdated(updatedAt?: string | null): string {
  if (!updatedAt) return '';
  return new Intl.DateTimeFormat('nb-NO', {
    timeZone: OSLO_TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(updatedAt));
}

/* ---------- Code languages (FR-026/028) ---------- */

/**
 * The curated code-block languages. ONE constant with two consumers: Payload's premade `CodeBlock`
 * (the admin editor's language dropdown, Monaco ids) and the shiki highlighter (employee rendering,
 * shiki ids). Every id below is valid in BOTH, which is why no translation table exists to drift
 * (research §2).
 *
 * `plaintext` is shiki's special "no grammar" language and needs no grammar import.
 */
export const LEARNING_CODE_LANGUAGES: Record<string, string> = {
  shell: 'Shell',
  json: 'JSON',
  yaml: 'YAML',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  markdown: 'Markdown',
  plaintext: 'Ren tekst',
};
