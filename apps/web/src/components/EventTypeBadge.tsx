import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS, type EventTypeValue } from '@/lib/events-view';

/**
 * 012 — the event-type badge (contracts/events-page-ui.md). 026: a Designsystemet `ds-tag` in the
 * type's colour (R10), sentence case. The type NAME is the information; colour only reinforces it
 * (SC-007), and Designsystemet's tag tokens guarantee the text contrast.
 */
export function EventTypeBadge({ type }: { type: EventTypeValue }) {
  return (
    <span className="ds-tag" data-color={EVENT_TYPE_COLORS[type]}>
      {EVENT_TYPE_LABELS[type]}
    </span>
  );
}
