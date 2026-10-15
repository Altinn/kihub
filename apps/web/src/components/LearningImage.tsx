import type { ContentImage } from '@/lib/content/types';

/**
 * 014 US3 — inline images in a learning body (contracts/learning-editor.md §B1).
 *
 * Two halves of the alt-text rule meet here: `alt` lives on the media DOCUMENT (entered once, reused
 * wherever the asset appears), and `decorative` is a per-PLACEMENT flag on the upload node, because
 * the same asset can be meaningful on one page and pure decoration on another (research §5).
 */
export function LearningImage({
  image,
  decorative,
}: {
  image: ContentImage | null;
  decorative: boolean;
}) {
  // An upload whose media document is missing (a deleted asset) renders nothing rather than a
  // broken image or a crashed page (§B1.5).
  if (!image) return null;

  // Prefer the generated content size over the original file, so a 4000px screenshot does not
  // dominate page weight (FR-023). Fall back to the original if sizes are not generated yet.
  const size = image.renditions.content;
  const src = size?.url ?? image.url;
  if (!src) return null;

  const width = size?.width ?? image.width ?? undefined;
  const height = size?.height ?? image.height ?? undefined;

  return (
    <figure className="lp-figure">
      {/* eslint-disable-next-line @next/next/no-img-element -- Payload serves uploads from its own
          route; next/image would add a second optimisation layer over sizes sharp already generated. */}
      <img
        src={src}
        // Empty alt for a decorative placement; otherwise the asset's own description (FR-021).
        alt={decorative ? '' : image.alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
      />
    </figure>
  );
}
