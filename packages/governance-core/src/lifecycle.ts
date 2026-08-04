import type { Role } from './roles';

export type LifecycleState =
  | 'draft'
  | 'experimental'
  | 'in-review'
  | 'approved'
  | 'recommended'
  | 'deprecated'
  | 'archived';

export interface TransitionResult {
  allowed: boolean;
  /** Present when `allowed` is false. */
  reason?: 'invalid-transition' | 'role-not-permitted';
}

/** All seven lifecycle states — lets callers (e.g. UI) enumerate candidates via `canTransition`. */
export const LIFECYCLE_STATES: readonly LifecycleState[] = [
  'draft',
  'experimental',
  'in-review',
  'approved',
  'recommended',
  'deprecated',
  'archived',
];

/** Strict linear order (data-model.md) — no skipping stages. */
const LINEAR_ORDER: readonly LifecycleState[] = [
  'draft',
  'experimental',
  'in-review',
  'approved',
  'recommended',
];

const TERMINAL_STATES: readonly LifecycleState[] = ['deprecated', 'archived'];

/** Roles permitted to perform each linear step (data-model.md transition matrix). */
const STEP_ROLES: Record<string, readonly Role[]> = {
  'draft->experimental': ['contributor', 'reviewer', 'approver', 'admin'],
  'experimental->in-review': ['contributor', 'reviewer', 'approver', 'admin'],
  'in-review->approved': ['approver', 'admin'],
  'approved->recommended': ['approver', 'admin'],
};

/**
 * Pure check against the clarified transition matrix (data-model.md). No I/O.
 *
 * Linear steps (draft→experimental→in-review→approved→recommended) must be taken in order,
 * one at a time; `deprecated`/`archived` are reachable from any non-terminal state for an
 * Approver or Admin. There is no path back out of a terminal state.
 */
export function canTransition(from: LifecycleState, to: LifecycleState, role: Role): TransitionResult {
  if (from === to) {
    return { allowed: false, reason: 'invalid-transition' };
  }

  if (TERMINAL_STATES.includes(to)) {
    if (TERMINAL_STATES.includes(from)) {
      return { allowed: false, reason: 'invalid-transition' };
    }
    return role === 'approver' || role === 'admin'
      ? { allowed: true }
      : { allowed: false, reason: 'role-not-permitted' };
  }

  const fromIndex = LINEAR_ORDER.indexOf(from);
  const toIndex = LINEAR_ORDER.indexOf(to);
  if (fromIndex === -1 || toIndex !== fromIndex + 1) {
    return { allowed: false, reason: 'invalid-transition' };
  }

  const allowedRoles = STEP_ROLES[`${from}->${to}`] ?? [];
  return allowedRoles.includes(role)
    ? { allowed: true }
    : { allowed: false, reason: 'role-not-permitted' };
}
