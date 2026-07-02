import type { NextAuthConfig } from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import type { IdentityClaims } from './claims';
import { employeeGate } from './employee-gate';
import { mockProvider } from './mock-provider';

const AUTH_MODE = process.env.AUTH_MODE ?? 'mock';
const IS_PROD = process.env.NODE_ENV === 'production';

function buildProviders(): NextAuthConfig['providers'] {
  if (AUTH_MODE === 'entra') {
    return [
      MicrosoftEntraID({
        clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
        clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
        issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
        authorization: { params: { scope: 'openid profile email' } },
      }),
    ];
  }

  // Dev-only: refuse to wire the mock provider into a production build.
  if (IS_PROD) {
    throw new Error(
      'AUTH_MODE=mock is not allowed in production. Set AUTH_MODE=entra with a real Entra app registration.',
    );
  }
  return [mockProvider];
}

/** Normalize claims from either the mock user object or the Entra id_token profile. */
export function toClaims(
  user: Record<string, unknown> | null | undefined,
  profile: Record<string, unknown> | null | undefined,
): IdentityClaims | null {
  const src = { ...(profile ?? {}), ...(user ?? {}) } as Record<string, unknown>;
  const oid = (src.oid ?? src.sub) as string | undefined;
  const email = (src.email ?? src.preferred_username) as string | undefined;
  const name = (src.name as string | undefined) ?? email;
  const tid = (src.tid as string | undefined) ?? '';
  const idtyp = src.idtyp as IdentityClaims['idtyp'];
  if (!oid || !email) return null;
  return { oid, email, name: name ?? email, tid, idtyp };
}

export const authConfig: NextAuthConfig = {
  providers: buildProviders(),
  session: { strategy: 'jwt' },
  pages: { signIn: '/signin', error: '/signin' },
  callbacks: {
    // Employees-only gate — applied uniformly to every provider (FR-002).
    signIn({ user, profile }) {
      const claims = toClaims(user as Record<string, unknown>, profile as Record<string, unknown>);
      return employeeGate(claims).allowed;
    },
    // On sign-in, upsert the Payload Users doc and stamp identity onto the token.
    async jwt({ token, user, profile }) {
      if (user) {
        const claims = toClaims(
          user as Record<string, unknown>,
          profile as Record<string, unknown>,
        );
        if (claims && employeeGate(claims).allowed) {
          // Lazy import keeps Payload out of any edge bundle that imports this config.
          const { getPayload } = await import('payload');
          const configPromise = (await import('@payload-config')).default;
          const payload = await getPayload({ config: configPromise });
          const { upsertUserFromClaims } = await import('./upsert-user');
          const doc = await upsertUserFromClaims(payload, claims);
          token.userId = String(doc.id);
          token.oid = claims.oid;
          token.email = claims.email;
          token.name = claims.name;
          token.tid = claims.tid;
          token.role = (doc as { role?: string }).role ?? 'reader';
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) ?? session.user.id;
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.name = (token.name as string) ?? session.user.name;
        (session.user as { role?: string }).role = (token.role as string) ?? 'reader';
        (session.user as { oid?: string }).oid = token.oid as string;
      }
      return session;
    },
  },
};
