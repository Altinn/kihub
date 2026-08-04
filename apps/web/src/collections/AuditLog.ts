import type { CollectionConfig } from 'payload';

/**
 * Append-only audit trail (data-model.md). Written exclusively from `afterChange` hooks on
 * `catalog-entries`/`reviews` and from the `users` role-change hook — never a direct client
 * write path (no `create` access; hook code uses `overrideAccess`). FR-012/FR-019, SC-006.
 */
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'actor', 'artifact', 'createdAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'actor', type: 'relationship', relationTo: 'users', required: true },
    {
      name: 'action',
      type: 'select',
      required: true,
      options: ['metadata-edit', 'lifecycle-transition', 'review-recorded', 'approval-decision', 'role-change'],
    },
    { name: 'artifact', type: 'relationship', relationTo: 'artifacts', index: true },
    { name: 'targetUser', type: 'relationship', relationTo: 'users' },
    { name: 'details', type: 'json' },
  ],
};
