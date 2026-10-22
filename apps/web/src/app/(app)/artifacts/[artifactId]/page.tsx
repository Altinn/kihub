import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { AgentCardPanel } from '@/components/AgentCardPanel';
import { CopyButton } from '@/components/CopyButton';
import { GovernancePanel } from '@/components/GovernancePanel';
import { LifecycleBadge } from '@/components/LifecycleBadge';
import { Markdown } from '@/components/Markdown';
import { getArtifact } from '@/lib/catalog';
import { getGovernance } from '@/lib/governance';
import { LIFECYCLE_LABELS, VISIBILITY_LABELS, artifactTypeLabel, labelFor } from '@/lib/registry-view';

/**
 * Artifact detail page (US3 Phase 2 + governance overlay, Phase 3): metadata + README + version
 * + copyable install command + lifecycle/governance state (FR-011).
 *
 * 026: Norwegian UI text with a real h1 (it was an English h2) and its own `<title>`; plain
 * Designsystemet markup with no inline styles or React wrappers; sections are h2s (Installasjon,
 * Agentkort, README, Styring) and the README — authored content, usually English — is marked
 * `lang="en"` with its headings starting at h3 under its own section heading.
 */

const loadArtifact = cache((artifactId: string) => getArtifact(artifactId));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ artifactId: string }>;
}): Promise<Metadata> {
  const artifact = await loadArtifact(decodeURIComponent((await params).artifactId));
  return artifact ? { title: String((artifact as unknown as { name?: string }).name ?? '') } : {};
}

export default async function ArtifactDetailPage({
  params,
}: {
  params: Promise<{ artifactId: string }>;
}) {
  const { artifactId: rawArtifactId } = await params;
  const artifactId = decodeURIComponent(rawArtifactId);
  const artifact = await loadArtifact(artifactId);
  if (!artifact) notFound();

  const governance = await getGovernance(artifactId);

  const a = artifact as unknown as Record<string, unknown>;
  const owner = (a.owner as { team?: string; contact?: string } | undefined) ?? {};
  const tags = (a.tags as string[] | undefined) ?? [];
  const installCommand = (a.installCommand as string | undefined) ?? '';
  const readme = (a.readme as string | undefined) ?? '';

  return (
    <div className="app-container">
      <div className="app-section app-article app-artifact">
        <Breadcrumbs
          trail={[
            { label: 'Hjem', href: '/' },
            { label: 'Verktøy og ressurser', href: '/registry' },
          ]}
          current={{ label: a.name as string, href: `/artifacts/${encodeURIComponent(artifactId)}` }}
        />

        <h1 className="ds-heading" data-size="xl">
          {a.name as string}
        </h1>
        <span className="app-cluster app-cluster--tight">
          <span className="ds-tag" data-color="neutral" data-variant="outline">
            {artifactTypeLabel(a.type as string)}
          </span>
          {governance ? <LifecycleBadge governance={governance} /> : null}
        </span>
        <p className="ds-paragraph" data-size="lg">
          {a.description as string}
        </p>

        {tags.length ? (
          <ul className="app-tag-list" aria-label="Emneord">
            {tags.map((t) => (
              <li key={t}>
                <span className="ds-tag" data-color="info">
                  {t}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <hr className="ds-divider" />

        <dl className="app-meta-list">
          <div>
            <dt>ID</dt>
            <dd>
              <code>{a.artifactId as string}</code>
            </dd>
          </div>
          <div>
            <dt>Versjon</dt>
            <dd>{a.version as string}</dd>
          </div>
          <div>
            <dt>Eier</dt>
            <dd>
              {owner.team}
              {owner.contact ? ` · ${owner.contact}` : ''}
            </dd>
          </div>
          <div>
            <dt>Synlighet</dt>
            <dd>{labelFor(VISIBILITY_LABELS, a.visibility as string | undefined)}</dd>
          </div>
          <div>
            <dt>Livsløp</dt>
            <dd>{labelFor(LIFECYCLE_LABELS, a.lifecycleStatus as string | undefined)}</dd>
          </div>
        </dl>

        <section className="ds-card app-panel" data-color="neutral" aria-labelledby="install-heading">
          <h2 id="install-heading" className="ds-heading" data-size="xs">
            Installasjon
          </h2>
          {installCommand ? (
            <div className="app-install">
              <code className="app-install__command">{installCommand}</code>
              <CopyButton text={installCommand} label="Kopier" copiedLabel="Kopiert" />
            </div>
          ) : (
            <p className="ds-paragraph" data-size="sm">
              Dette verktøyet har ingen installasjonskommando.
            </p>
          )}
        </section>

        {a.agentCard ? <AgentCardPanel card={a.agentCard} /> : null}

        <section className="app-readme" aria-labelledby="readme-heading">
          <h2 id="readme-heading" className="ds-heading" data-size="md">
            README
          </h2>
          {readme ? (
            <Markdown lang="en">{readme}</Markdown>
          ) : (
            <p className="ds-paragraph" data-size="sm">
              Dette verktøyet har ingen README.
            </p>
          )}
        </section>

        {governance ? <GovernancePanel artifactId={artifactId} governance={governance} /> : null}
      </div>
    </div>
  );
}
