import type { Payload } from 'payload';
import type { IdentityClaims } from './claims';

/**
 * Map a verified, gated identity onto a Payload `Users` document (contracts/auth-gating.md).
 * Upsert keyed by `entraOid`: create on first sign-in (baseline role `reader`), otherwise
 * refresh the profile + `lastLoginAt`. This is the only Payload write path in Phase 1.
 *
 * Callers MUST gate the claims with `employeeGate` first — this function does not re-check.
 */
export async function upsertUserFromClaims(payload: Payload, claims: IdentityClaims) {
  const existing = await payload.find({
    collection: 'users',
    where: { entraOid: { equals: claims.oid } },
    limit: 1,
    overrideAccess: true,
  });

  const now = new Date().toISOString();
  const current = existing.docs[0];

  if (current) {
    return payload.update({
      collection: 'users',
      id: current.id,
      data: {
        email: claims.email,
        name: claims.name,
        tenantId: claims.tid,
        lastLoginAt: now,
      },
      overrideAccess: true,
    });
  }

  return payload.create({
    collection: 'users',
    data: {
      entraOid: claims.oid,
      email: claims.email,
      name: claims.name,
      tenantId: claims.tid,
      role: 'reader',
      lastLoginAt: now,
    },
    overrideAccess: true,
  });
}
