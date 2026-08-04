export type Role = 'reader' | 'contributor' | 'reviewer' | 'approver' | 'admin';

export type GovernanceAction =
  | 'edit-metadata'
  | 'submit-for-review'
  | 'record-review'
  | 'decide-approval'
  | 'transition-lifecycle'
  | 'archive'
  | 'manage-roles';

/** FR-002: Reader=none; Contributor=+edit/submit; Reviewer=+record-review; Approver=+decide/transition/archive; Admin=all. */
const PERMISSIONS: Record<Role, readonly GovernanceAction[]> = {
  reader: [],
  contributor: ['edit-metadata', 'submit-for-review'],
  reviewer: ['edit-metadata', 'submit-for-review', 'record-review'],
  approver: [
    'edit-metadata',
    'submit-for-review',
    'record-review',
    'decide-approval',
    'transition-lifecycle',
    'archive',
  ],
  admin: [
    'edit-metadata',
    'submit-for-review',
    'record-review',
    'decide-approval',
    'transition-lifecycle',
    'archive',
    'manage-roles',
  ],
};

/** Pure permission-matrix lookup (contracts/governance-core.md). No I/O. */
export function hasPermission(role: Role, action: GovernanceAction): boolean {
  return PERMISSIONS[role].includes(action);
}
