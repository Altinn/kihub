import Link from 'next/link';

/**
 * 012 FR-001 — the Kalender | Liste segmented toggle. Plain links (no client JS): each view
 * owns its params, so switching deliberately resets month/filters (contracts/events-page-ui.md).
 */
export function EventsViewToggle({ view }: { view: 'liste' | 'kalender' }) {
  return (
    <nav className="ev-toggle" aria-label="Visning">
      <Link
        href="/events?view=kalender"
        aria-current={view === 'kalender' ? 'page' : undefined}
        className="kihub-focusable"
      >
        Kalender
      </Link>
      <Link
        href="/events"
        aria-current={view === 'liste' ? 'page' : undefined}
        className="kihub-focusable"
      >
        Liste
      </Link>
    </nav>
  );
}
