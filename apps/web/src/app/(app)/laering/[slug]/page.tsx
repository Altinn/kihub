import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { LearningBody } from '@/components/LearningBody';
import { LearningShell } from '@/components/LearningShell';
import { getPublishedLearningPageBySlug, readLearningLibrary } from '@/lib/learning';
import { buildLearningTree, formatLearningUpdated } from '@/lib/learning-view';
import type { LearningCategory, LearningSubcategory, User } from '@/payload-types';

/**
 * 014 US1 — a single learning page (contracts/learning-page-ui.md §D).
 *
 * The category/subcategory context line is derived from the RECORD, not from the address: addresses
 * are flat (`/laering/<slug>`), so reorganising the library never breaks a shared link (FR-010).
 *
 * A draft or unknown handle resolves to `null` → 404, so drafts never leak (FR-012/FR-032).
 *
 * The byline (#140) mirrors the News detail page: name if set, else email, else omitted — so a
 * colleague reading a page can tell who to contact about it.
 *
 * 026: Designsystemet markup; the context line is sentence case (no uppercase eyebrow) and the
 * page has its own `<title>`.
 */
function relationTitle(
  value: number | LearningCategory | LearningSubcategory | null | undefined,
): string {
  return value && typeof value === 'object' ? value.title : '';
}

const loadPage = cache((slug: string) => getPublishedLearningPageBySlug(slug));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const page = await loadPage(decodeURIComponent((await params).slug));
  return page ? { title: page.title } : {};
}

export default async function LearningPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  const [page, library] = await Promise.all([
    loadPage(decoded),
    readLearningLibrary(),
  ]);
  if (!page) notFound();

  const tree = buildLearningTree(library, decoded);
  const updated = formatLearningUpdated(page.updatedAt);
  const categoryTitle = relationTitle(page.category);
  const subcategoryTitle = relationTitle(page.subcategory);
  const author = typeof page.author === 'object' ? (page.author as User | null) : null;
  const byline = author?.name || author?.email || null;

  return (
    <LearningShell tree={tree}>
      <article className="app-article">
        <Breadcrumbs
          trail={[
            { label: 'Hjem', href: '/' },
            { label: 'KI Læring', href: '/laering' },
          ]}
          current={{ label: page.title, href: `/laering/${decoded}` }}
        />

        {categoryTitle ? (
          <p className="ds-paragraph app-kicker" data-size="sm">
            {categoryTitle}
            {subcategoryTitle ? ` · ${subcategoryTitle}` : ''}
          </p>
        ) : null}

        <h1 className="ds-heading" data-size="xl">
          {page.title}
        </h1>

        {byline || updated ? (
          <p className="ds-paragraph app-meta" data-size="sm">
            {byline ? `Av ${byline}` : null}
            {byline && updated ? ' · ' : null}
            {updated ? `Sist oppdatert ${updated}` : null}
          </p>
        ) : null}

        {page.summary ? (
          <p className="ds-paragraph app-learning-page__summary" data-size="lg">
            {page.summary}
          </p>
        ) : null}

        <LearningBody body={page.body} />
      </article>
    </LearningShell>
  );
}
