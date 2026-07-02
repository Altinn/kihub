import { ThemedHtml } from '../themed-html';

// Sign-in lives outside the protected (app) group so it is reachable while unauthenticated.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <ThemedHtml>{children}</ThemedHtml>;
}
