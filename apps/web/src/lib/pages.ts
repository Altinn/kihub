import config from '@payload-config';
import { getPayload } from 'payload';
import { PAGE_SLUG_PATTERN } from './page-slug';
import {
  buildPageSection,
  MAX_PAGE_DEPTH,
  pageAncestors,
  type PageInChain,
  type PageRef,
  type PageSection,
} from './page-tree';
import { PUBLISHED, type ReadOptions } from './payload-queries';
import type { Page } from '@/payload-types';

/**
 * 027 US3 read layer for CMS pages (contracts/pages.md §C). Published-only by construction
 * (mirroring `lib/news.ts`/`lib/projects.ts`); the collection's `read` access rule is the second line
 * of defence for the API path.
 *
 * 028: a page comes back with its parent chain populated (`parent`, `parent.parent`), from which
 * `lib/page-tree.ts` computes the address. The only listing is `getPageSection`, the section read
 * for the menu beside a page; there is still no public index of pages.
 */

/**
 * A single published page by slug, or `null` (draft/unknown → the route returns 404).
 * With `{ preview: true }` it returns the LATEST version (draft or not) for an editor's preview,
 * with its ancestors' latest versions as the chain.
 *
 * `[...path]` catches every unmatched address (`/favicon.png`, `/wp-login.php`, …), so a slug that
 * could never have been saved is rejected here without a database round trip.
 */
export async function getPageBySlug(slug: string, opts: ReadOptions = {}): Promise<Page | null> {
  if (!PAGE_SLUG_PATTERN.test(slug)) return null;
  const payload = await getPayload({ config });
  const bySlug = { slug: { equals: slug } };

  if (!opts.preview) {
    // depth 2 populates `parent` and `parent.parent` (main-table rows, so an ancestor that was never
    // published comes back with `_status: 'draft'`; `pageAddress({ publishedOnly })` hides it).
    const result = await payload.find({
      collection: 'pages',
      where: { and: [bySlug, PUBLISHED] },
      limit: 1,
      depth: MAX_PAGE_DEPTH - 1,
      overrideAccess: true,
    });
    return (result.docs[0] as Page) ?? null;
  }
  const page = await getLatestPageBySlug(slug);
  return page ? withLatestAncestors(page) : null;
}

/**
 * Preview: the latest version claiming `slug`. `slug` is unique only in the main table, NOT in
 * `_pages_v`, so another page's draft can claim the same address (an autosave while the editor types
 * an address that is taken); the page whose saved row owns the address wins.
 */
async function getLatestPageBySlug(slug: string): Promise<Page | null> {
  const payload = await getPayload({ config });
  const bySlug = { slug: { equals: slug } };

  // Every draft claiming the address, not a fixed window: with three or more claimants the owner
  // could otherwise fall outside it. Normally this is one row.
  const drafts = await payload.find({
    collection: 'pages',
    where: bySlug,
    draft: true,
    pagination: false,
    overrideAccess: true,
  });
  if (drafts.docs.length <= 1) return (drafts.docs[0] as Page) ?? null;

  const owner = await payload.find({
    collection: 'pages',
    where: bySlug, // main table, any status
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const ownerId = owner.docs[0]?.id;
  return ((drafts.docs.find((doc) => doc.id === ownerId) ?? drafts.docs[0]) as Page) ?? null;
}

/**
 * Preview: replace the populated chain with the ancestors' LATEST versions, so «Forhåndsvis» opens a
 * page at the address it will have once everything is published (spec FR-016, research R10).
 * Population would return the main-table rows instead. At most two extra reads, preview only.
 */
async function withLatestAncestors(page: Page): Promise<Page> {
  const payload = await getPayload({ config });
  const idOf = (ref: Page['parent']) => (ref == null ? null : typeof ref === 'object' ? ref.id : ref);

  const chain: Page[] = [];
  const seen = new Set<number>([page.id]);
  let next = idOf(page.parent);
  while (next != null && !seen.has(next) && chain.length < MAX_PAGE_DEPTH) {
    seen.add(next);
    const ancestor = (await payload
      .findByID({ collection: 'pages', id: next, draft: true, depth: 0, overrideAccess: true })
      .catch(() => null)) as Page | null;
    if (!ancestor) break;
    chain.push(ancestor);
    next = idOf(ancestor.parent);
  }
  // Re-link nearest first; a chain that runs past three levels keeps its last id unpopulated, so
  // `pageAncestors` reports it as too deep.
  let parent: Page['parent'] = next;
  for (const ancestor of [...chain].reverse()) parent = { ...ancestor, parent };
  return { ...page, parent: chain.length ? parent : page.parent };
}

/**
 * 028 US3 — the section menu for a page (contracts/page-hierarchy.md §D): its top-level ancestor and
 * every PUBLISHED page below it, also in preview (FR-021). `null` when the page is in no section,
 * when the top-level page is not published (FR-023), or, for readers, when an ancestor is not
 * published — the page then has its flat address and stands alone.
 */
export async function getPageSection(page: Page, opts: ReadOptions = {}): Promise<PageSection | null> {
  const ancestors = pageAncestors(page as PageInChain);
  if (!ancestors) return null;
  if (!opts.preview && ancestors.some((ancestor) => ancestor._status !== 'published')) return null;
  const root = ancestors.at(-1) ?? page;

  const payload = await getPayload({ config });
  const published = await payload.find({
    collection: 'pages',
    where: PUBLISHED,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { title: true, slug: true, parent: true, order: true },
  });
  return buildPageSection(published.docs as PageRef[], root.id, page.id);
}
