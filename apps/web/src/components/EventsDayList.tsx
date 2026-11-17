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
 * 012 US1 — the grouped list view (FR-002/003): one date heading per Oslo day
 * ("Fredag 3. juli"), then rows of start time · linked title · meta line
 * (place · channel · seats) · type badge · forward affordance. Empty states are Norwegian and
 * distinguish "nothing upcoming" from "no filter matches" (FR-005, spec edge cases).
 *
 * 026: the day is a real heading (h2 under the page h1, or h3 when the list sits under the
 * calendar's month h2 as the phone agenda) and each event title one level below it, which fixes
 * the h1 → h3 skip. Titles are underlined `ds-link`s; each day section has an `id`
 * (`dag-YYYY-MM-DD`) the calendar's "+N flere" links can jump to.
 */

function metaLine(event: Event): string {
  return [placeText(event), event.channel, seatsText(event.capacity, event.seatsTaken)]
    .filter(Boolean)
    .join(' · ');
}

export function EventsDayList({
  events,
  hasActiveFilters,
  headingLevel = 2,
}: {
  events: Event[];
  hasActiveFilters: boolean;
  headingLevel?: 2 | 3;
}) {
  const DayHeading = headingLevel === 3 ? 'h3' : 'h2';
  const TitleHeading = headingLevel === 3 ? 'h4' : 'h3';

  if (events.length === 0) {
    return (
      <div className="ds-card" data-color="neutral">
        {hasActiveFilters ? (
          <>
            <p className="ds-paragraph">
              <strong>Ingen arrangementer matcher filtrene.</strong>
            </p>
            <p className="ds-paragraph">
              Prøv å fjerne noen filtre, eller{' '}
              <Link href="/events" className="ds-link">
                nullstill alle filtre
              </Link>
              .
            </p>
          </>
        ) : (
          <>
            <p className="ds-paragraph">
              <strong>Ingen kommende arrangementer.</strong>
            </p>
            <p className="ds-paragraph">Nye arrangementer dukker opp her så snart de publiseres.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="app-days">
      {groupEventsByDay(events).map(([dayKey, dayEvents]) => {
        const headingId = `dag-${dayKey}`;
        return (
          <section key={dayKey} aria-labelledby={headingId}>
            <DayHeading id={headingId} className="ds-heading app-daychip" data-size="2xs">
              {formatDateChip(dayKey)}
            </DayHeading>
            <ul className="app-event-rows">
              {dayEvents.map((event) => (
                <li key={event.id} className="app-event-row">
                  <time className="ds-paragraph app-meta" data-size="sm" dateTime={event.startDateTime}>
                    {formatTimeHM(event.startDateTime)}
                  </time>
                  <div>
                    <TitleHeading className="ds-heading" data-size="xs">
                      <Link href={`/events/${event.slug ?? ''}`} className="ds-link" data-color="neutral">
                        {event.title}
                      </Link>
                    </TitleHeading>
                    <p className="ds-paragraph app-meta" data-size="sm">
                      {metaLine(event)}
                    </p>
                  </div>
                  <EventTypeBadge type={event.eventType as EventTypeValue} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
