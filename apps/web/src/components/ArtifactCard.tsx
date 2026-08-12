import { Card, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
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

/** Listing card for one artifact (Designsystemet). Links to the detail page. */
export function ArtifactCard({
  artifact,
  governance,
}: {
  artifact: ArtifactCardData;
  governance?: Governance | null;
}) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
        <Heading level={2} data-size="xs">
          <Link href={`/artifacts/${encodeURIComponent(artifact.artifactId)}`}>{artifact.name}</Link>
        </Heading>
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <Tag data-color="neutral" data-size="sm">
            {artifactTypeLabel(artifact.type)}
          </Tag>
          {governance ? <LifecycleBadge governance={governance} /> : null}
        </div>
      </div>
      <Paragraph data-size="sm" style={{ marginTop: '0.5rem' }}>
        {artifact.description}
      </Paragraph>
      {artifact.tags?.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.75rem' }}>
          {artifact.tags.map((t) => (
            <Tag key={t} data-color="info" data-size="sm">
              {t}
            </Tag>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
