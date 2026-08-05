import { RichText } from '@payloadcms/richtext-lexical/react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventTypeBadge } from '@/components/EventTypeBadge';
import { formatEventWhen } from '@/lib/event-dates';
import { getPublishedEventBySlug } from '@/lib/events';
import {
  EVENT_FORMAT_LABELS,
  placeText,
  seatsText,
  type EventFormatValue,
  type EventTypeValue,
} from '@/lib/events-view';

/**
 * 012 US4 (FR-013/014) — the event detail page on the kihub token layer, Norwegian copy: type
 * badge, when + organizer, meta block (place/form, channel, online link, seats), ICS download
 * (the existing /events/<slug>/ics route, unchanged), rich-text description. A draft or unknown
 * slug resolves to `null` → 404 (no draft leaks, FR-016); a published PAST event stays reachable.
 */
export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(decodeURIComponent(slug));
  if (!event) notFound();

  const format = event.format as EventFormatValue;
  const metaItems: Array<[string, React.ReactNode]> = [
    ['Når', `${formatEventWhen(event.startDateTime, event.endDateTime)}`],
    ['Hvor', placeText(event)],
    ['Form', EVENT_FORMAT_LABELS[format]],
    ...(event.channel ? ([['Kanal', event.channel]] as Array<[string, React.ReactNode]>) : []),
    ['Plasser', seatsText(event.capacity, event.seatsTaken)],
    ...(event.organizer
      ? ([['Arrangør', event.organizer]] as Array<[string, React.ReactNode]>)
      : []),
    ...(event.onlineUrl
      ? ([
          [
            'Lenke',
            <a
              key="online"
              href={event.onlineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kihub-link"
            >
              Delta digitalt
            </a>,
          ],
        ] as Array<[string, React.ReactNode]>)
      : []),
  ];

  return (
    <main className="kihub-container">
      <article className="kihub-section ev-detail">
        <p className="ev-detail__back">
          <Link href="/events" className="kihub-link">
            ← Til arrangementer
          </Link>
        </p>

        <EventTypeBadge type={event.eventType as EventTypeValue} />
        <h1 className="kihub-h1 ev-detail__title">{event.title}</h1>

        <dl className="ev-detail__meta">
          {metaItems.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <p>
          <a href={`/events/${event.slug ?? ''}/ics`} className="kihub-btn kihub-btn--secondary">
            + Legg til i kalender
          </a>
        </p>

        <div className="kihub-prose ev-detail__body">
          <RichText data={event.description} />
        </div>
      </article>
    </main>
  );
}
