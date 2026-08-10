import type { Media } from '@/payload-types';

/**
 * 014 US3 — inline images in a learning body (contracts/learning-editor.md §B1).
 *
 * Two halves of the alt-text rule meet here: `alt` lives on the media DOCUMENT (entered once, reused
 * wherever the asset appears), and `decorative` is a per-PLACEMENT flag on the upload node, because
 * the same asset can be meaningful on one page and pure decoration on another (research §5).
 */
export interface LearningImageNode {
  value?: number | Media | null;
  fields?: { decorative?: boolean | null } | null;
}

export function LearningImage({ node }: { node: LearningImageNode }) {
  const media = node.value;

  // An upload node whose media document is missing (a deleted asset) renders nothing rather than a
  // broken image or a crashed page (§B1.5).
  if (!media || typeof media !== 'object') return null;

  // Prefer the generated content size over the original file, so a 4000px screenshot does not
  // dominate page weight (FR-023). Fall back to the original if sizes are not generated yet.
  const size = media.sizes?.content;
  const src = size?.url ?? media.url;
  if (!src) return null;

  const width = size?.width ?? media.width ?? undefined;
  const height = size?.height ?? media.height ?? undefined;
  const decorative = Boolean(node.fields?.decorative);

  return (
    <figure className="lp-figure">
      {/* eslint-disable-next-line @next/next/no-img-element -- Payload serves uploads from its own
          route; next/image would add a second optimisation layer over sizes sharp already generated. */}
      <img
        src={src}
        // Empty alt for a decorative placement; otherwise the asset's own description (FR-021).
        alt={decorative ? '' : media.alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
      />
    </figure>
  );
}
