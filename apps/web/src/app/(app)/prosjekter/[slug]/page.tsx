import { RichText } from '@payloadcms/richtext-lexical/react';
import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { dsConverters } from '@/lib/ds-richtext-converters';
import { getPublishedProjectBySlug } from '@/lib/projects';

/**
 * 016 — a single project's page: title, full rich-text description, and a link back to the
 * list. A draft or unknown slug resolves to `null` → 404 (no draft leaks, FR-009).
 *
 * 026: the /news article patterns — Designsystemet markup, rich text through the Designsystemet
 * converters, and its own `<title>`.
 */

const loadProject = cache((slug: string) => getPublishedProjectBySlug(decodeURIComponent(slug)));

const bodyConverters = dsConverters();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const project = await loadProject((await params).slug);
  return project ? { title: project.title } : {};
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = await loadProject((await params).slug);
  if (!project) notFound();

  return (
    <div className="app-container">
      <article className="app-section app-article">
        <Breadcrumbs
          trail={[
            { label: 'Hjem', href: '/' },
            { label: 'Prosjekter', href: '/prosjekter' },
          ]}
          current={{ label: project.title, href: `/prosjekter/${project.slug ?? ''}` }}
        />

        <h1 className="ds-heading" data-size="xl">
          {project.title}
        </h1>

        <div className="app-richtext">
          <RichText data={project.body} converters={bodyConverters} />
        </div>
      </article>
    </div>
  );
}
