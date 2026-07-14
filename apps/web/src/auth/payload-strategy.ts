import { getToken } from 'next-auth/jwt';
import type { AuthStrategy } from 'payload';

/**
 * Payload custom auth strategy (contracts/auth-gating.md). Payload's local email/password
 * strategy is disabled; this bridges an established Auth.js session into Payload so its
 * REST/GraphQL/admin requests recognize the same user.
 *
 * Best-effort and defensive: any failure resolves to an unauthenticated request rather than
 * throwing, so Payload never breaks. Route protection for the app shell is handled separately
 * via `auth()` in the layout; this strategy covers direct Payload API access.
 */
export const authStrategy: AuthStrategy = {
  name: 'authjs-entra',
  authenticate: async ({ headers, payload }) => {
    try {
      const secret = process.env.AUTH_SECRET;
      if (!secret) return { user: null };

      const token = await getToken({
        // getToken reads the Auth.js session cookie from the incoming request headers.
        req: { headers } as unknown as Request,
        secret,
        secureCookie: process.env.NODE_ENV === 'production',
      });

      const oid = token?.oid;
      if (!oid) return { user: null };

      const result = await payload.find({
        collection: 'users',
        where: { entraOid: { equals: oid } },
        limit: 1,
        overrideAccess: true,
      });
      const user = result.docs[0];
      if (!user) return { user: null };

      // `user` (a Users doc) already carries its own `collection` field; spread first so the
      // explicit 'users' below is the one that actually wins, not a silently-overwritten dead value.
      return { user: { ...user, collection: 'users' } };
    } catch {
      return { user: null };
    }
  },
};
