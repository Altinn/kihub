import Link from 'next/link';
import { ArtifactCard } from '@/components/ArtifactCard';
import { CatalogFilters } from '@/components/CatalogFilters';
import { SearchBar } from '@/components/SearchBar';
import { listArtifacts } from '@/lib/catalog';
import { getGovernance } from '@/lib/governance';
import { parseRegistrySearchParams } from '@/lib/registry-view';
import { searchArtifacts } from '@/lib/search';

type SearchParams = Record<string, string | string[] | undefined>;

export const metadata = { title: 'Verktøy og ressurser' };

/**
 * Registry catalog listing (moved from `/` by the home-widgets feature). With no `q` it is the
 * Phase 2 browse + filter (US2). With a `q` it runs Phase 5 full-text search over
 * name/description/README, combined with the same filters, governance-safe. Access is gated by
 * `(app)/layout.tsx` `requireSession()` — adding `q` does not bypass it (FR-007/009/010).
 *
 * 026: Norwegian copy and a real h1 (it was an English h2), Designsystemet markup with no inline
 * styles or React wrappers, and filters + search as plain GET forms (`parseRegistrySearchParams`
 * reads what they submit), so the whole page works without client-side scripting.
 */
export default async function RegistryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { type: activeType, tags: activeTags, query } = parseRegistrySearchParams(await searchParams);
  const isSearch = query.length > 0;
  const filters = { type: activeType, tags: activeTags };

  const [results, allActive] = await Promise.all([
    isSearch ? searchArtifacts(query, filters) : listArtifacts(filters),
    listArtifacts(),
  ]);
  const governanceByArtifactId = new Map(
    await Promise.all(
      results.map(
        async (a) => [a.artifactId as string, await getGovernance(a.artifactId as string)] as const,
      ),
    ),
  );

  // Facets derived from the full active set so filters stay visible.
  const availableTypes = [...new Set(allActive.map((a) => a.type as string))].sort();
  const availableTags = [
    ...new Set(allActive.flatMap((a) => (a.tags as string[] | undefined) ?? [])),
  ].sort();
  const hasFilters = Boolean(activeType) || activeTags.length > 0;
  // "treff" is the same in singular and plural.
  const countText = `${results.length} treff${isSearch ? ` for «${query}»` : ''}${
    hasFilters ? ' med valgte filtre' : ''
  }`;

  return (
    <div className="app-container">
      <div className="app-section">
        <div className="app-page-intro">
          <h1 className="ds-heading" data-size="xl">
            Verktøy og ressurser
          </h1>
          <p className="ds-paragraph app-meta" data-size="lg">
            Finn og søk i interne KI-verktøy, med styringsstatus.
          </p>
        </div>

        {allActive.length === 0 ? (
          <div className="ds-card" data-color="neutral">
            <h2 className="ds-heading" data-size="sm">
              Katalogen er tom
            </h2>
            <p className="ds-paragraph" data-size="sm">
              Ingen verktøy er indeksert ennå. Kjør indekseringen (<code>pnpm --filter web index</code>)
              mot en lokal kopi av <code>ai-artifacts</code>.
            </p>
          </div>
        ) : (
          <div className="app-sidebar-layout">
            <CatalogFilters
              availableTypes={availableTypes}
              availableTags={availableTags}
              activeType={activeType}
              activeTags={activeTags}
              query={query}
              basePath="/registry"
            />
            <div className="app-stack">
              <SearchBar initialQuery={query} basePath="/registry" type={activeType} tags={activeTags} />
              <p className="ds-paragraph app-meta" data-size="sm">
                {countText}
              </p>
              {results.length === 0 ? (
                <div className="ds-card" data-color="neutral">
                  <h2 className="ds-heading" data-size="sm">
                    {isSearch ? 'Ingen treff' : 'Ingen verktøy matcher filtrene'}
                  </h2>
                  <p className="ds-paragraph" data-size="sm">
                    {isSearch ? (
                      <>
                        Ingenting matcher «{query}»{hasFilters ? ' med de valgte filtrene' : ''}. Prøv
                        andre søkeord, eller{' '}
                        <Link href="/registry" className="ds-link">
                          tøm søket
                        </Link>
                        .
                      </>
                    ) : (
                      <>
                        Ingen verktøy matcher filtrene.{' '}
                        <Link href="/registry" className="ds-link">
                          Nullstill filtrene
                        </Link>{' '}
                        for å se alle.
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <div className="app-stack">
                  {results.map((a) => (
                    <ArtifactCard
                      key={a.artifactId as string}
                      artifact={{
                        artifactId: a.artifactId as string,
                        name: a.name as string,
                        type: a.type as string,
                        description: a.description as string,
                        tags: (a.tags as string[] | undefined) ?? [],
                      }}
                      governance={governanceByArtifactId.get(a.artifactId as string)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
