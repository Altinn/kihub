import { ExternalLinkIcon } from '@navikt/aksel-icons';
import { RichText } from '@payloadcms/richtext-lexical/react';
import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { EventTypeBadge } from '@/components/EventTypeBadge';
import { dsConverters } from '@/lib/ds-richtext-converters';
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
 * 012 US4 (FR-013/014) — the event detail page, Norwegian copy: type badge, when + organizer,
 * meta block (place/form, channel, online link, seats), ICS download (the existing
 * /events/<slug>/ics route, unchanged), rich-text description. A draft or unknown slug resolves to
 * `null` → 404 (no draft leaks, FR-016); a published PAST event stays reachable.
 *
 * 026: the h1 comes first in the DOM (the type tag follows it), the meta block is a tinted
 * Designsystemet card holding a sentence-case description list, the ICS download is a secondary
 * button, the description renders through the Designsystemet converters, and the page has its
 * own `<title>`.
 */

const loadEvent = cache((slug: string) => getPublishedEventBySlug(decodeURIComponent(slug)));

const bodyConverters = dsConverters();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const event = await loadEvent((await params).slug);
  return event ? { title: event.title } : {};
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = await loadEvent((await params).slug);
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
              className="ds-link"
            >
              <span>Delta digitalt</span>
              <ExternalLinkIcon title="åpnes i ny fane" />
            </a>,
          ],
        ] as Array<[string, React.ReactNode]>)
      : []),
  ];

  return (
    <div className="app-container">
      <article className="app-section app-article app-event-detail">
        <Breadcrumbs
          trail={[
            { label: 'Hjem', href: '/' },
            { label: 'Arrangementer', href: '/events' },
          ]}
          current={{ label: event.title, href: `/events/${event.slug ?? ''}` }}
        />

        <h1 className="ds-heading" data-size="xl">
          {event.title}
        </h1>
        <EventTypeBadge type={event.eventType as EventTypeValue} />

        <div className="ds-card app-event-meta" data-variant="tinted" data-color="accent">
          <dl>
            {metaItems.map(([label, value]) => (
              <div key={label}>
                <dt className="ds-paragraph" data-size="sm">
                  {label}
                </dt>
                <dd className="ds-paragraph" data-size="sm">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <a href={`/events/${event.slug ?? ''}/ics`} className="ds-button" data-variant="secondary">
          Legg til i kalender
        </a>

        <div className="app-richtext">
          <RichText data={event.description} converters={bodyConverters} />
        </div>
      </article>
    </div>
  );
}
