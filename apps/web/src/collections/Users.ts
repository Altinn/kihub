import { hasPermission, type Role } from '@kihub/governance-core';
import { APIError, type CollectionConfig, type FieldAccess } from 'payload';
import { authStrategy } from '../auth/payload-strategy';
import { isEditor } from '../lib/access';

/**
 * The mapping between an Entra identity and a KI Hub user (data-model.md). No artifact content
 * lives here (Principle I). Local email/password auth is disabled; identity comes from Auth.js
 * via the custom strategy, which resolves EVERY request to a user by `entraOid`.
 *
 * Every operation is defined explicitly. Payload's default for an undefined operation is "any
 * signed-in user", which once let a Reader create Admin accounts, delete users, and take over an
 * Admin record by rewriting `entraOid` (security audit F-01, 2026-11-20).
 *
 * - `create`: nobody through the API. Users are created only by the sign-in upsert
 *   (`upsertUserFromClaims`, `overrideAccess: true`).
 * - `read`: a Reader sees only their own record; Contributor+ see all, because the back office
 *   shows and picks users in relationship fields (news author, reviewer, audit actor).
 * - `update`: own record, or any record for an Admin. Identity fields are read-only for
 *   everyone (they change only through the sign-in upsert); `role` only for an Admin
 *   (`beforeChange` guard, 403).
 * - `delete`: Admin only, logged to `audit-log`.
 */

function canManageRoles(user: { role?: unknown } | null | undefined): boolean {
  const role = user?.role as Role | undefined;
  if (!role) return false;
  try {
    return hasPermission(role, 'manage-roles');
  } catch {
    // An unknown role string is never an Admin.
    return false;
  }
}

/** Set only by the sign-in upsert (`overrideAccess: true`), never through the API. */
const identityField: { create: FieldAccess; update: FieldAccess } = {
  create: () => false,
  update: () => false,
};

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
    // Phase 6 (FR-005/FR-007): server-side admin-panel entry gate for the editor back-office.
    // Payload calls `access.admin` on the auth collection to decide who may load `/cms`.
    // Contributor+ may enter (Reviewer/Approver need it for governance actions); Reader and
    // unauthenticated are refused. Per-action authorization still comes from each collection's
    // own `access` rules. See contracts/admin-access.md.
    admin: ({ req }) => Boolean(req.user) && (req.user?.role as Role) !== 'reader',
    create: () => false,
    read: ({ req }) => {
      if (!req.user) return false;
      if (isEditor(req.user)) return true;
      return { id: { equals: req.user.id } };
    },
    update: ({ req }) => {
      if (!req.user) return false;
      if (canManageRoles(req.user)) return true;
      return { id: { equals: req.user.id } };
    },
    delete: ({ req }) => canManageRoles(req.user),
  },
  hooks: {
    beforeChange: [
      ({ data, req, originalDoc, operation }) => {
        // The `role` control (see the field). Only a real role CHANGE is gated; checking
        // `operation` because `originalDoc` on create is not reliably `undefined`.
        if (
          operation === 'update' &&
          originalDoc?.role !== undefined &&
          data.role !== undefined &&
          data.role !== originalDoc.role
        ) {
          if (!canManageRoles(req.user)) {
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
    afterDelete: [
      async ({ doc, req }) => {
        // The deleted row cannot be a `targetUser` (FK), so its identity goes into `details`.
        // A delete without a user (scripts, tests with `overrideAccess`) has no actor to record.
        if (!req.user || req.user.id === doc.id) return doc;
        await req.payload.create({
          collection: 'audit-log',
          data: {
            actor: req.user.id,
            action: 'user-delete',
            details: {
              id: doc.id,
              email: doc.email,
              entraOid: doc.entraOid,
              role: doc.role,
            },
          },
          overrideAccess: true,
          req,
        });
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
      // The Payload auth strategy maps the session to the user by this value: editable, it
      // would let anyone move their session onto another record.
      access: identityField,
    },
    // With the local strategy disabled Payload does not auto-add `email`, so declare it.
    { name: 'email', type: 'email', required: true, unique: true, index: true, access: identityField },
    { name: 'name', type: 'text' },
    { name: 'tenantId', type: 'text', label: 'Home tenant id', access: identityField },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'reader',
      options: ['reader', 'contributor', 'reviewer', 'approver', 'admin'],
      // No field-level `access` here on purpose: Payload applies it BEFORE the collection hook
      // and silently drops the value, so a non-Admin would get a 200 with no change instead of
      // the hook's 403. The `beforeChange` guard is the role control.
    },
    { name: 'lastLoginAt', type: 'date', access: identityField },
  ],
};
