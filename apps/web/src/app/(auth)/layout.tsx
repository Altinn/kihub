import type { Metadata } from 'next';
import { ThemedHtml, SITE_TITLE } from '../themed-html';

export const metadata: Metadata = SITE_TITLE;

// Sign-in lives outside the protected (app) group so it is reachable while unauthenticated.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <ThemedHtml>{children}</ThemedHtml>;
}
