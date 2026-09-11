import { ProjectCard } from '@/components/ProjectCard';
import { listPublishedProjects } from '@/lib/projects';

/**
 * 016 — "KI Prosjekter i BOD" (Altinn/kihub#135). One server component: the card grid of
 * published projects, ordered by the editor-controlled `order` field. No pagination — the
 * expected scale (a handful to a few dozen projects) doesn't need it (unlike /news's archive).
 * Access is gated by `(app)/layout.tsx` `requireSession()` — employees only; drafts can never
 * appear (FR-007).
 */
export default async function ProjectsListPage() {
  const projects = await listPublishedProjects();

  return (
    <main className="kihub-container">
      <div className="kihub-section">
        <h1 className="kihub-h1">KI Prosjekter i BOD</h1>

        {projects.length === 0 ? (
          <div className="prosjekter-empty">
            <p className="kihub-h3">Ingen prosjekter ennå</p>
            <p style={{ margin: 0, color: 'var(--kihub-text-subtle)' }}>
              Det er ingen publiserte prosjekter akkurat nå. Kom tilbake senere.
            </p>
          </div>
        ) : (
          <div className="prosjekter-grid">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
