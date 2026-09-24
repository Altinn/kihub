import type { Role } from '@kihub/governance-core';
import type { CollectionConfig } from 'payload';
import { resolveMediaSelfFetchAllowList } from '../lib/media-storage';

/**
 * 014 — Media: KI Hub's FIRST managed upload collection (contracts/media-storage.md §A).
 *
 * A shared library: learning pages embed it in rich text (014) and news articles use it as their
 * hero image (020, `News.heroImage`). 020 turned on Payload's built-in focal point + crop so editors
 * control how an image is framed on news cards; both apply to every place the image is used
 * (specs/020-news-hero-media/research.md R2). News's legacy `heroImageUrl` text field still coexists
 * as a fallback.
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
    // 020 R9 — no group: the library is shared by news and KI Læring, not owned by either.
    description:
      'Bilder brukt i nyheter og KI Læring. Fokuspunkt og beskjæring gjelder overalt der bildet brukes.',
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
    // Reading-column sizes (014 FR-023) plus 16:10 news-card sizes framed on the focal point (020).
    // `sharp` is already a dependency.
    //
    // `withoutEnlargement: true` MUST stay explicit on the card sizes. Left undefined, Payload only
    // skips a size when the original is smaller on BOTH axes; an original short on ONE axis (a
    // 3000x900 banner vs 1600x1000) goes through `resizeWithFocalPoint`, which scales it UP. With it
    // set, such originals take a plain non-enlarging resize instead, which may not come out exactly
    // 16:10 — `pickCardImage` detects that and falls back (020 research R3/R4).
    imageSizes: [
      { name: 'content', width: 760, withoutEnlargement: true },
      { name: 'content2x', width: 1520, withoutEnlargement: true },
      { name: 'card', width: 800, height: 500, withoutEnlargement: true },
      { name: 'card2x', width: 1600, height: 1000, withoutEnlargement: true },
    ],
    // The admin list reuses the `content` size rather than generating a third derivative of every
    // upload (data-model.md).
    adminThumbnail: 'content',
    // 020 — the built-in image editor. Focal point only reframes the derived sizes; crop replaces the
    // stored file itself (research R2).
    focalPoint: true,
    crop: true,
    // 020 R6 — re-framing an already-saved image makes Payload re-fetch the original. In azure mode
    // that is an HTTP fetch of our own public `/payload-api/media/file/*` route, which the default SSRF guard
    // may refuse; this allow-lists exactly that host + route and nothing else. `undefined` (disk
    // mode, or no MEDIA_PUBLIC_HOSTNAME) keeps Payload's default.
    skipSafeFetch: resolveMediaSelfFetchAllowList(),
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Alternativ tekst',
      admin: {
        description:
          'Beskriv bildet for dem som ikke ser det. Er bildet rent dekorativt, kryss av «Dekorativt bilde» der du setter det inn i teksten. Fokuspunkt og beskjæring du setter på bildet, gjelder overalt der bildet brukes.',
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
