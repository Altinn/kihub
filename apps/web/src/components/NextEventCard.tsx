import Link from 'next/link';
import { EventTypeBadge } from '@/components/EventTypeBadge';
import type { Event } from '@/payload-types';
import {
  formatDayNumeral,
  formatMonthYear,
  formatTimeHM,
  formatWeekday,
} from '@/lib/event-dates';

/**
 * 011 US2 — the "Neste arrangement" card (contracts/frontpage-read.md): tinted date zone with the
 * big day numeral, then type, title, meta line and the "Legg til i kalender" ICS download.
 *
 * 026 R5: a Designsystemet card with two `ds-card__block`s. The title is the card's ONE link
 * (`h3 > a`), and `data-clickdelegatefor` (designsystemet-web) makes the whole card forward clicks
 * to it, so there is no second "Se arrangementet" link to the same page. The ICS download is the
 * card's only other action, a secondary `ds-button`.
 */

/** Compose the meta line from the parts that exist — never a dangling separator. */
function metaLine(event: Event): string {
  return [event.location, event.onlineUrl ? 'Digitalt' : null, event.organizer]
    .filter(Boolean)
    .join(' · ');
}

export function NextEventCard({ event }: { event: Event }) {
  const slug = event.slug ?? '';
  const linkId = `next-event-${event.id}`;
  const meta = metaLine(event);

  return (
    <article
      className="ds-card app-event-card"
      data-color="neutral"
      data-clickdelegatefor={linkId}
      aria-labelledby={`${linkId}-label`}
    >
      <div className="ds-card__block app-event-card__date app-tint" data-color="brand2">
        <p id={`${linkId}-label`} className="ds-paragraph" data-size="sm">
          Neste arrangement
        </p>
        <p className="ds-paragraph app-event-card__when">
          <time dateTime={event.startDateTime}>
            <span className="app-event-card__day">{formatDayNumeral(event.startDateTime)}</span>{' '}
            {formatMonthYear(event.startDateTime)} · {formatWeekday(event.startDateTime)} ·{' '}
            {formatTimeHM(event.startDateTime)}
          </time>
        </p>
      </div>

      <div className="ds-card__block">
        <EventTypeBadge type={event.eventType} />
        <h3 className="ds-heading" data-size="xs">
          <Link id={linkId} href={`/events/${slug}`}>
            {event.title}
          </Link>
        </h3>
        {meta ? (
          <p className="ds-paragraph app-meta" data-size="sm">
            {meta}
          </p>
        ) : null}
        <p className="ds-paragraph">
          <a href={`/events/${slug}/ics`} className="ds-button" data-variant="secondary" data-size="sm">
            Legg til i kalender
          </a>
        </p>
      </div>
    </article>
  );
}
