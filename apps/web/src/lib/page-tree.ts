import { PAGE_SLUG_PATTERN, RESERVED_PAGE_SLUGS } from './page-slug';

/**
 * 028 US2/US3 — pure address and section logic for CMS pages
 * (specs/028-docs-navigation/contracts/page-hierarchy.md §C).
 *
 * A page's address is its ancestors' slugs followed by its own (`/kom-i-gang/<slug>`), computed from
 * the parent chain and never stored (research R7). Slugs stay unique across all pages, so the LAST
 * segment identifies a page; the route redirects any other path that ends in it to the address
 * computed here, which is what keeps old and moved links working.
 */

/** A top-level page, its children and their children. */
export const MAX_PAGE_DEPTH = 3;

/** What the read layer returns: `parent` is populated (an object) up the chain, or an id/null. */
export interface PageInChain {
  id: number;
  slug?: string | null;
  _status?: string | null;
  parent?: PageInChain | number | null;
}

export interface PageRef {
  id: number;
  title: string;
  slug?: string | null;
  parent?: number | { id: number } | null;
  order?: number | null;
}

export interface SectionItem {
  id: number;
  title: string;
  href: string;
  isCurrent: boolean;
  children: SectionItem[];
}

export interface PageSection {
  title: string;
  root: SectionItem;
}

/**
 * Validate the segments of a request path. `null` means "not found" without a database query:
 * no segments or more than three, a segment that is not a valid page address (after decoding), or
 * a first segment a built-in section owns (`/news/x/y` must never resolve to a page `y`).
 */
export function parsePagePath(segments: readonly string[]): string[] | null {
  if (segments.length === 0 || segments.length > MAX_PAGE_DEPTH) return null;
  const decoded: string[] = [];
  for (const segment of segments) {
    let value: string;
    try {
      value = decodeURIComponent(segment);
    } catch {
      return null; // malformed escape (`/%E0`) → 404, not a 500
    }
    if (!PAGE_SLUG_PATTERN.test(value)) return null;
    decoded.push(value);
  }
  if (RESERVED_PAGE_SLUGS.has(decoded[0] ?? '')) return null;
  return decoded;
}

/** The populated ancestors of a page, nearest first; `null` on a cycle, a gap or more than three levels. */
export function pageAncestors(page: PageInChain): PageInChain[] | null {
  const ancestors: PageInChain[] = [];
  const seen = new Set<number>([page.id]);
  let parent = page.parent;
  while (parent != null) {
    // An unpopulated id here means the chain is deeper than the read populated (> 3 levels).
    if (typeof parent !== 'object') return null;
    if (seen.has(parent.id) || ancestors.length >= MAX_PAGE_DEPTH - 1) return null;
    seen.add(parent.id);
    ancestors.push(parent);
    parent = parent.parent;
  }
  return ancestors;
}

/** True when an ancestor in the chain has never been published (readers must not see its slug). */
export function hasUnpublishedAncestor(page: PageInChain): boolean {
  return (pageAncestors(page) ?? []).some((ancestor) => ancestor._status !== 'published');
}

/**
 * The canonical address of a page with a populated parent chain, or `null` when it cannot have one
 * (no slug, a cycle, more than three levels). With `publishedOnly` (readers), a page under an
 * ancestor that is not published gets its flat address `/<slug>`, so no address a reader sees
 * contains the segment of a page they cannot see (spec FR-011).
 */
export function pageAddress(page: PageInChain, opts: { publishedOnly?: boolean } = {}): string | null {
  if (!page.slug) return null;
  const ancestors = pageAncestors(page);
  if (!ancestors) return null;
  if (opts.publishedOnly && ancestors.some((ancestor) => ancestor._status !== 'published')) {
    return `/${page.slug}`;
  }
  const slugs: string[] = [];
  for (const ancestor of [...ancestors].reverse()) {
    if (!ancestor.slug) return null;
    slugs.push(ancestor.slug);
  }
  slugs.push(page.slug);
  return `/${slugs.join('/')}`;
}

/** `order` ascending (missing → 100, the field default), then title in Norwegian collation. */
export function byOrderThenTitle(a: PageRef, b: PageRef): number {
  return (a.order ?? 100) - (b.order ?? 100) || a.title.localeCompare(b.title, 'nb');
}

const parentIdOf = (page: PageRef): number | null =>
  page.parent == null ? null : typeof page.parent === 'object' ? page.parent.id : page.parent;

/**
 * The section menu for the page `currentId` in the section whose top-level page is `rootId`, built
 * from published pages only. `null` when the root is not among them (unpublished: no menu, FR-023)
 * or has no children (a lone page has no section).
 */
export function buildPageSection(
  pages: readonly PageRef[],
  rootId: number,
  currentId: number,
): PageSection | null {
  const root = pages.find((page) => page.id === rootId);
  if (!root?.slug) return null;

  const childrenOf = new Map<number, PageRef[]>();
  for (const page of pages) {
    const parentId = parentIdOf(page);
    if (parentId == null || !page.slug) continue;
    const siblings = childrenOf.get(parentId) ?? [];
    siblings.push(page);
    childrenOf.set(parentId, siblings);
  }
  if (!childrenOf.get(root.id)?.length) return null;

  const build = (page: PageRef, href: string, level: number): SectionItem => ({
    id: page.id,
    title: page.title,
    href,
    isCurrent: page.id === currentId,
    children:
      level >= MAX_PAGE_DEPTH
        ? []
        : [...(childrenOf.get(page.id) ?? [])]
            .sort(byOrderThenTitle)
            .map((child) => build(child, `${href}/${child.slug}`, level + 1)),
  });

  return { title: root.title, root: build(root, `/${root.slug}`, 1) };
}
