import { hasPermission, type Role } from '@kihub/governance-core';
import { APIError, type CollectionConfig } from 'payload';
import { authStrategy } from '../auth/payload-strategy';

/**
 * The only populated Payload collection in Phase 1 — the mapping between an Entra identity
 * and a KI Hub user (data-model.md). No artifact content lives here (Principle I).
 * Local email/password auth is disabled; identity comes from Auth.js via the custom strategy.
 *
 * Phase 3 (FR-004): a user may update their own non-`role` fields; only an Admin may change
 * anyone's `role` (checked in `access.update` for the record scope, and again in `beforeChange`
 * as a field-level guard since `access.update` alone can't see which field changed).
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
  access: {
    update: ({ req }) => {
      if (!req.user) return false;
      if (hasPermission(req.user.role as Role, 'manage-roles')) return true;
      return { id: { equals: req.user.id } };
    },
  },
  hooks: {
    beforeChange: [
      ({ data, req, originalDoc, operation }) => {
        // Only a real update that changes an existing role is gated — `originalDoc` on create
        // is not reliably `undefined` across Payload versions, so check `operation` explicitly.
        if (
          operation === 'update' &&
          originalDoc?.role !== undefined &&
          data.role !== undefined &&
          data.role !== originalDoc.role
        ) {
          if (!hasPermission((req.user?.role as Role) ?? 'reader', 'manage-roles')) {
            throw new APIError("Only an Admin may change a user's role", 403);
          }
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'update' && previousDoc && doc.role !== previousDoc.role && req.user) {
          await req.payload.create({
            collection: 'audit-log',
            data: {
              actor: req.user.id,
              action: 'role-change',
              targetUser: doc.id,
              details: { from: previousDoc.role, to: doc.role },
            },
            overrideAccess: true,
            req,
          });
        }
        return doc;
      },
    ],
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
