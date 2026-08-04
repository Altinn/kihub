import type { Role } from '@kihub/governance-core';
import { describe, expect, it } from 'vitest';
import { Users } from '@/collections/Users';

/**
 * T007 (US2, FR-005) — the back-office admin-panel entry gate. Payload calls
 * `Users.access.admin` on the auth collection to decide whether a signed-in user may load
 * `/cms`. Contributor+ may enter (Reviewer/Approver need it for governance work); Reader and
 * unauthenticated are refused. This is the server-side gate, not a UI hint.
 */
const adminGate = Users.access?.admin;

function canEnter(role: Role | null): boolean {
  const req = { user: role ? { id: 1, role } : null };
  // The gate is synchronous; cast the minimal req shape Payload passes at admin-entry time.
  return adminGate!({ req } as never) as boolean;
}

describe('Users.access.admin — back-office entry gate (FR-005)', () => {
  it('is defined on the Users collection', () => {
    expect(typeof adminGate).toBe('function');
  });

  it('allows Contributor, Reviewer, Approver, and Admin', () => {
    for (const role of ['contributor', 'reviewer', 'approver', 'admin'] as Role[]) {
      expect(canEnter(role)).toBe(true);
    }
  });

  it('denies a Reader', () => {
    expect(canEnter('reader')).toBe(false);
  });

  it('denies an unauthenticated request', () => {
    expect(canEnter(null)).toBe(false);
  });
});
