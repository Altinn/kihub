import { Card, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import Link from 'next/link';
import { formatEventWhen } from '@/lib/event-dates';

export interface EventCardData {
  slug: string;
  title: string;
  startDateTime: string;
  endDateTime?: string | null;
  location?: string | null;
  onlineUrl?: string | null;
  tags?: (string | null)[] | null;
  featured?: boolean | null;
}

/** Listing card for one event (Designsystemet). Links to the detail page. */
export function EventCard({ event }: { event: EventCardData }) {
  const tags = (event.tags ?? []).filter((t): t is string => Boolean(t));
  const where = event.location || (event.onlineUrl ? 'Online' : null);
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
        <Heading level={2} data-size="xs">
          <Link href={`/events/${event.slug}`}>{event.title}</Link>
        </Heading>
        {event.featured ? (
          <Tag data-color="warning" data-size="sm">
            Featured
          </Tag>
        ) : null}
      </div>
      <Paragraph data-size="xs" style={{ marginTop: '0.25rem' }}>
        {formatEventWhen(event.startDateTime, event.endDateTime)}
        {where ? ` · ${where}` : ''}
      </Paragraph>
      {tags.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.75rem' }}>
          {tags.map((t) => (
            <Tag key={t} data-color="info" data-size="sm">
              {t}
            </Tag>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
