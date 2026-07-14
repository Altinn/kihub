import { Tag } from '@digdir/designsystemet-react';
import type { Governance } from '@/lib/governance';

const LABELS: Record<Governance['lifecycleState'], string> = {
  draft: 'Draft',
  experimental: 'Experimental',
  'in-review': 'In Review',
  approved: 'Approved',
  recommended: 'Recommended',
  deprecated: 'Deprecated',
  archived: 'Archived',
};

const COLORS: Record<Governance['lifecycleState'], 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  draft: 'neutral',
  experimental: 'info',
  'in-review': 'info',
  approved: 'success',
  recommended: 'success',
  deprecated: 'warning',
  archived: 'danger',
};

/** Lifecycle state + approved/recommended indicator (FR-011). */
export function LifecycleBadge({ governance }: { governance: Governance }) {
  return (
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
      <Tag data-color={COLORS[governance.lifecycleState]} data-size="sm">
        {LABELS[governance.lifecycleState]}
      </Tag>
      {governance.approvalState === 'approved' ? (
        <Tag data-color="success" data-size="sm">
          Approved
        </Tag>
      ) : null}
      {governance.recommended ? (
        <Tag data-color="success" data-size="sm">
          Recommended
        </Tag>
      ) : null}
    </div>
  );
}
