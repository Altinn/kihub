import Link from 'next/link';
import type { Project } from '@/payload-types';

/**
 * One project card on `/prosjekter` (016), as a Designsystemet «lenkekort» (Altinn/kihub#159):
 * the link sits in the heading, and `data-clickdelegatefor` (designsystemet-web) forwards clicks
 * anywhere on the card to it. There is one link only, so the accessible name stays the title and
 * not the whole summary. Without JS the title link still works on its own.
 *
 * 026 R5: plain `ds-card` markup in a Server Component (no `@digdir/designsystemet-react`); the
 * focus ring is drawn on the card (app.css link-card rule).
 */
export function ProjectCard({ project }: { project: Project }) {
  const linkId = `project-card-${project.id}`;
  return (
    <article className="ds-card app-content-card" data-color="neutral" data-clickdelegatefor={linkId}>
      <h2 className="ds-heading" data-size="xs">
        <Link id={linkId} href={`/prosjekter/${project.slug ?? ''}`}>
          {project.title}
        </Link>
      </h2>
      {project.summary ? (
        <p className="ds-paragraph" data-size="sm">
          {project.summary}
        </p>
      ) : null}
    </article>
  );
}
