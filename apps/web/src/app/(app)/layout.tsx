import { requireSession } from '@/auth/require-session';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { ThemedHtml } from '../themed-html';

/**
 * Route protection for the application shell (FR-001). Only an established, employee-gated
 * session reaches here; everyone else is redirected to sign-in by `requireSession`.
 *
 * 011: the shared CMS-driven chrome mounts here — every employee page gets the site header (and
 * footer) exactly once; pages no longer compose their own header.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return (
    <ThemedHtml>
      <div className="portal-shell">
        <SiteHeader />
        {children}
        <SiteFooter />
      </div>
    </ThemedHtml>
  );
}
