import type { Governance } from '@/lib/governance';
import { lifecycleTags } from '@/lib/registry-view';

/**
 * Lifecycle state + approved/recommended indicator (FR-011).
 *
 * 026: Norwegian labels and plain `ds-tag`s; `lifecycleTags` never repeats a label, so an approved
 * artifact no longer shows "Approved" twice.
 */
export function LifecycleBadge({ governance }: { governance: Governance }) {
  return (
    <span className="app-cluster app-cluster--tight">
      {lifecycleTags(governance).map((tag) => (
        <span key={tag.label} className="ds-tag" data-color={tag.color}>
          {tag.label}
        </span>
      ))}
    </span>
  );
}
