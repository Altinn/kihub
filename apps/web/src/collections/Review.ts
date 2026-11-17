import { hasPermission, type Role } from '@kihub/governance-core';
import { APIError, type CollectionConfig } from 'payload';
import { relationshipId } from '../lib/payload-queries';

/**
 * A typed review of an artifact (data-model.md). Many per artifact — one per submission/type/
 * cycle; immutable once written (no `delete`), forming the review history (FR-014–FR-016).
 */
export const Review: CollectionConfig = {
  slug: 'reviews',
  admin: {
    useAsTitle: 'type',
    defaultColumns: ['artifact', 'type', 'reviewer', 'decision', 'expiryDate'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => hasPermission((req.user?.role as Role) ?? 'reader', 'record-review'),
    update: ({ req }) => hasPermission((req.user?.role as Role) ?? 'reader', 'record-review'),
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        if (operation === 'create') {
          data.reviewer = req.user?.id;
          data.reviewDate = new Date().toISOString();
          const artifactId = relationshipId(data.artifact);
          if (artifactId === undefined) throw new APIError('Review requires an artifact', 400);
          const artifact = await req.payload.findByID({
            collection: 'artifacts',
            id: artifactId,
            overrideAccess: true,
            depth: 0,
            req,
          });
          if (!artifact.contentDigest) {
            throw new APIError('Run discovery before reviewing this artifact; its content digest is missing', 409);
          }
          data.artifactVersion = artifact.version;
          data.artifactDigest = artifact.contentDigest;
        } else {
          data.artifactVersion = originalDoc?.artifactVersion ?? null;
          data.artifactDigest = originalDoc?.artifactDigest ?? null;
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        if (!req.user) return doc;
        await req.payload.create({
          collection: 'audit-log',
          data: {
            actor: req.user.id,
            action: 'review-recorded',
            artifact: typeof doc.artifact === 'object' ? doc.artifact.id : doc.artifact,
            details: {
              type: doc.type,
              decision: doc.decision,
              status: doc.status,
              artifactVersion: doc.artifactVersion,
              artifactDigest: doc.artifactDigest,
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
    { name: 'artifact', type: 'relationship', relationTo: 'artifacts', required: true, index: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: ['security', 'privacy-gdpr', 'technical', 'accessibility', 'responsible-ai', 'operational'],
    },
    { name: 'reviewer', type: 'relationship', relationTo: 'users' },
    { name: 'status', type: 'select', options: ['pending', 'completed'], defaultValue: 'pending' },
    { name: 'decision', type: 'select', options: ['approved', 'changes-requested', 'rejected'] },
    { name: 'comments', type: 'textarea' },
    { name: 'requiredChanges', type: 'textarea' },
    { name: 'riskLevel', type: 'select', options: ['low', 'medium', 'high'] },
    { name: 'reviewDate', type: 'date' },
    { name: 'expiryDate', type: 'date', required: true },
    {
      name: 'artifactVersion',
      type: 'text',
      admin: { readOnly: true, description: 'Artifact version reviewed (recorded server-side).' },
    },
    {
      name: 'artifactDigest',
      type: 'text',
      admin: { readOnly: true, description: 'Artifact content digest reviewed (recorded server-side).' },
    },
  ],
};
