import { Button, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import Link from 'next/link';
import { auth, signOut } from '@/auth';

/**
 * Shared employee-app header (Designsystemet). Renders the KI Hub brand/home link, primary
 * navigation to the three portal modules (Registry · News · Events), and the signed-in user's
 * identity + sign-out. Reused across the dashboard, `/registry`, `/news`, `/events`, and the artifact
 * detail page so navigation is present and consistent on every employee-app page (FR-012, US3).
 *
 * It resolves the session itself, so pages need only render `<PortalHeader />`. Access is still gated
 * upstream by `(app)/layout.tsx` `requireSession()`.
 */
export async function PortalHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <Heading level={1} data-size="lg">
          <Link href="/">KI Hub</Link>
        </Heading>
        <Paragraph data-size="sm">Internal AI enablement &amp; governance portal</Paragraph>
        <Paragraph data-size="sm" style={{ marginTop: '0.25rem' }}>
          <Link href="/registry">Registry</Link> · <Link href="/news">News</Link> ·{' '}
          <Link href="/events">Events</Link>
        </Paragraph>
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
  );
}
