import type { Role } from '@kihub/governance-core';
import type { CollectionConfig } from 'payload';

const isAdmin = (role: Role | undefined) => role === 'admin';

/**
 * Append-only record of one discovery execution — the observability/audit history (data-model.md,
 * FR-010). Written exclusively by `lib/discovery.ts::runDiscovery` via `overrideAccess`; there is
 * no client create path and runs are immutable once written. No secret material ever appears here.
 */
export const DiscoveryRun: CollectionConfig = {
  slug: 'discovery-runs',
  admin: {
    useAsTitle: 'startedAt',
    defaultColumns: ['source', 'trigger', 'outcome', 'startedAt', 'finishedAt'],
  },
  access: {
    read: ({ req }) => isAdmin(req.user?.role as Role | undefined),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'source', type: 'relationship', relationTo: 'discovery-sources', required: true, index: true },
    { name: 'trigger', type: 'select', required: true, options: ['webhook', 'scheduled', 'manual'] },
    { name: 'triggeredBy', type: 'relationship', relationTo: 'users' },
    { name: 'startedAt', type: 'date', required: true },
    { name: 'finishedAt', type: 'date' },
    { name: 'outcome', type: 'select', required: true, options: ['success', 'failure'] },
    { name: 'failureReason', type: 'text' },
    {
      name: 'summary',
      type: 'group',
      fields: [
        { name: 'created', type: 'number' },
        { name: 'updated', type: 'number' },
        { name: 'deactivated', type: 'number' },
        { name: 'duplicates', type: 'number' },
        { name: 'skippedInvalid', type: 'number' },
      ],
    },
    { name: 'createdIds', type: 'text', hasMany: true },
    { name: 'updatedIds', type: 'text', hasMany: true },
    { name: 'deactivatedIds', type: 'text', hasMany: true },
    {
      name: 'skippedInvalid',
      type: 'array',
      fields: [
        { name: 'path', type: 'text' },
        { name: 'errors', type: 'text', hasMany: true },
      ],
    },
  ],
};
