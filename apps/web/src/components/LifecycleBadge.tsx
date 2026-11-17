import type { Governance } from '@/lib/governance';
import { lifecycleBadgeView } from '@/lib/governance-view';
import { APPROVAL_LABELS, LIFECYCLE_LABELS } from '@/lib/registry-view';

/**
 * Lifecycle state + effective current approval/recommendation indicator.
 *
 * 026 (revision-bound governance): an approval that no longer matches the artifact's current
 * version/digest is shown as outdated and never as current or recommended. Presentation follows the
 * Designsystemet alignment: Norwegian labels and plain `ds-tag`s.
 */
export function LifecycleBadge({ governance }: { governance: Governance }) {
  const view = lifecycleBadgeView(governance);
  const lifecycleLabel = LIFECYCLE_LABELS[governance.lifecycleState];
  const tags: { label: string; color: string }[] = [
    {
      label: view.lifecycleStale ? `${lifecycleLabel} (utdatert)` : lifecycleLabel,
      color: view.lifecycleColor,
    },
  ];
  if (view.showApproved) tags.push({ label: APPROVAL_LABELS.approved, color: 'success' });
  if (view.showStaleWarning) tags.push({ label: 'Må vurderes på nytt', color: 'warning' });
  if (view.showRecommended) tags.push({ label: LIFECYCLE_LABELS.recommended, color: 'success' });
  const unique = tags.filter((tag, index) => tags.findIndex((t) => t.label === tag.label) === index);

  return (
    <span className="app-cluster app-cluster--tight">
      {unique.map((tag) => (
        <span key={tag.label} className="ds-tag" data-color={tag.color}>
          {tag.label}
        </span>
      ))}
    </span>
  );
}
