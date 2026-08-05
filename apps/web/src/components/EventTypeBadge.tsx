import { EVENT_TYPE_LABELS, type EventTypeValue } from '@/lib/events-view';

/**
 * 012 — the event-type badge (contracts/events-page-ui.md): uppercase UI-font label on the
 * type's tinted categorical surface. Text stays near-black ink (AA on all five pale tints);
 * the type NAME is the information — color only reinforces it (SC-007).
 */
export function EventTypeBadge({ type }: { type: EventTypeValue }) {
  return (
    <span className="ev-badge" style={{ background: `var(--ev-cat-${type}-surface)` }}>
      {EVENT_TYPE_LABELS[type]}
    </span>
  );
}
