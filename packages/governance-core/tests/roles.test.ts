import { describe, expect, it } from 'vitest';
import { hasPermission, type GovernanceAction, type Role } from '../src/roles';

const ACTIONS: GovernanceAction[] = [
  'edit-metadata',
  'submit-for-review',
  'record-review',
  'decide-approval',
  'transition-lifecycle',
  'archive',
  'manage-roles',
];

describe('hasPermission', () => {
  it('reader has no governance permissions', () => {
    for (const action of ACTIONS) {
      expect(hasPermission('reader', action)).toBe(false);
    }
  });

  it('contributor may edit metadata and submit for review only', () => {
    expect(hasPermission('contributor', 'edit-metadata')).toBe(true);
    expect(hasPermission('contributor', 'submit-for-review')).toBe(true);
    expect(hasPermission('contributor', 'record-review')).toBe(false);
    expect(hasPermission('contributor', 'decide-approval')).toBe(false);
    expect(hasPermission('contributor', 'manage-roles')).toBe(false);
  });

  it('reviewer adds record-review on top of contributor permissions', () => {
    expect(hasPermission('reviewer', 'record-review')).toBe(true);
    expect(hasPermission('reviewer', 'edit-metadata')).toBe(true);
    expect(hasPermission('reviewer', 'decide-approval')).toBe(false);
    expect(hasPermission('reviewer', 'archive')).toBe(false);
  });

  it('approver adds decide-approval, transition-lifecycle, archive', () => {
    expect(hasPermission('approver', 'decide-approval')).toBe(true);
    expect(hasPermission('approver', 'transition-lifecycle')).toBe(true);
    expect(hasPermission('approver', 'archive')).toBe(true);
    expect(hasPermission('approver', 'record-review')).toBe(true);
    expect(hasPermission('approver', 'manage-roles')).toBe(false);
  });

  it('admin can do everything, including manage-roles', () => {
    const admin: Role = 'admin';
    for (const action of ACTIONS) {
      expect(hasPermission(admin, action)).toBe(true);
    }
  });
});
