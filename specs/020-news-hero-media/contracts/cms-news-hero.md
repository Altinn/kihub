# Contract A: Back-office content model for news hero images

Surface: Payload admin (`/cms`). Exempt from the Design System constraint (Principle VIII). Labels
are Norwegian, as in the existing `Media` and `Learning*` collections.

## A1. News editing form

1. The News edit view shows **«Toppbilde»** (`heroImage`), followed directly by **«Bilde-URL
   (eldre)»** (`heroImageUrl`), each with the help text from data-model.md.
2. «Toppbilde» offers **Create New** (create a new `media` item in a drawer) and **Choose from
   existing** (pick from the library). These are Payload's standard `upload` field UI, and the
   admin chrome itself is English; only our labels and help texts are Norwegian.
3. In the create drawer, the editor can open Payload's image editor before saving. There they can
   set the **focal point** and draw a **crop**. `alt` («Alternativ tekst») is required before the
   drawer can save.
4. Saving an article with only `heroImageUrl` set, with only `heroImage` set, with both, or with
   neither, all succeed. There is no cross-field validation.

## A2. Media library

1. «Mediefiler» is listed **ungrouped**, no longer under «KI Læring». The list view keeps its
   `content` thumbnail and columns.
2. Opening any media item lets the editor change the focal point and crop, and save. Saving
   regenerates all sizes (`content`, `content2x`, `card`, `card2x`) and updates `updatedAt`.
3. The `alt` field description (visible in the upload drawer) and the collection description both say that focal point and crop apply everywhere the image is used.
4. Upload rules are unchanged: PNG/JPEG/WebP/AVIF only, SVG refused, more than 5 MB refused with
   the existing Norwegian message, and Reader role cannot create, update or delete.

## A3. Guarantees (tested)

| # | Guarantee | Test |
|---|---|---|
| A3.1 | A raster upload gets `focalX`/`focalY` (default 50/50) and `card` + `card2x` sizes | integration `media-upload.test.ts` (extended) |
| A3.2 | A 3200×1000 upload (right-most 200 px red) with focal point `{x: 95, y: 50}` produces an exactly 800×500 `card` whose right-most column is red | integration (new) |
| A3.3 | A small original (for example 600×300) produces **no enlarged** card size: stored width ≤ 600 and height ≤ 300 | integration (new) |
| A3.4 | A non-16:10 upload's `content` size keeps the original aspect ratio, so learning pages are unchanged (FR-011) | integration (new, regression) |
| A3.5 | A news doc can reference a media doc through `heroImage`. Deleting that media doc leaves the news doc readable, with `heroImage === null` | integration `news-hero.test.ts` (new) |
| A3.6 | Existing `heroImageUrl` values are unchanged after the migration | migration verified on scratch DB and noted in quickstart |
| A3.7 | SVG, >5 MB and Reader-role guarantees still hold | existing `media-upload.test.ts` (unchanged) |
