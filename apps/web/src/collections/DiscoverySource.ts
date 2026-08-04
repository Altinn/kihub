import type { Role } from '@kihub/governance-core';
import type { CollectionConfig } from 'payload';

const isAdmin = (role: Role | undefined) => role === 'admin';

/**
 * A configured connection to an artifact repository on GitHub that discovery scans
 * (data-model.md). Admin-managed operational metadata only — never artifact content (Principle II).
 * Replaces the single local-checkout path used in Phase 2.
 *
 * Secrets: the GitHub fetch token is NOT stored here — only `tokenEnvVar`, the name of the env var
 * holding it (research §5). The `webhookSecret` is stored but hidden and server-read-only; it is
 * used solely for HMAC verification and is never returned to a client or written into a run.
 */
export const DiscoverySource: CollectionConfig = {
  slug: 'discovery-sources',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'repo', 'enabled', 'lastRunAt', 'lastRunOutcome'],
  },
  access: {
    read: ({ req }) => isAdmin(req.user?.role as Role | undefined),
    create: ({ req }) => isAdmin(req.user?.role as Role | undefined),
    update: ({ req }) => isAdmin(req.user?.role as Role | undefined),
    delete: ({ req }) => isAdmin(req.user?.role as Role | undefined),
  },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true, index: true },
    { name: 'repo', type: 'text', required: true, label: 'owner/repo' },
    { name: 'ref', type: 'text', defaultValue: 'main' },
    {
      name: 'tokenEnvVar',
      type: 'text',
      required: true,
      label: 'Fetch token env var name',
      admin: { description: 'Name of the env var holding the GitHub token (value never stored here).' },
    },
    {
      name: 'webhookSecret',
      type: 'text',
      required: true,
      // Server-only: never returned by the API, never shown in admin (research §5).
      access: { read: () => false },
      admin: { hidden: true },
    },
    { name: 'enabled', type: 'checkbox', defaultValue: true, index: true },
    {
      name: 'runningSince',
      type: 'date',
      admin: { readOnly: true, description: 'Per-source run lock; set while a run is in progress.' },
    },
    { name: 'lastRunAt', type: 'date', admin: { readOnly: true } },
    {
      name: 'lastRunOutcome',
      type: 'select',
      options: ['success', 'failure'],
      admin: { readOnly: true },
    },
    {
      name: 'lastRunSummary',
      type: 'group',
      admin: { readOnly: true },
      fields: [
        { name: 'created', type: 'number' },
        { name: 'updated', type: 'number' },
        { name: 'deactivated', type: 'number' },
        { name: 'skippedInvalid', type: 'number' },
      ],
    },
  ],
};
