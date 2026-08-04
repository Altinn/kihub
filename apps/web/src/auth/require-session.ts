import { redirect } from 'next/navigation';
import { auth } from '@/auth';

/**
 * Route guard for the protected app shell (FR-001). Returns the session for an authenticated
 * (employee-gated) user, or redirects to sign-in. Kept JSX-free so it is unit-testable in
 * isolation from the layout's rendering.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect('/signin');
  }
  return session;
}
