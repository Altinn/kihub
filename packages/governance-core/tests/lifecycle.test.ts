import { describe, expect, it } from 'vitest';
import { canTransition, type LifecycleState } from '../src/lifecycle';

describe('canTransition (T016)', () => {
  it('allows each linear step for a sufficiently privileged role', () => {
    expect(canTransition('draft', 'experimental', 'contributor')).toEqual({ allowed: true });
    expect(canTransition('experimental', 'in-review', 'contributor')).toEqual({ allowed: true });
    expect(canTransition('in-review', 'approved', 'approver')).toEqual({ allowed: true });
    expect(canTransition('approved', 'recommended', 'approver')).toEqual({ allowed: true });
  });

  it('rejects skipping a stage', () => {
    expect(canTransition('draft', 'in-review', 'admin')).toEqual({
      allowed: false,
      reason: 'invalid-transition',
    });
    expect(canTransition('draft', 'approved', 'admin')).toEqual({
      allowed: false,
      reason: 'invalid-transition',
    });
  });

  it('rejects a linear step attempted by a role below the gate', () => {
    expect(canTransition('in-review', 'approved', 'contributor')).toEqual({
      allowed: false,
      reason: 'role-not-permitted',
    });
    expect(canTransition('experimental', 'in-review', 'reader')).toEqual({
      allowed: false,
      reason: 'role-not-permitted',
    });
  });

  it('allows Deprecated/Archived from any non-terminal state for Approver/Admin', () => {
    const states: LifecycleState[] = ['draft', 'experimental', 'in-review', 'approved', 'recommended'];
    for (const from of states) {
      expect(canTransition(from, 'deprecated', 'approver')).toEqual({ allowed: true });
      expect(canTransition(from, 'archived', 'admin')).toEqual({ allowed: true });
    }
  });

  it('rejects Deprecated/Archived for roles below Approver', () => {
    expect(canTransition('draft', 'deprecated', 'contributor')).toEqual({
      allowed: false,
      reason: 'role-not-permitted',
    });
    expect(canTransition('recommended', 'archived', 'reviewer')).toEqual({
      allowed: false,
      reason: 'role-not-permitted',
    });
  });

  it('rejects transitioning out of a terminal state', () => {
    expect(canTransition('archived', 'draft', 'admin')).toEqual({
      allowed: false,
      reason: 'invalid-transition',
    });
    expect(canTransition('deprecated', 'recommended', 'admin')).toEqual({
      allowed: false,
      reason: 'invalid-transition',
    });
  });

  it('rejects a no-op transition', () => {
    expect(canTransition('draft', 'draft', 'admin')).toEqual({
      allowed: false,
      reason: 'invalid-transition',
    });
  });
});
