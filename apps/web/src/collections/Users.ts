import type { CollectionConfig } from 'payload';
import { authStrategy } from '../auth/payload-strategy';

/**
 * The only populated Payload collection in Phase 1 — the mapping between an Entra identity
 * and a KI Hub user (data-model.md). No artifact content lives here (Principle I).
 * Local email/password auth is disabled; identity comes from Auth.js via the custom strategy.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    disableLocalStrategy: true,
    strategies: [authStrategy],
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role', 'lastLoginAt'],
  },
  fields: [
    {
      name: 'entraOid',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Entra Object ID',
    },
    // With the local strategy disabled Payload does not auto-add `email`, so declare it.
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    { name: 'name', type: 'text' },
    { name: 'tenantId', type: 'text', label: 'Home tenant id' },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'reader',
      // Full set reserved for the governance phase; only `reader` is assigned in Phase 1 (FR-006).
      options: ['reader', 'contributor', 'reviewer', 'approver', 'admin'],
    },
    { name: 'lastLoginAt', type: 'date' },
  ],
};
