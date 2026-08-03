import { Card, Heading, Paragraph } from '@digdir/designsystemet-react';
import Link from 'next/link';
import { ArtifactCard } from '@/components/ArtifactCard';
import { CatalogFilters } from '@/components/CatalogFilters';
import { SearchBar } from '@/components/SearchBar';
import { listArtifacts } from '@/lib/catalog';
import { getGovernance } from '@/lib/governance';
import { searchArtifacts } from '@/lib/search';

type SearchParams = { type?: string; tag?: string | string[]; q?: string };

/**
 * Registry catalog listing (moved from `/` by the home-widgets feature). With no `q` it is the
 * Phase 2 browse + filter (US2). With a `q` it runs Phase 5 full-text search over
 * name/description/README, combined with the same filters, governance-safe. Behavior is unchanged
 * from when this page lived at `/`; only its route and its own internal links changed. Access is
 * gated by `(app)/layout.tsx` `requireSession()` — adding `q` does not bypass it (FR-007/009/010).
 */
export default async function RegistryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { type, tag, q } = await searchParams;
  const activeTags = Array.isArray(tag) ? tag : tag ? [tag] : [];
  const activeType = type;
  const query = (q ?? '').trim();
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

  return (
    <main style={{ maxWidth: '1040px', margin: '0 auto', padding: '2rem 1rem' }}>

      <Heading level={2} data-size="md">
        Registry
      </Heading>
      <Paragraph data-size="sm" style={{ marginTop: '0.25rem' }}>
        Browse and search internal AI tools, with governance state.
      </Paragraph>

      <div style={{ marginTop: '1.5rem' }}>
        {allActive.length === 0 ? (
          <Card>
            <Heading level={2} data-size="md">
              Catalog is empty
            </Heading>
            <Paragraph data-size="sm" style={{ marginTop: '0.5rem' }}>
              No artifacts have been indexed yet. Run the indexer (<code>pnpm --filter web index</code>)
              against a local <code>ai-artifacts</code> checkout.
            </Paragraph>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '2rem', alignItems: 'start' }}>
            <CatalogFilters
              availableTypes={availableTypes}
              availableTags={availableTags}
              activeType={activeType}
              activeTags={activeTags}
              basePath="/registry"
            />
            <div>
              <SearchBar initialQuery={query} basePath="/registry" />
              <Paragraph data-size="sm" style={{ marginBottom: '1rem' }}>
                {results.length} {results.length === 1 ? 'artifact' : 'artifacts'}
                {isSearch ? ` for “${query}”` : ''}
                {hasFilters ? ' (filtered)' : ''}
              </Paragraph>
              {results.length === 0 ? (
                <Card>
                  <Heading level={2} data-size="sm">
                    {isSearch ? 'No results' : 'No matching artifacts'}
                  </Heading>
                  <Paragraph data-size="sm" style={{ marginTop: '0.5rem' }}>
                    {isSearch ? (
                      <>
                        Nothing matches “{query}”
                        {hasFilters ? ' with the active filters' : ''}. Try different keywords
                        {hasFilters ? ' or ' : ' — or '}
                        <Link href="/registry">clear the search</Link>.
                      </>
                    ) : (
                      <>
                        No artifacts match the active filters. <Link href="/registry">Clear filters</Link> to see all.
                      </>
                    )}
                  </Paragraph>
                </Card>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
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
    </main>
  );
}
