import Link from 'next/link';
import type { Governance } from '@/lib/governance';
import { artifactTypeLabel } from '@/lib/registry-view';
import { LifecycleBadge } from './LifecycleBadge';

export interface ArtifactCardData {
  artifactId: string;
  name: string;
  type: string;
  description: string;
  tags?: string[];
}

/**
 * Listing card for one artifact. Links to the detail page.
 *
 * 026 R5: a Designsystemet card whose name is the one link (`h2 > a`), with
 * `data-clickdelegatefor` forwarding clicks anywhere on the card to it; type, lifecycle and tags
 * are plain `ds-tag`s with Norwegian labels.
 */
export function ArtifactCard({
  artifact,
  governance,
}: {
  artifact: ArtifactCardData;
  governance?: Governance | null;
}) {
  const linkId = `artifact-${artifact.artifactId}`;
  return (
    <article className="ds-card app-content-card" data-color="neutral" data-clickdelegatefor={linkId}>
      {/* The heading is a direct child of the card, so Designsystemet's link-card CSS styles its
          link (no ds-link: the whole card is the hover/focus target). */}
      <h2 className="ds-heading" data-size="xs">
        <Link id={linkId} href={`/artifacts/${encodeURIComponent(artifact.artifactId)}`}>
          {artifact.name}
        </Link>
      </h2>
      <span className="app-cluster app-cluster--tight">
        <span className="ds-tag" data-color="neutral" data-variant="outline">
          {artifactTypeLabel(artifact.type)}
        </span>
        {governance ? <LifecycleBadge governance={governance} /> : null}
      </span>
      <p className="ds-paragraph" data-size="sm">
        {artifact.description}
      </p>
      {artifact.tags?.length ? (
        <ul className="app-tag-list" aria-label="Emneord">
          {artifact.tags.map((t) => (
            <li key={t}>
              <span className="ds-tag" data-color="info">
                {t}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
