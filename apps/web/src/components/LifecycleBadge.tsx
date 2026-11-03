import { Tag } from '@digdir/designsystemet-react';
import type { Governance } from '@/lib/governance';
import { lifecycleBadgeView } from '@/lib/governance-view';

/** Lifecycle state + effective current approval/recommendation indicator. */
export function LifecycleBadge({ governance }: { governance: Governance }) {
  const view = lifecycleBadgeView(governance);
  return (
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
      <Tag data-color={view.lifecycleColor} data-size="sm">
        {view.lifecycleLabel}
      </Tag>
      {view.showApproved ? (
        <Tag data-color="success" data-size="sm">
          Approved
        </Tag>
      ) : null}
      {view.showStaleWarning ? (
        <Tag data-color="warning" data-size="sm">
          Re-review required
        </Tag>
      ) : null}
      {view.showRecommended ? (
        <Tag data-color="success" data-size="sm">
          Recommended
        </Tag>
      ) : null}
    </div>
  );
}
