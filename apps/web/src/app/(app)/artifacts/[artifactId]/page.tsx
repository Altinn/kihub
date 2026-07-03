import { Card, Divider, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CopyButton } from '@/components/CopyButton';
import { Markdown } from '@/components/Markdown';
import { getArtifact } from '@/lib/catalog';

/** Artifact detail page (US3): metadata + README + version + copyable install command. */
export default async function ArtifactDetailPage({
  params,
}: {
  params: Promise<{ artifactId: string }>;
}) {
  const { artifactId } = await params;
  const artifact = await getArtifact(decodeURIComponent(artifactId));
  if (!artifact) notFound();

  const a = artifact as Record<string, unknown>;
  const owner = (a.owner as { team?: string; contact?: string } | undefined) ?? {};
  const tags = (a.tags as string[] | undefined) ?? [];
  const installCommand = (a.installCommand as string | undefined) ?? '';
  const readme = (a.readme as string | undefined) ?? '';

  return (
    <main style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem' }}>
      <Paragraph data-size="sm" style={{ marginBottom: '1rem' }}>
        <Link href="/">← Back to catalog</Link>
      </Paragraph>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <Heading level={1} data-size="lg">
          {a.name as string}
        </Heading>
        <Tag data-color="neutral">{a.type as string}</Tag>
      </div>
      <Paragraph style={{ marginTop: '0.5rem' }}>{a.description as string}</Paragraph>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.75rem' }}>
        {tags.map((t) => (
          <Tag key={t} data-color="info" data-size="sm">
            {t}
          </Tag>
        ))}
      </div>

      <Divider style={{ margin: '1.5rem 0' }} />

      <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '0.4rem 1.25rem', margin: 0 }}>
        <dt><strong>Artifact ID</strong></dt>
        <dd style={{ margin: 0 }}><code>{a.artifactId as string}</code></dd>
        <dt><strong>Version</strong></dt>
        <dd style={{ margin: 0 }}>{a.version as string}</dd>
        <dt><strong>Owner</strong></dt>
        <dd style={{ margin: 0 }}>{owner.team}{owner.contact ? ` · ${owner.contact}` : ''}</dd>
        <dt><strong>Visibility</strong></dt>
        <dd style={{ margin: 0 }}>{(a.visibility as string) ?? '—'}</dd>
        <dt><strong>Lifecycle</strong></dt>
        <dd style={{ margin: 0 }}>{(a.lifecycleStatus as string) ?? '—'}</dd>
      </dl>

      <Card style={{ marginTop: '1.5rem' }}>
        <Heading level={2} data-size="xs">
          Install
        </Heading>
        {installCommand ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <code style={{ flex: 1, padding: '0.5rem 0.75rem', background: 'var(--ds-color-neutral-surface-tinted, #f2f2f2)', borderRadius: '4px' }}>
              {installCommand}
            </code>
            <CopyButton text={installCommand} label="Copy" />
          </div>
        ) : (
          <Paragraph data-size="sm" style={{ marginTop: '0.5rem' }}>
            No install command is defined for this artifact.
          </Paragraph>
        )}
      </Card>

      <Heading level={2} data-size="md" style={{ marginTop: '2rem', marginBottom: '0.75rem' }}>
        README
      </Heading>
      {readme ? (
        <Markdown>{readme}</Markdown>
      ) : (
        <Paragraph data-size="sm">This artifact has no README.</Paragraph>
      )}
    </main>
  );
}
