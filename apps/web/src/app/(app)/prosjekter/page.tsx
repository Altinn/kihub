import { ProjectCard } from '@/components/ProjectCard';
import { listPublishedProjects } from '@/lib/projects';

export const metadata = { title: 'Prosjekter' };

/**
 * 016 — "KI Prosjekter i Digdir" (Altinn/kihub#135). One server component: the card grid of
 * published projects, ordered by the editor-controlled `order` field. No pagination — the
 * expected scale (a handful to a few dozen projects) doesn't need it (unlike /news's archive).
 * Access is gated by `(app)/layout.tsx` `requireSession()` — employees only; drafts can never
 * appear (FR-007).
 *
 * 026: Designsystemet heading and card grid (the /news patterns).
 */
export default async function ProjectsListPage() {
  const projects = await listPublishedProjects();

  return (
    <div className="app-container">
      <div className="app-section">
        <h1 className="ds-heading" data-size="xl">
          KI Prosjekter i Digdir
        </h1>

        {projects.length === 0 ? (
          <div className="ds-card app-empty" data-color="neutral">
            <p className="ds-paragraph">
              Ingen prosjekter ennå. Det er ingen publiserte prosjekter akkurat nå. Kom tilbake
              senere.
            </p>
          </div>
        ) : (
          <div className="app-card-grid">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
