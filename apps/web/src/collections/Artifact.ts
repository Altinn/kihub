import { LIFECYCLE_STATUSES, VISIBILITIES } from '@kihub/artifact-schema';
import type { CollectionConfig } from 'payload';
import { artifactTypeOptions } from '../lib/registry-view';

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
    // Norwegian labels in /cms too — same map as the employee-facing UI (015 FR-010).
    { name: 'type', type: 'select', required: true, options: artifactTypeOptions() },
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
    // 015: which discovery source registered/last saw this artifact (ownership-by-last-sighting).
    // Nullable: legacy/unowned rows are excluded from every deactivation and adoptable by any scan.
    // Deliberately NOT named `source` — that group above is the manifest's own source metadata.
    {
      name: 'discoverySource',
      type: 'relationship',
      relationTo: 'discovery-sources',
      hasMany: false,
      index: true,
    },
    // 015: verbatim A2A v1.0 agent card snapshot (agents only) — indexed metadata like `readme`,
    // refreshed by every scan of the owning source and cleared when the card is missing/invalid.
    { name: 'agentCard', type: 'json' },
  ],
};
