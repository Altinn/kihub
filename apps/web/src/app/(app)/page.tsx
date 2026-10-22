import { ArrowRightIcon } from '@navikt/aksel-icons';
import Link from 'next/link';
import { ContributeBanner } from '@/components/ContributeBanner';
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
 * Digdir" events section (US2) and the "Siste nytt" news section (US3). Both sections re-select
 * strictly chronologically via `frontpage-select` — unlike the featured-first /events and /news
 * pages. Gated by `(app)/layout.tsx` `requireSession()`; content is read-only via
 * `lib/site-content.ts` (seeded defaults guarantee a complete first render).
 *
 * 026: Designsystemet headings, links and cards; section headings carry the meaning on their own
 * (the uppercase eyebrows are gone), and the outline is h1 → h2 sections → h3 cards.
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
    <div className="app-container app-frontpage">
      <FrontpageHero hero={content.hero} />

      <section aria-labelledby="fp-shortcuts-heading">
        <h2 id="fp-shortcuts-heading" className="ds-sr-only">
          Snarveier
        </h2>
        <div className="app-tiles">
          {content.tiles.map((tile) => (
            <FrontpageTile key={tile.title} tile={tile} />
          ))}
        </div>
      </section>

      <SubscriptionsBanner subscriptions={content.subscriptions} />

      <ContributeBanner />

      <section className="app-section" aria-labelledby="fp-events-heading">
        <div className="app-section-head">
          <h2 id="fp-events-heading" className="ds-heading" data-size="lg">
            Hva skjer i Digdir
          </h2>
          <Link href="/events" className="ds-link">
            <span>Se kalender</span>
            <ArrowRightIcon aria-hidden />
          </Link>
        </div>
        {nextEvent ? (
          <div className="app-fp-events">
            <NextEventCard event={nextEvent} />
            {timeline.length ? (
              <EventsTimeline events={timeline} />
            ) : (
              <div className="ds-card" data-color="neutral">
                <p className="ds-paragraph">Ingen flere planlagte arrangementer akkurat nå.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="ds-card" data-color="neutral">
            <p className="ds-paragraph">
              Ingen kommende arrangementer akkurat nå. Ta en titt i kalenderen senere.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="fp-news-heading">
        <div className="app-section-head">
          <h2 id="fp-news-heading" className="ds-heading" data-size="lg">
            Siste nytt
          </h2>
          <Link href="/news" className="ds-link">
            <span>Alle nyheter</span>
            <ArrowRightIcon aria-hidden />
          </Link>
        </div>
        {latestNews.length ? (
          <div className="app-fp-news">
            {latestNews.map((article) => (
              <NewsCard key={article.id} article={article} headingLevel={3} />
            ))}
          </div>
        ) : (
          <div className="ds-card" data-color="neutral">
            <p className="ds-paragraph">Ingen publiserte nyheter ennå. Kom tilbake snart.</p>
          </div>
        )}
      </section>
    </div>
  );
}
