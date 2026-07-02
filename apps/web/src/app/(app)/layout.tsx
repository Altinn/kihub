import { requireSession } from '@/auth/require-session';
import { ThemedHtml } from '../themed-html';

/**
 * Route protection for the application shell (FR-001). Only an established, employee-gated
 * session reaches here; everyone else is redirected to sign-in by `requireSession`.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return <ThemedHtml>{children}</ThemedHtml>;
}
