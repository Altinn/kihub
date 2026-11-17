import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { DocShell } from '@/components/DocShell';
import { LearningBody } from '@/components/LearningBody';
import { PageToc } from '@/components/PageToc';
import { SectionNav } from '@/components/SectionNav';
import { extractHeadings } from '@/lib/headings';
import { pageAddress, parsePagePath } from '@/lib/page-tree';
import { getPageBySlug, getPageSection } from '@/lib/pages';
import { getPreviewState } from '@/lib/preview';

/**
 * 026/027 US3, 028 US2/US3 — a CMS page at its address (`/<slug>`, `/<parent>/<slug>`, up to three
 * segments; specs/028-docs-navigation/contracts/page-hierarchy.md §E).
 *
 * Next matches the static sections (`/news`, `/laering`, …) before this catch-all, so a built-in route
 * always wins; a deeper unknown address under one (`/news/a/b`) falls through to here and is refused
 * by `parsePagePath` on its reserved first segment. Behind `(app)/layout.tsx`, so employees only.
 *
 * The LAST segment identifies the page (slugs are unique across pages). Any other path ending in it —
 * the old flat address, the address before a move, a misspelt prefix — is redirected to the canonical
 * address with a TEMPORARY redirect: a cached 308 could loop after a page is moved and moved back
 * (research R7). The browser keeps the `#anchor` across the redirect.
 *
 * Readers never see an address with the segment of a page they cannot see: under an unpublished
 * ancestor the canonical address is the flat `/<slug>` (FR-011). A draft, deleted or unknown page →
 * the portal's standard 404; an editor in preview gets the latest versions instead.
 *
 * Fully dynamic on purpose: no static params or caching, so a preview render can never be served to
 * an employee (tests/unit/route-caching.test.ts).
 */
type Params = {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Memoised per request: `generateMetadata` and the page both need the page. */
const loadPage = cache(async (slug: string) => {
  const { active: preview } = await getPreviewState();
  return { page: await getPageBySlug(slug, { preview }), preview };
});

async function resolve(path: string[]) {
  const segments = parsePagePath(path);
  if (!segments) return null;
  const { page, preview } = await loadPage(segments[segments.length - 1] ?? '');
  if (!page) return null;
  const canonical = pageAddress(page, { publishedOnly: !preview });
  if (!canonical) return null; // a chain deeper than three levels or a cycle in bad data
  return { page, preview, canonical, requested: `/${segments.join('/')}` };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const resolved = await resolve((await params).path);
  // The layout's title template adds « · KI Hub».
  return resolved ? { title: resolved.page.title } : {};
}

function queryString(searchParams: Record<string, string | string[] | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, v);
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

export default async function CmsPage({ params, searchParams }: Params) {
  const resolved = await resolve((await params).path);
  if (!resolved) notFound();
  const { page, preview, canonical, requested } = resolved;
  if (canonical !== requested) redirect(`${canonical}${queryString(await searchParams)}`); // 307

  const headings = extractHeadings(page.body);
  const section = await getPageSection(page, { preview });

  const article = (className: string) => (
    <article className={className}>
      <h1 className="ds-heading" data-size="xl">
        {page.title}
      </h1>
      {page.summary ? (
        <p className="ds-paragraph app-learning-page__summary" data-size="lg">
          {page.summary}
        </p>
      ) : null}
      <PageToc headings={headings} />
      <LearningBody body={page.body} headings={headings} />
    </article>
  );

  // A page outside a section renders as before 028 (FR-025); a page in one gets KI Læring's shell.
  if (!section) return <div className="app-container">{article('app-section app-article')}</div>;
  return (
    <DocShell nav={<SectionNav section={section} />} navLabel={section.title}>
      {article('app-article')}
    </DocShell>
  );
}
