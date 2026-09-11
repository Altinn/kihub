import { RichText } from '@payloadcms/richtext-lexical/react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedProjectBySlug } from '@/lib/projects';

/**
 * 016 — a single project's page: title, full rich-text description, and a link back to the
 * list. A draft or unknown slug resolves to `null` → 404 (no draft leaks, FR-009).
 */
export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(decodeURIComponent(slug));
  if (!project) notFound();

  return (
    <main className="kihub-container">
      <article className="kihub-section prosjekter-detail">
        <p className="prosjekter-detail__back">
          <Link href="/prosjekter" className="kihub-link">
            ← Til prosjekter
          </Link>
        </p>

        <h1 className="kihub-h2 prosjekter-detail__title">{project.title}</h1>

        <div className="prosjekter-detail__body kihub-prose">
          <RichText data={project.body} />
        </div>
      </article>
    </main>
  );
}
