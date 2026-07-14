import { Button, Card, Divider, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import { auth, signOut } from '@/auth';
import { ArtifactCard } from '@/components/ArtifactCard';
import { CatalogFilters } from '@/components/CatalogFilters';
import { listArtifacts } from '@/lib/catalog';
import { getGovernance } from '@/lib/governance';

type SearchParams = { type?: string; tag?: string | string[] };

/** Phase 2 catalog listing: browse + filter indexed artifacts (US2). */
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const user = session?.user;
  const { type, tag } = await searchParams;
  const activeTags = Array.isArray(tag) ? tag : tag ? [tag] : [];
  const activeType = type;

  const [filtered, allActive] = await Promise.all([
    listArtifacts({ type: activeType, tags: activeTags }),
    listArtifacts(),
  ]);
  const governanceByArtifactId = new Map(
    await Promise.all(
      filtered.map(
        async (a) => [a.artifactId as string, await getGovernance(a.artifactId as string)] as const,
      ),
    ),
  );

  // Facets derived from the full active set so filters stay visible.
  const availableTypes = [...new Set(allActive.map((a) => a.type as string))].sort();
  const availableTags = [
    ...new Set(allActive.flatMap((a) => (a.tags as string[] | undefined) ?? [])),
  ].sort();

  return (
    <main style={{ maxWidth: '1040px', margin: '0 auto', padding: '2rem 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <Heading level={1} data-size="lg">
            KI Hub
          </Heading>
          <Paragraph data-size="sm">Internal AI enablement &amp; governance catalog</Paragraph>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <Paragraph data-size="sm">
              <strong>{user?.name}</strong> <Tag data-size="sm">{user?.role}</Tag>
            </Paragraph>
            <Paragraph data-size="xs">{user?.email}</Paragraph>
            {user?.role === 'admin' ? (
              <Paragraph data-size="xs">
                <a href="/admin/roles">Manage roles</a>
              </Paragraph>
            ) : null}
          </div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/signin' });
            }}
          >
            <Button type="submit" variant="secondary" data-size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <Divider style={{ margin: '1.5rem 0' }} />

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
          />
          <div>
            <Paragraph data-size="sm" style={{ marginBottom: '1rem' }}>
              {filtered.length} {filtered.length === 1 ? 'artifact' : 'artifacts'}
              {activeType || activeTags.length ? ' (filtered)' : ''}
            </Paragraph>
            {filtered.length === 0 ? (
              <Card>
                <Heading level={2} data-size="sm">
                  No matching artifacts
                </Heading>
                <Paragraph data-size="sm" style={{ marginTop: '0.5rem' }}>
                  No artifacts match the active filters. <a href="/">Clear filters</a> to see all.
                </Paragraph>
              </Card>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {filtered.map((a) => (
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
    </main>
  );
}
