import config from '@payload-config';
import { getPayload } from 'payload';
import { PAGE_SLUG_PATTERN } from './page-slug';
import { PUBLISHED, type ReadOptions } from './payload-queries';
import type { Page } from '@/payload-types';

/**
 * 027 US3 read layer for CMS pages at `/<slug>` (contracts/pages.md §C). Published-only by
 * construction (mirroring `lib/news.ts`/`lib/projects.ts`); the collection's `read` access rule is
 * the second line of defence for the API path. There is deliberately NO listing function: pages are
 * reached through links editors place in Site Chrome, never through a generated index.
 */

/**
 * A single published page by slug, or `null` (draft/unknown → the route returns 404).
 * With `{ preview: true }` it returns the LATEST version (draft or not) for an editor's preview.
 *
 * `[slug]` catches every unmatched one-segment address (`/favicon.png`, `/wp-login.php`, …), so a
 * slug that could never have been saved is rejected here without a database round trip.
 *
 * Preview collision: `slug` is unique only in the main table, NOT in `_pages_v`, so another page's
 * draft (an autosave while the editor types an address that is taken) can claim the same address.
 * The page whose saved row owns the address wins; the other could never be published there.
 */
export async function getPageBySlug(slug: string, opts: ReadOptions = {}): Promise<Page | null> {
  if (!PAGE_SLUG_PATTERN.test(slug)) return null;
  const payload = await getPayload({ config });
  const bySlug = { slug: { equals: slug } };

  if (!opts.preview) {
    const result = await payload.find({
      collection: 'pages',
      where: { and: [bySlug, PUBLISHED] },
      limit: 1,
      overrideAccess: true,
    });
    return (result.docs[0] as Page) ?? null;
  }

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
