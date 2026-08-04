import { ORG_TENANT, type IdentityClaims } from './claims';

export interface GateResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Employees-only gate (FR-002, contracts/auth-gating.md). Pure over its claims input.
 *
 * Allow ONLY when the identity is a member of the organization's own home tenant.
 * Deny guests/external (B2B) accounts, identities from other tenants, and any identity
 * missing the required identifying claims.
 */
export function employeeGate(claims: Partial<IdentityClaims> | null | undefined): GateResult {
  if (!claims) return { allowed: false, reason: 'no-claims' };

  if (!claims.oid || !claims.email) {
    return { allowed: false, reason: 'missing-identifying-claims' };
  }
  if (claims.tid !== ORG_TENANT) {
    return { allowed: false, reason: 'foreign-tenant' };
  }
  if (claims.idtyp === 'guest') {
    return { allowed: false, reason: 'guest-account' };
  }
  return { allowed: true };
}
