import { Divider, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import { RichText } from '@payloadcms/richtext-lexical/react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatEventWhen } from '@/lib/event-dates';
import { getPublishedEventBySlug } from '@/lib/events';

/**
 * Employee event detail (US1, FR-005/006/015): title, when (Europe/Oslo), location + online link,
 * organizer, tags, and the rich-text description. A draft or unknown slug resolves to `null` → 404
 * (no draft leaks). A published PAST event is still reachable here (past-hiding is list-only).
 */
export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(decodeURIComponent(slug));
  if (!event) notFound();

  const tags = (event.tags ?? []).filter((t): t is string => Boolean(t));
  const when = formatEventWhen(event.startDateTime, event.endDateTime);

  return (
    <main style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1rem' }}>
      <Paragraph data-size="sm" style={{ marginBottom: '1rem' }}>
        <Link href="/events">← Back to events</Link>
      </Paragraph>

      <Heading level={1} data-size="lg">
        {event.title}
      </Heading>
      <Paragraph data-size="sm" style={{ marginTop: '0.5rem' }}>
        {when}
        {event.organizer ? ` · ${event.organizer}` : ''}
      </Paragraph>

      {event.location || event.onlineUrl ? (
        <Paragraph data-size="sm" style={{ marginTop: '0.25rem' }}>
          {event.location ?? ''}
          {event.location && event.onlineUrl ? ' · ' : ''}
          {event.onlineUrl ? (
            <a href={event.onlineUrl} target="_blank" rel="noopener noreferrer">
              Join online
            </a>
          ) : null}
        </Paragraph>
      ) : null}

      {tags.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.75rem' }}>
          {tags.map((t) => (
            <Tag key={t} data-color="info" data-size="sm">
              {t}
            </Tag>
          ))}
        </div>
      ) : null}

      <Divider style={{ margin: '1.5rem 0' }} />

      <RichText data={event.description} />
    </main>
  );
}
