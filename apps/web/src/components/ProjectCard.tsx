import { Card, Heading, Paragraph } from '@digdir/designsystemet-react';
import Link from 'next/link';
import type { Project } from '@/payload-types';

/**
 * One project card on `/prosjekter` (016), as a Designsystemet «lenkekort» (Altinn/kihub#159):
 * the link sits in the heading, and `Card` delegates clicks anywhere on the card to it. The
 * underlined title, border and hover tint make the card read as a link, which the earlier
 * borderless title + summary did not. There is one link only, so the accessible name stays the
 * title and not the whole summary. Without JS the title link still works on its own.
 */
export function ProjectCard({ project }: { project: Project }) {
  return (
    <Card>
      <Heading level={2} data-size="xs">
        <Link href={`/prosjekter/${project.slug ?? ''}`}>{project.title}</Link>
      </Heading>
      {project.summary ? <Paragraph data-size="sm">{project.summary}</Paragraph> : null}
    </Card>
  );
}
