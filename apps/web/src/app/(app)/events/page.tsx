import { Card, Divider, Heading, Paragraph } from '@digdir/designsystemet-react';
import Link from 'next/link';
import { EventCard } from '@/components/EventCard';
import { listUpcomingEvents } from '@/lib/events';

/**
 * Employee events list (US1, FR-004/012/014): published upcoming events, featured surfaced,
 * soonest-first, with a friendly empty state. Access is gated by `(app)/layout.tsx`
 * `requireSession()` — employees only.
 */
export default async function EventsListPage() {
  const events = await listUpcomingEvents();

  return (
    <main style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem' }}>
      <Paragraph data-size="sm" style={{ marginBottom: '1rem' }}>
        <Link href="/">← Back to catalog</Link>
      </Paragraph>

      <Heading level={1} data-size="lg">
        Events
      </Heading>
      <Paragraph data-size="sm" style={{ marginTop: '0.25rem' }}>
        Upcoming internal events.
      </Paragraph>

      <Divider style={{ margin: '1.5rem 0' }} />

      {events.length === 0 ? (
        <Card>
          <Heading level={2} data-size="sm">
            No upcoming events
          </Heading>
          <Paragraph data-size="sm" style={{ marginTop: '0.5rem' }}>
            There are no upcoming events right now. Check back soon.
          </Paragraph>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {events.map((e) => (
            <EventCard
              key={e.id}
              event={{
                slug: e.slug ?? '',
                title: e.title,
                startDateTime: e.startDateTime,
                endDateTime: e.endDateTime,
                location: e.location,
                onlineUrl: e.onlineUrl,
                tags: e.tags,
                featured: e.featured,
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
