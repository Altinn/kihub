import { ARTIFACT_TYPES, LIFECYCLE_STATUSES, VISIBILITIES } from '@kihub/artifact-schema';
import type { CollectionConfig } from 'payload';

/**
 * Indexed technical metadata for one artifact (data-model.md), keyed by the stable `artifactId`.
 * Populated/reconciled by the indexer (never hand-authored this phase). Holds metadata + a README
 * snapshot only — never an artifact body (Principle I). Governance metadata is deferred to Phase 3.
 */
export const Artifact: CollectionConfig = {
  slug: 'artifacts',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['artifactId', 'type', 'version', 'active', 'lastIndexedAt'],
  },
  access: {
    // Read: any authenticated (employee-gated) user. Write: server-side only (indexer overrideAccess).
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'artifactId', type: 'text', required: true, unique: true, index: true },
    { name: 'type', type: 'select', required: true, options: [...ARTIFACT_TYPES] },
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'text', required: true },
    { name: 'version', type: 'text', required: true },
    {
      name: 'owner',
      type: 'group',
      fields: [
        { name: 'team', type: 'text' },
        { name: 'contact', type: 'text' },
      ],
    },
    {
      name: 'source',
      type: 'group',
      fields: [
        { name: 'provider', type: 'text' },
        { name: 'repository', type: 'text' },
        { name: 'path', type: 'text' },
      ],
    },
    { name: 'installCommand', type: 'text' },
    { name: 'readme', type: 'textarea' },
    { name: 'tags', type: 'text', hasMany: true },
    { name: 'visibility', type: 'select', options: [...VISIBILITIES] },
    { name: 'lifecycleStatus', type: 'select', options: [...LIFECYCLE_STATUSES] },
    { name: 'active', type: 'checkbox', defaultValue: true, index: true },
    { name: 'lastIndexedAt', type: 'date' },
  ],
};
