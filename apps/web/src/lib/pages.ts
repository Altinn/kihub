import config from '@payload-config';
import { getPayload } from 'payload';
import { PAGE_SLUG_PATTERN } from './page-slug';
import { findBySlug, type ReadOptions } from './payload-queries';
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
 * A preview read resolves a slug collision in `_pages_v` (another page's autosave claiming the
 * same address) in favour of the page that owns the address — see `findBySlug`.
 */
export async function getPageBySlug(slug: string, opts: ReadOptions = {}): Promise<Page | null> {
  if (!PAGE_SLUG_PATTERN.test(slug)) return null;
  return findBySlug(await getPayload({ config }), 'pages', slug, opts);
}
