import Link from 'next/link';
import { notFound } from 'next/navigation';
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
 */
function relationTitle(
  value: number | LearningCategory | LearningSubcategory | null | undefined,
): string {
  return value && typeof value === 'object' ? value.title : '';
}

export default async function LearningPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  const [page, library] = await Promise.all([
    getPublishedLearningPageBySlug(decoded),
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
      <article className="lp-page">
        <p className="lp-page__back">
          <Link href="/laering" className="kihub-link">
            ← Til KI Læring
          </Link>
        </p>

        {categoryTitle ? (
          <p className="lp-page__context">
            {categoryTitle}
            {subcategoryTitle ? ` · ${subcategoryTitle}` : ''}
          </p>
        ) : null}

        <h1 className="kihub-h2 lp-page__title">{page.title}</h1>

        {byline || updated ? (
          <p className="lp-page__meta">
            {byline ? `Av ${byline}` : null}
            {byline && updated ? ' · ' : null}
            {updated ? `Sist oppdatert ${updated}` : null}
          </p>
        ) : null}

        {page.summary ? <p className="kihub-lead lp-page__summary">{page.summary}</p> : null}

        <LearningBody body={page.body} />
      </article>
    </LearningShell>
  );
}
