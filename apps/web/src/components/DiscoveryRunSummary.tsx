import { Tag } from '@digdir/designsystemet-react';
import type { DiscoveryRun } from '@/payload-types';

/** One run's outcome + change summary (FR-010, 015 FR-005/006) — counts incl. ownership changes. */
export function DiscoveryRunSummary({ run }: { run: DiscoveryRun }) {
  const s = run.summary;
  const base = s
    ? `+${s.created ?? 0} created · ${s.updated ?? 0} updated · ${s.deactivated ?? 0} deactivated · ${s.skippedInvalid ?? 0} skipped`
    : '—';
  // Situational counts, shown only when non-zero: within-scan duplicates, legacy adoptions, and
  // ownership takeovers («overtatt fra annen kilde» — a move OR a cross-source duplicate).
  const extras = s
    ? [
        s.duplicates ? `${s.duplicates} duplikater i kilden` : null,
        s.adopted ? `${s.adopted} adoptert (uten kilde)` : null,
        s.reassigned ? `${s.reassigned} overtatt fra annen kilde` : null,
        s.cardIssues ? `${s.cardIssues} agentkort med feil` : null,
      ].filter(Boolean)
    : [];
  const counts = extras.length ? `${base} · ${extras.join(' · ')}` : base;

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <Tag data-color={run.outcome === 'success' ? 'success' : 'danger'} data-size="sm">
        {run.outcome === 'success' ? 'Success' : 'Failure'}
      </Tag>
      <Tag data-color="neutral" data-size="sm">
        {run.trigger}
      </Tag>
      {run.outcome === 'success' ? (
        <span style={{ fontSize: '0.85rem' }}>{counts}</span>
      ) : (
        <span style={{ fontSize: '0.85rem' }}>{run.failureReason ?? 'Failed'}</span>
      )}
    </div>
  );
}
