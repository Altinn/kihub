import { Divider } from '@digdir/designsystemet-react';
import { ArtifactCard } from '@/components/ArtifactCard';
import { EventCard } from '@/components/EventCard';
import { HomeWidget } from '@/components/HomeWidget';
import { NewsCard } from '@/components/NewsCard';
import { PortalHeader } from '@/components/PortalHeader';
import { getHomeEvents, getHomeNews, getHomeRecommendedArtifacts } from '@/lib/home';

/**
 * Portal dashboard (the employee home). Surfaces the latest published news, the next upcoming
 * published events, and featured/recommended Registry artifacts — three read-only widgets, each
 * capped and each with a "View all →" link into its module. It does NOT branch on `q`: full-text
 * search lives on `/registry` now (FR-001/010). Gated by `(app)/layout.tsx` `requireSession()`.
 */
export default async function DashboardPage() {
  const [news, events, recommended] = await Promise.all([
    getHomeNews(),
    getHomeEvents(),
    getHomeRecommendedArtifacts(),
  ]);

  return (
    <main style={{ maxWidth: '1040px', margin: '0 auto', padding: '2rem 1rem' }}>
      <PortalHeader />

      <Divider style={{ margin: '1.5rem 0' }} />

      <div style={{ display: 'grid', gap: '2.5rem' }}>
        <HomeWidget
          title="Latest news"
          viewAllHref="/news"
          isEmpty={news.length === 0}
          emptyMessage="No published news yet. Check back soon."
        >
          {news.map((a) => (
            <NewsCard
              key={a.id}
              article={{
                slug: a.slug ?? '',
                title: a.title,
                summary: a.summary,
                publishDate: a.publishDate,
                tags: a.tags,
                featured: a.featured,
              }}
            />
          ))}
        </HomeWidget>

        <HomeWidget
          title="Upcoming events"
          viewAllHref="/events"
          isEmpty={events.length === 0}
          emptyMessage="No upcoming events right now. Check back soon."
        >
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
        </HomeWidget>

        <HomeWidget
          title="Recommended tools"
          viewAllHref="/registry"
          isEmpty={recommended.length === 0}
          emptyMessage="No featured or recommended tools yet. Browse the full Registry."
        >
          {recommended.map(({ artifact, governance }) => (
            <ArtifactCard key={artifact.artifactId} artifact={artifact} governance={governance} />
          ))}
        </HomeWidget>
      </div>
    </main>
  );
}
