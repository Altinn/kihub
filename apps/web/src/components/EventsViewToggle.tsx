import Link from 'next/link';

/**
 * 012 FR-001 — the Kalender | Liste view switch. Plain links (no client JS): each view owns its
 * params, so switching deliberately resets month/filters (contracts/events-page-ui.md).
 *
 * 026: two Designsystemet button links; the current view is the filled primary button AND carries
 * `aria-current="page"`, so the state is conveyed by more than colour and announced.
 */
export function EventsViewToggle({ view }: { view: 'liste' | 'kalender' }) {
  return (
    <nav className="app-cluster" aria-label="Visning">
      <Link
        href="/events?view=kalender"
        className="ds-button"
        data-size="sm"
        data-variant={view === 'kalender' ? 'primary' : 'secondary'}
        aria-current={view === 'kalender' ? 'page' : undefined}
      >
        Kalender
      </Link>
      <Link
        href="/events"
        className="ds-button"
        data-size="sm"
        data-variant={view === 'liste' ? 'primary' : 'secondary'}
        aria-current={view === 'liste' ? 'page' : undefined}
      >
        Liste
      </Link>
    </nav>
  );
}
