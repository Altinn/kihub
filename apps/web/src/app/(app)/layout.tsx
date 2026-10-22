import type { Metadata } from 'next';
import { requireSession } from '@/auth/require-session';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { ThemedHtml, SITE_TITLE } from '../themed-html';

/** 026: every page gets a descriptive `<title>` (WCAG 2.4.2) — "Page · KI Hub", or "KI Hub". */
export const metadata: Metadata = SITE_TITLE;

/**
 * Route protection for the application shell (FR-001). Only an established, employee-gated
 * session reaches here; everyone else is redirected to sign-in by `requireSession`.
 *
 * 011: the shared CMS-driven chrome mounts here — every employee page gets the site header (and
 * footer) exactly once; pages no longer compose their own header.
 * 026: the layout owns the single `<main>` landmark — the skip link's target — so pages render
 * their content without one.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return (
    <ThemedHtml>
      <div className="app-shell">
        <SiteHeader />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </div>
    </ThemedHtml>
  );
}
