import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 027 T020 — research R7 / contracts/preview-route.md §F. A preview render must never be cached and
 * then served to an employee, so the routes that can render drafts (and the layout that renders the
 * preview banner) must stay fully dynamic. Today they are, because the layout reads the session
 * cookie and `draftMode()` opts the request out of static rendering; this test keeps anyone from
 * quietly adding static/ISR caching to them later.
 */
const APP = fileURLToPath(new URL('../../src/app/(app)/', import.meta.url));

const ROUTES = [
  'layout.tsx',
  'news/[slug]/page.tsx',
  'laering/[slug]/page.tsx',
  'prosjekter/[slug]/page.tsx',
  'events/[slug]/page.tsx',
  '[...path]/page.tsx', // 027 US3 / 028 US2 CMS pages
];

const FORBIDDEN = [
  /export\s+const\s+revalidate/,
  /force-static/,
  /generateStaticParams/,
  /unstable_cache/,
  /['"]use cache['"]/,
];

describe('draft-capable routes stay dynamic', () => {
  it.each(ROUTES)('%s has no static caching', (route) => {
    const file = `${APP}${route}`;
    const source = readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN) expect(source).not.toMatch(pattern);
  });

  it('the detail routes ask getPreviewState() for preview', () => {
    for (const route of ROUTES.slice(1)) {
      expect(readFileSync(`${APP}${route}`, 'utf8')).toMatch(/getPreviewState\(\)/);
    }
  });
});
