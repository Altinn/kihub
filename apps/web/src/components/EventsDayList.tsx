import Link from 'next/link';
import { EventTypeBadge } from '@/components/EventTypeBadge';
import { formatTimeHM } from '@/lib/event-dates';
import {
  formatDateChip,
  groupEventsByDay,
  placeText,
  seatsText,
  type EventTypeValue,
} from '@/lib/events-view';
import type { Event } from '@/payload-types';

/**
 * 012 US1 — the grouped list view (FR-002/003): one tinted date chip per Oslo day
 * ("Fredag 3. juli"), then rows of start time · linked title · meta line
 * (place · channel · seats) · type badge · forward affordance. Empty states are Norwegian and
 * distinguish "nothing upcoming" from "no filter matches" (FR-005, spec edge cases).
 */

function metaLine(event: Event): string {
  return [placeText(event), event.channel, seatsText(event.capacity, event.seatsTaken)]
    .filter(Boolean)
    .join(' · ');
}

export function EventsDayList({
  events,
  hasActiveFilters,
}: {
  events: Event[];
  hasActiveFilters: boolean;
}) {
  if (events.length === 0) {
    return (
      <div className="ev-empty kihub-card">
        {hasActiveFilters ? (
          <>
            <p className="kihub-h4">Ingen arrangementer matcher filtrene.</p>
            <p>
              Prøv å fjerne noen filtre, eller{' '}
              <Link href="/events" className="kihub-link">
                nullstill alle filtre
              </Link>
              .
            </p>
          </>
        ) : (
          <>
            <p className="kihub-h4">Ingen kommende arrangementer.</p>
            <p>Nye arrangementer dukker opp her så snart de publiseres.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="ev-days">
      {groupEventsByDay(events).map(([dayKey, dayEvents]) => (
        <section key={dayKey} className="ev-day" aria-label={formatDateChip(dayKey)}>
          <span className="ev-datechip">{formatDateChip(dayKey)}</span>
          <ul className="ev-rows">
            {dayEvents.map((event) => (
              <li key={event.id} className="ev-row">
                <span className="ev-row__time">{formatTimeHM(event.startDateTime)}</span>
                <div className="ev-row__main">
                  <h3 className="ev-row__title">
                    <Link href={`/events/${event.slug ?? ''}`} className="kihub-focusable">
                      {event.title}
                    </Link>
                  </h3>
                  <p className="ev-row__meta">{metaLine(event)}</p>
                </div>
                <EventTypeBadge type={event.eventType as EventTypeValue} />
                <span className="ev-row__arrow" aria-hidden="true">
                  →
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
