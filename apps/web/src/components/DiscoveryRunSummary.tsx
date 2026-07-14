import { Tag } from '@digdir/designsystemet-react';
import type { DiscoveryRun } from '@/payload-types';

/** One run's outcome + change summary (FR-010) — created/updated/deactivated/skipped counts. */
export function DiscoveryRunSummary({ run }: { run: DiscoveryRun }) {
  const s = run.summary;
  const counts = s
    ? `+${s.created ?? 0} created · ${s.updated ?? 0} updated · ${s.deactivated ?? 0} deactivated · ${s.skippedInvalid ?? 0} skipped`
    : '—';

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
