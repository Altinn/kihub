import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { LearningBody } from '@/components/LearningBody';
import { getPageBySlug } from '@/lib/pages';
import { getPreviewState } from '@/lib/preview';

/**
 * 027 US3 — a standalone CMS page at `/<slug>` (contracts/pages.md §C).
 *
 * Next matches the static sections (`/news`, `/laering`, …) before this dynamic segment, so a
 * built-in route always wins (FR-021); `lib/page-slug.ts` refuses those addresses at save time.
 * Behind `(app)/layout.tsx`, so employees only (FR-025). A draft, deleted or unknown address → the
 * portal's standard 404 (FR-022); an editor in preview gets the latest version instead.
 *
 * Fully dynamic on purpose: no static params or caching, so a preview render can never be served to
 * an employee (tests/unit/route-caching.test.ts).
 */
type Params = { params: Promise<{ slug: string }> };

/**
 * Memoised per request (keyed on the raw segment): `generateMetadata` and the page both need the
 * page, and without `cache()` each would query the database.
 */
const loadPage = cache(async (slug: string) => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    return null; // malformed escape (`/%E0`) → 404, not a 500
  }
  const { active: preview } = await getPreviewState();
  return getPageBySlug(decoded, { preview });
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = await loadPage((await params).slug);
  return page ? { title: `${page.title} · KI Hub` } : {};
}

export default async function CmsPage({ params }: Params) {
  const page = await loadPage((await params).slug);
  if (!page) notFound();

  return (
    <main className="kihub-container">
      <article className="kihub-section cms-page">
        <h1 className="kihub-h2 cms-page__title">{page.title}</h1>
        {page.summary ? <p className="kihub-lead cms-page__summary">{page.summary}</p> : null}
        <LearningBody body={page.body} />
      </article>
    </main>
  );
}
