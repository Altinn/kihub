import { Button, Card, Divider, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import { auth, signOut } from '@/auth';

/**
 * The Phase 1 catalog shell (User Story 1): a working, authenticated home that renders an
 * intentional empty state (FR-005). Discovery/browsing/search arrive in later phases.
 */
export default async function CatalogShellPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <main style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
        }}
      >
        <div>
          <Heading level={1} data-size="lg">
            KI Hub
          </Heading>
          <Paragraph data-size="sm">Internal AI enablement &amp; governance catalog</Paragraph>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <Paragraph data-size="sm">
              <strong>{user?.name}</strong>
            </Paragraph>
            <Paragraph data-size="xs">{user?.email}</Paragraph>
          </div>
          <Tag data-color="neutral" data-size="sm">
            {user?.role ?? 'reader'}
          </Tag>
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

      <Card>
        <Heading level={2} data-size="md">
          Catalog
        </Heading>
        <Paragraph style={{ marginTop: '0.5rem' }}>No artifacts yet.</Paragraph>
        <Paragraph data-size="sm" style={{ marginTop: '0.5rem' }}>
          The catalog is empty. Artifact discovery and browsing arrive in a later phase — this
          authenticated shell confirms the foundation is in place.
        </Paragraph>
      </Card>
    </main>
  );
}
