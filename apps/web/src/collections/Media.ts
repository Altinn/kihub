import type { Role } from '@kihub/governance-core';
import type { CollectionConfig } from 'payload';

/**
 * 014 — Media: KI Hub's FIRST managed upload collection (contracts/media-storage.md §A).
 *
 * A general platform capability, but learning pages are its only consumer today. Migrating News's
 * `heroImageUrl` text field to managed uploads is explicitly out of scope — the two mechanisms
 * coexist (spec Assumption 5).
 *
 * Constitution v3.1.0 makes media uploaded for native content Payload-owned data (Principle II).
 *
 * `alt` is the only field. There is deliberately no `caption`: nothing requires one, and a caption is
 * the paragraph beneath the image, which the rich text already handles (data-model.md).
 */
function isEditor(user: { role?: unknown } | null | undefined): boolean {
  return Boolean(user) && (user?.role as Role) !== 'reader';
}

/** 5 MB. Generous for a screenshot or diagram, small enough to keep pages light (FR-022). */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Mediefil', plural: 'Mediefiler' },
  admin: {
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'updatedAt'],
    group: 'KI Læring',
  },
  access: {
    // An image referenced by a published learning page must be fetchable by every employee.
    read: () => true,
    create: ({ req }) => isEditor(req.user),
    update: ({ req }) => isEditor(req.user),
    delete: ({ req }) => isEditor(req.user),
  },
  upload: {
    // Raster only. SVG is deliberately absent: it is a script-capable document that would be served
    // from the portal's own origin (FR-022, spec Assumption 6).
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/avif'],
    // Two sizes, both at the reading column's width (FR-023). `sharp` is already a dependency.
    imageSizes: [
      { name: 'content', width: 760, withoutEnlargement: true },
      { name: 'content2x', width: 1520, withoutEnlargement: true },
    ],
    // The admin list reuses the `content` size rather than generating a third derivative of every
    // upload (data-model.md).
    adminThumbnail: 'content',
    focalPoint: false,
    crop: false,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Alternativ tekst',
      admin: {
        description:
          'Beskriv bildet for dem som ikke ser det. Er bildet rent dekorativt, kryss av «Dekorativt bilde» der du setter det inn i teksten.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        // FR-022 — refuse an oversized upload with a Norwegian message.
        //
        // This runs in `beforeChange`, not `beforeValidate`, and reads `data.filesize` rather than
        // `req.file`: Payload's `generateFileData` populates the file metadata onto `data` before the
        // change hooks, whereas `req.file` is only set on the HTTP upload path — so a `beforeValidate`
        // guard reading `req.file` silently passes everything through the local API (verified).
        const size = typeof data?.filesize === 'number' ? data.filesize : req.file?.size;

        if (typeof size === 'number' && size > MAX_UPLOAD_BYTES) {
          throw new Error(
            `Filen er for stor (${(size / 1024 / 1024).toFixed(1)} MB). Maks størrelse er 5 MB.`,
          );
        }
        return data;
      },
    ],
  },
};
