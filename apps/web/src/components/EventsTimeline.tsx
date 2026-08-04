import Link from 'next/link';
import type { Event } from '@/payload-types';
import { formatTimeHM, formatTimelineDate } from '@/lib/event-dates';

/**
 * 011 US2 — the "Utover måneden" timeline (contracts/frontpage-read.md): the next 4 upcoming
 * events after the featured one (month-agnostic — clarification), each row a decorative dot,
 * date + time, linked title and a "type · location" line. Dots cycle within the accent family
 * only (one-accent rule: status colors never decorate).
 */

const DOT_COLORS = [
  'var(--kihub-accent)',
  'var(--kihub-accent-border)',
  'var(--kihub-text-accent)',
  'var(--kihub-accent-hover)',
];

/** "type · location" from the parts that exist — never a dangling separator. */
function typeLine(event: Event): string {
  return [event.tags?.[0], event.location ?? (event.onlineUrl ? 'Digitalt' : null)]
    .filter(Boolean)
    .join(' · ');
}

export function EventsTimeline({ events }: { events: Event[] }) {
  return (
    <div>
      <p className="kihub-eyebrow" style={{ margin: 0 }}>
        Utover måneden
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {events.map((event, index) => (
          <li
            key={event.id}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 72px minmax(0, 1fr)',
              gap: 'var(--kihub-space-4)',
              alignItems: 'start',
              padding: 'var(--kihub-space-4) 0',
              borderBottom: '1px solid var(--kihub-border-subtle)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: '10px',
                height: '10px',
                borderRadius: 'var(--kihub-radius-full)',
                background: DOT_COLORS[index % DOT_COLORS.length],
                marginTop: '6px',
              }}
            />
            <span
              style={{
                font: '400 14px/1.5 var(--kihub-font-ui)',
                color: 'var(--kihub-text-subtle)',
                whiteSpace: 'nowrap',
              }}
            >
              {formatTimelineDate(event.startDateTime)}
              <br />
              {formatTimeHM(event.startDateTime)}
            </span>
            <span>
              <Link
                href={`/events/${event.slug ?? ''}`}
                className="kihub-link"
                style={{
                  font: '400 18px/1.4 var(--kihub-font-display)',
                  color: 'var(--kihub-text)',
                  textDecoration: 'none',
                }}
              >
                {event.title}
              </Link>
              {typeLine(event) ? (
                <span
                  style={{
                    display: 'block',
                    font: '400 13px var(--kihub-font-ui)',
                    color: 'var(--kihub-text-subtle)',
                    marginTop: '2px',
                  }}
                >
                  {typeLine(event)}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
