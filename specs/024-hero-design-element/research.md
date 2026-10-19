# Research: Frontpage hero design element

## R1 — Asset format: SVG extracted from the vector PDF

- **Decision**: Convert the PDF with `pdftocairo -svg`. Keep only element 1's two paths (circle
  + rotated square, the last two paths in the output). Translate them so the bounding box starts
  at 0,0, round to 2 decimals and set `viewBox="0 0 298 180"`. Use hex fills: coral `#F05F63`
  (from `rgb(94.1%, 37.3%, 38.8%)`) and navy `#1E2B3C` (from `rgb(11.8%, 16.9%, 23.5%)`).
- **Rationale**: The PDF has no raster images (`pdfimages -list` is empty), so it is pure vector,
  made in Illustrator. The SVG has no background, so it is transparent (FR-003). It stays sharp
  at any DPI and is about 0.5 KB against the old 334 KB JPEG (SC-003).
- **Alternatives considered**: a PNG screenshot or crop. It would be blurry on retina unless
  rendered huge, it needs a transparency step, and it is far larger. Rejected.
- **Bounding box** (PDF points): circle x 94.02–270.50, y 122.73–298.61; square x 207.84–392.02,
  y 118.61–298.61 → union x 94.02–392.02, y 118.61–298.61 (298 × 180).

## R2 — Paint order

- **Decision**: Paint the circle first, then the square, as in the source PDF.
- **Rationale**: In the source the navy square overlaps the coral circle. Keeping the order keeps
  that overlap (FR-001).

## R3 — `next/image` with an SVG

- **Decision**: `<Image src="/brand/hero-design-element.svg" width={298} height={180} unoptimized …>`.
  Keep the existing inline style (`width: 100%; maxWidth: 420px; height: auto`), `alt=""`,
  `role="presentation"` and `priority`.
- **Rationale**: The same pattern as `SiteHeader`'s `kitt-logo.svg` (`unoptimized`). The image
  optimizer refuses SVG unless `dangerouslyAllowSVG` is set, and an SVG needs no optimization.
  The correct intrinsic ratio (1.656) avoids layout shift.
- **Alternatives considered**: inlining the SVG as JSX. That adds markup to the component for no
  gain, because the image is decorative and static. Rejected.
