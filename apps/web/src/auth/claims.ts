/**
 * The identity claims KI Hub needs, normalized from whichever provider established
 * the sign-in (real Microsoft Entra ID or the dev mock). Both providers MUST populate
 * the same shape so `employeeGate` and the Users upsert behave identically (research.md §3).
 */
export interface IdentityClaims {
  /** Entra Object ID (`oid`) — stable per-user key. */
  oid: string;
  email: string;
  name: string;
  /** Home tenant id (`tid`). */
  tid: string;
  /**
   * Identity type. For home-tenant members this is absent/"member"; guest/external
   * (B2B) accounts are marked "guest". Mirrors the Entra `idtyp`/account-type signal.
   */
  idtyp?: 'member' | 'guest';
}

/**
 * Dev-only mock personas. Selected in the sign-in UI when AUTH_MODE=mock. Each emits the
 * same claim shape Entra would, so the whole downstream pipeline is genuinely exercised
 * without a real tenant. `member` is allowed; `guest` and `foreign-tenant` are denied.
 */
export type MockPersona = 'member' | 'guest' | 'foreign-tenant';

const ORG_TENANT_ID = process.env.ORG_TENANT_ID ?? '00000000-0000-0000-0000-000000000000';
const FOREIGN_TENANT_ID = '11111111-1111-1111-1111-111111111111';

export const PERSONA_CLAIMS: Record<MockPersona, IdentityClaims> = {
  member: {
    oid: 'mock-oid-member-0001',
    email: 'ada.employee@digdir.no',
    name: 'Ada Employee',
    tid: ORG_TENANT_ID,
    idtyp: 'member',
  },
  guest: {
    oid: 'mock-oid-guest-0002',
    email: 'guest.consultant@external.example',
    name: 'Guest Consultant',
    tid: ORG_TENANT_ID,
    idtyp: 'guest',
  },
  'foreign-tenant': {
    oid: 'mock-oid-foreign-0003',
    email: 'someone@othertenant.example',
    name: 'Other Tenant User',
    tid: FOREIGN_TENANT_ID,
    idtyp: 'member',
  },
};

export const ORG_TENANT = ORG_TENANT_ID;
