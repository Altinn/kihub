import { canTransition, hasPermission, type LifecycleState, type Role } from '@kihub/governance-core';
import { APIError, type CollectionConfig } from 'payload';

function relationshipId(value: unknown): number | string | undefined {
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'number' || typeof id === 'string') return id;
  }
  return undefined;
}

/** Governance metadata keyed to one stable artifact, with revision-bound approval decisions. */
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
      async ({ data, req, originalDoc, operation }) => {
        data.updatedBy = req.user?.id;

        const artifactId = relationshipId(data.artifact ?? originalDoc?.artifact);
        let artifactCache: { version: string; contentDigest?: string | null } | undefined;
        const loadArtifact = async () => {
          if (artifactId === undefined) throw new APIError('Catalog entry requires an artifact', 400);
          artifactCache ??= (await req.payload.findByID({
              collection: 'artifacts',
              id: artifactId,
              overrideAccess: true,
              depth: 0,
            })) as { version: string; contentDigest?: string | null };
          return artifactCache;
        };

        const previousApproval = originalDoc?.approvalState ?? 'not-approved';
        const nextApproval = data.approvalState ?? previousApproval;
        const reapproveRequested = operation === 'update' && data.reapproveCurrentRevision === true;
        const approvalChanged =
          (operation === 'create' && nextApproval !== 'not-approved') ||
          (operation === 'update' && data.approvalState !== undefined && nextApproval !== previousApproval);
        const approvalDecisionRequested = approvalChanged || reapproveRequested;

        if (reapproveRequested && nextApproval !== 'approved') {
          throw new APIError('Only an approved decision can be refreshed for the current artifact revision', 400);
        }
        if (
          approvalDecisionRequested &&
          req.user &&
          !hasPermission((req.user.role as Role) ?? 'reader', 'decide-approval')
        ) {
          throw new APIError('Only an Approver or Admin may record an approval decision', 403);
        }

        if (approvalDecisionRequested && (nextApproval === 'approved' || nextApproval === 'rejected')) {
          const artifact = await loadArtifact();
          if (!artifact.contentDigest) {
            throw new APIError(
              'Run discovery before deciding approval; this artifact has no content digest',
              409,
            );
          }
          data.approvalArtifactVersion = artifact.version;
          data.approvalArtifactDigest = artifact.contentDigest;
          data.approvalDecidedAt = new Date().toISOString();
        } else if (approvalChanged && nextApproval === 'not-approved') {
          data.approvalArtifactVersion = null;
          data.approvalArtifactDigest = null;
          data.approvalDecidedAt = null;
        } else {
          // Snapshot fields are server-controlled. Unrelated edits preserve the previous decision.
          data.approvalArtifactVersion = originalDoc?.approvalArtifactVersion ?? null;
          data.approvalArtifactDigest = originalDoc?.approvalArtifactDigest ?? null;
          data.approvalDecidedAt = originalDoc?.approvalDecidedAt ?? null;
        }
        // Virtual one-shot control: never echo a checked value back into the edit form.
        data.reapproveCurrentRevision = false;

        const nextLifecycle = (data.lifecycleState ?? originalDoc?.lifecycleState) as
          | LifecycleState
          | undefined;
        const previousLifecycle = originalDoc?.lifecycleState as LifecycleState | undefined;
        const lifecycleChanged =
          Boolean(nextLifecycle) && Boolean(previousLifecycle) && nextLifecycle !== previousLifecycle;
        if (lifecycleChanged && nextLifecycle && previousLifecycle) {
          const role = (req.user?.role as Role) ?? 'reader';
          const result = canTransition(previousLifecycle, nextLifecycle, role);
          if (!result.allowed) {
            throw new APIError(
              `Lifecycle transition ${previousLifecycle} -> ${nextLifecycle} rejected: ${result.reason}`,
              400,
            );
          }
        }

        const promotingToGovernedState =
          (operation === 'create' || lifecycleChanged) &&
          (nextLifecycle === 'approved' || nextLifecycle === 'recommended');
        const recommendationRaised = data.recommended === true && originalDoc?.recommended !== true;
        if (promotingToGovernedState || recommendationRaised) {
          const artifact = await loadArtifact();
          const approvalCurrent =
            nextApproval === 'approved' &&
            Boolean(artifact.contentDigest) &&
            data.approvalArtifactVersion === artifact.version &&
            data.approvalArtifactDigest === artifact.contentDigest;
          if (!approvalCurrent) {
            throw new APIError(
              'The current artifact revision must be approved before it can be Approved, Recommended, or marked recommended',
              409,
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
          (operation === 'update' && previousDoc && doc.approvalState !== previousDoc.approvalState) ||
          (operation === 'update' &&
            previousDoc &&
            (doc.approvalArtifactVersion !== previousDoc.approvalArtifactVersion ||
              doc.approvalArtifactDigest !== previousDoc.approvalArtifactDigest)) ||
          (operation === 'create' && doc.approvalState !== 'not-approved');
        const action = lifecycleChanged
          ? 'lifecycle-transition'
          : approvalChanged
            ? 'approval-decision'
            : 'metadata-edit';
        const details = lifecycleChanged
          ? { from: previousDoc?.lifecycleState, to: doc.lifecycleState }
          : approvalChanged
            ? {
                from: previousDoc?.approvalState ?? 'not-approved',
                to: doc.approvalState,
                artifactVersion: doc.approvalArtifactVersion,
                artifactDigest: doc.approvalArtifactDigest,
                decidedAt: doc.approvalDecidedAt,
              }
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
      admin: {
        condition: (_data, _siblingData, { user }) =>
          hasPermission((user?.role as Role) ?? 'reader', 'decide-approval'),
      },
    },
    {
      name: 'approvalArtifactVersion',
      type: 'text',
      admin: { readOnly: true, description: 'Artifact version covered by the current decision.' },
    },
    {
      name: 'approvalArtifactDigest',
      type: 'text',
      admin: { readOnly: true, description: 'Artifact content digest covered by the current decision.' },
    },
    { name: 'approvalDecidedAt', type: 'date', admin: { readOnly: true } },
    {
      name: 'reapproveCurrentRevision',
      type: 'checkbox',
      virtual: true,
      admin: {
        condition: (_data, _siblingData, { user }) =>
          hasPermission((user?.role as Role) ?? 'reader', 'decide-approval'),
        description:
          'One-shot: record a fresh Approved decision for the artifact’s current version and content digest.',
      },
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
