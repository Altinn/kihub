import Link from 'next/link';
import type { Event } from '@/payload-types';
import { formatTimeHM, formatTimelineDate } from '@/lib/event-dates';
import { EVENT_TYPE_LABELS, type EventTypeValue } from '@/lib/events-view';

/**
 * 011 US2 — the "Utover måneden" timeline (contracts/frontpage-read.md): the next 4 upcoming
 * events after the featured one (month-agnostic — clarification), each row date + time, linked
 * title and a "type · location" line.
 *
 * 026: a headed ordered list with underlined `ds-link` titles (identifiable as links without
 * relying on colour); the dot is a decorative pseudo-element in app.css.
 */

/** "type · location" from the parts that exist — never a dangling separator. */
function typeLine(event: Event): string {
  // 012 FR-015: the type is the closed eventType category, no longer the first free tag.
  return [
    EVENT_TYPE_LABELS[event.eventType as EventTypeValue],
    event.location ?? (event.onlineUrl ? 'Digitalt' : null),
  ]
    .filter(Boolean)
    .join(' · ');
}

export function EventsTimeline({ events }: { events: Event[] }) {
  return (
    <section className="app-timeline" aria-labelledby="fp-timeline-heading">
      <h3 id="fp-timeline-heading" className="ds-heading" data-size="2xs">
        Utover måneden
      </h3>
      <ol className="app-timeline__list">
        {events.map((event) => {
          const line = typeLine(event);
          return (
            <li key={event.id} className="app-timeline__item">
              <time className="ds-paragraph app-meta" data-size="sm" dateTime={event.startDateTime}>
                {formatTimelineDate(event.startDateTime)}
                <br />
                {formatTimeHM(event.startDateTime)}
              </time>
              <div>
                <Link href={`/events/${event.slug ?? ''}`} className="ds-link" data-color="neutral">
                  {event.title}
                </Link>
                {line ? (
                  <p className="ds-paragraph app-meta" data-size="sm">
                    {line}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
