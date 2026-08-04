import { canTransition, hasPermission, type LifecycleState, type Role } from '@kihub/governance-core';
import { APIError, type CollectionConfig } from 'payload';

/**
 * The governance record (data-model.md) — enterprise metadata for one artifact, separate from
 * the Phase 2 technical `Artifact` record but keyed by a relationship to it (Principle IV: the
 * Artifact's own stable `artifactId` is never re-derived here). Created lazily by
 * `lib/governance.ts` (research.md §6) — never by the Phase 2 indexer.
 */
export const CatalogEntry: CollectionConfig = {
  slug: 'catalog-entries',
  admin: {
    useAsTitle: 'lifecycleState',
    defaultColumns: ['artifact', 'lifecycleState', 'approvalState', 'updatedBy', 'updatedAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => hasPermission((req.user?.role as Role) ?? 'reader', 'edit-metadata'),
    update: ({ req }) => hasPermission((req.user?.role as Role) ?? 'reader', 'edit-metadata'),
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      ({ data, req, originalDoc }) => {
        data.updatedBy = req.user?.id;

        const nextLifecycle = data.lifecycleState as LifecycleState | undefined;
        const previousLifecycle = originalDoc?.lifecycleState as LifecycleState | undefined;
        if (nextLifecycle && previousLifecycle && nextLifecycle !== previousLifecycle) {
          const role = (req.user?.role as Role) ?? 'reader';
          const result = canTransition(previousLifecycle, nextLifecycle, role);
          if (!result.allowed) {
            throw new APIError(
              `Lifecycle transition ${previousLifecycle} -> ${nextLifecycle} rejected: ${result.reason}`,
              400,
            );
          }
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (!req.user) return doc;
        const lifecycleChanged =
          operation === 'update' && previousDoc && doc.lifecycleState !== previousDoc.lifecycleState;
        const approvalChanged =
          operation === 'update' && previousDoc && doc.approvalState !== previousDoc.approvalState;
        const action = lifecycleChanged
          ? 'lifecycle-transition'
          : approvalChanged
            ? 'approval-decision'
            : 'metadata-edit';
        const details = lifecycleChanged
          ? { from: previousDoc?.lifecycleState, to: doc.lifecycleState }
          : approvalChanged
            ? { from: previousDoc?.approvalState, to: doc.approvalState }
            : { operation };
        await req.payload.create({
          collection: 'audit-log',
          data: {
            actor: req.user.id,
            action,
            artifact: typeof doc.artifact === 'object' ? doc.artifact.id : doc.artifact,
            details,
          },
          overrideAccess: true,
          req,
        });
        return doc;
      },
    ],
  },
  fields: [
    { name: 'artifact', type: 'relationship', relationTo: 'artifacts', required: true, unique: true, index: true },
    { name: 'businessOwner', type: 'text' },
    { name: 'technicalOwner', type: 'text' },
    { name: 'riskLevel', type: 'select', options: ['low', 'medium', 'high'] },
    {
      name: 'reviewStatus',
      type: 'select',
      options: ['not-submitted', 'in-review'],
      defaultValue: 'not-submitted',
    },
    {
      name: 'approvalState',
      type: 'select',
      options: ['not-approved', 'approved', 'rejected'],
      defaultValue: 'not-approved',
    },
    {
      name: 'lifecycleState',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: ['draft', 'experimental', 'in-review', 'approved', 'recommended', 'deprecated', 'archived'],
    },
    { name: 'recommended', type: 'checkbox', defaultValue: false },
    { name: 'featured', type: 'checkbox', defaultValue: false },
    { name: 'internalNotes', type: 'textarea' },
    { name: 'updatedBy', type: 'relationship', relationTo: 'users' },
  ],
};
