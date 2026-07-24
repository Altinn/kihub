import type { ArtifactCardData } from '@/components/ArtifactCard';
import { listArtifacts } from '@/lib/catalog';
import type { Event } from '@/payload-types';
import type { News } from '@/payload-types';
import { listUpcomingEvents } from '@/lib/events';
import { getGovernance } from '@/lib/governance';
import { type RecommendedArtifact, selectRecommendedArtifacts, takeTopN } from '@/lib/home-select';
import { listPublishedNews } from '@/lib/news';

/**
 * Read layer for the home dashboard widgets. Each helper composes an existing published-only /
 * active-only read with the pure selection helpers (`lib/home-select.ts`) — it introduces no new
 * query path, so the widgets can never surface a draft article, a draft/past event, or an inactive
 * artifact. Ordering (featured-first; news newest-first, events soonest-first) is already applied by
 * the underlying reads; these just cap and (for the Registry widget) curate on the governance
 * featured/recommended flags.
 */

/** Shared per-widget item cap (FR-002). */
export const HOME_WIDGET_LIMIT = 3;

/** Latest published news for the news widget (featured-first, newest-first), capped. */
export async function getHomeNews(limit: number = HOME_WIDGET_LIMIT): Promise<News[]> {
  return takeTopN(await listPublishedNews(), limit);
}

/** Next upcoming published events for the events widget (featured-first, soonest-first), capped. */
export async function getHomeEvents(limit: number = HOME_WIDGET_LIMIT): Promise<Event[]> {
  return takeTopN(await listUpcomingEvents(), limit);
}

/**
 * Featured/recommended artifacts for the Registry widget, capped. Resolves active artifacts and their
 * governance (the pattern the `/registry` catalog page uses), then curates via
 * `selectRecommendedArtifacts`. Artifacts whose governance cannot be resolved are skipped.
 */
export async function getHomeRecommendedArtifacts(
  limit: number = HOME_WIDGET_LIMIT,
): Promise<RecommendedArtifact[]> {
  const artifacts = await listArtifacts();
  const entries = await Promise.all(
    artifacts.map(async (a) => {
      const governance = await getGovernance(a.artifactId as string);
      if (!governance) return null;
      const artifact: ArtifactCardData = {
        artifactId: a.artifactId as string,
        name: a.name as string,
        type: a.type as string,
        description: a.description as string,
        tags: (a.tags as string[] | undefined) ?? [],
      };
      return { artifact, governance } satisfies RecommendedArtifact;
    }),
  );
  return selectRecommendedArtifacts(
    entries.filter((e): e is RecommendedArtifact => e !== null),
    limit,
  );
}
