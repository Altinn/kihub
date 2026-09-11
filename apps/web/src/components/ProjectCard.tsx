import Link from 'next/link';
import type { Project } from '@/payload-types';

/**
 * One project card on `/prosjekter` (016), modeled on `NewsCard` but without the date line or
 * hero-image well — `Project` has no `publishDate`/`heroImageUrl` fields. The whole card is a
 * single link to the project — no competing nested links.
 */
export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/prosjekter/${project.slug ?? ''}`}
      className="kihub-focusable"
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <article className="kihub-stack" style={{ gap: 'var(--kihub-space-3)' }}>
        <h2 className="kihub-h4">{project.title}</h2>
        {project.summary ? (
          <p
            style={{
              margin: 0,
              font: '400 16px/1.55 var(--kihub-font-display)',
              color: 'var(--kihub-text-subtle)',
            }}
          >
            {project.summary}
          </p>
        ) : null}
      </article>
    </Link>
  );
}
