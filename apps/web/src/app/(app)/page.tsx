import Link from 'next/link';
import { EventsTimeline } from '@/components/EventsTimeline';
import { FrontpageHero } from '@/components/FrontpageHero';
import { FrontpageTile } from '@/components/FrontpageTile';
import { NewsCard } from '@/components/NewsCard';
import { NextEventCard } from '@/components/NextEventCard';
import { SubscriptionsBanner } from '@/components/SubscriptionsBanner';
import { listUpcomingEvents } from '@/lib/events';
import { selectEventsSection, selectLatestNews } from '@/lib/frontpage-select';
import { listPublishedNews } from '@/lib/news';
import { getFrontpageContent } from '@/lib/site-content';

/**
 * 011 — the portal frontpage (replaces the 010 widgets dashboard, FR-001). Composes the
 * CMS-driven hero, the two navigation tiles, the subscriptions banner (US1), the "Hva skjer i
 * BOD" events section (US2) and the "Siste nytt" news section (US3). Both sections re-select
 * strictly chronologically via `frontpage-select` — unlike the featured-first /events and /news
 * pages. Gated by `(app)/layout.tsx` `requireSession()`; content is read-only via
 * `lib/site-content.ts` (seeded defaults guarantee a complete first render).
 */
export default async function FrontPage() {
  const [content, upcomingEvents, publishedNews] = await Promise.all([
    getFrontpageContent(),
    listUpcomingEvents(),
    listPublishedNews(),
  ]);
  const { next: nextEvent, timeline } = selectEventsSection(upcomingEvents, new Date());
  const latestNews = selectLatestNews(publishedNews);

  return (
    <main className="kihub-container">
      <FrontpageHero hero={content.hero} />

      <section aria-label="Snarveier" className="kihub-grid-2">
        {content.tiles.map((tile) => (
          <FrontpageTile key={tile.title} tile={tile} />
        ))}
      </section>

      <div style={{ marginTop: 'var(--kihub-space-8)' }}>
        <SubscriptionsBanner subscriptions={content.subscriptions} />
      </div>

      <section className="kihub-section" aria-labelledby="fp-events-heading">
        <div className="fp-section-head">
          <div>
            <p className="kihub-eyebrow kihub-eyebrow--accent" style={{ margin: 0 }}>
              Arrangementer
            </p>
            <h2 id="fp-events-heading" className="kihub-h2">
              Hva skjer i BOD
            </h2>
          </div>
          <Link href="/events" className="kihub-btn kihub-btn--tertiary">
            Se kalender →
          </Link>
        </div>
        {nextEvent ? (
          <div className="fp-events">
            <NextEventCard event={nextEvent} />
            {timeline.length ? (
              <EventsTimeline events={timeline} />
            ) : (
              <p className="kihub-prose" style={{ color: 'var(--kihub-text-subtle)' }}>
                Ingen flere planlagte arrangementer akkurat nå.
              </p>
            )}
          </div>
        ) : (
          <p className="kihub-prose" style={{ color: 'var(--kihub-text-subtle)' }}>
            Ingen kommende arrangementer akkurat nå. Ta en titt i kalenderen senere.
          </p>
        )}
      </section>

      <section aria-labelledby="fp-news-heading">
        <div className="fp-section-head">
          <div>
            <p className="kihub-eyebrow kihub-eyebrow--accent" style={{ margin: 0 }}>
              Aktuelt
            </p>
            <h2 id="fp-news-heading" className="kihub-h2">
              Siste nytt
            </h2>
          </div>
          <Link href="/news" className="kihub-btn kihub-btn--tertiary">
            Alle nyheter →
          </Link>
        </div>
        {latestNews.length ? (
          <div className="fp-news">
            {latestNews.map((article) => (
              <NewsCard key={article.id} article={article} headingLevel={3} />
            ))}
          </div>
        ) : (
          <p className="kihub-prose" style={{ color: 'var(--kihub-text-subtle)' }}>
            Ingen publiserte nyheter ennå. Kom tilbake snart.
          </p>
        )}
      </section>
    </main>
  );
}
