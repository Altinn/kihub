# Research: News Hero Images with Editor-Controlled Framing

Every claim below marked **(verified)** was checked against the installed source of
`payload@3.85.2` (`node_modules/payload/dist/uploads/…`) or `@payloadcms/storage-azure@3.85.2`, or
against this repo, on 2026-09-23.

---

## R1 — Hero image field: new `heroImage` upload field, keep `heroImageUrl`

**Decision**: Add `heroImage` (`type: 'upload'`, `relationTo: 'media'`, optional) to `News`. Keep
`heroImageUrl` as it is in the database, relabelled in Norwegian as the legacy fallback and moved
under the new field with a help text saying that uploading an image replaces it.

**Rationale**: This meets FR-008/FR-009 with no data change: the existing column is kept, and the
new one is an added nullable FK. Payload's `upload` field gives editors an "upload new / choose
existing" drawer that includes the image-edit tools (R2), so the whole flow stays inside the
article form (SC-002).

**Alternatives considered**:
- *Automatically importing existing URLs into `media`.* Rejected (spec Assumptions): it would pull
  in unchecked external files with no alt text, and `media.alt` is required.
- *Dropping `heroImageUrl` now.* Rejected: this breaks FR-008. Retiring it is a later clean-up.
- *A `relationship` field instead of `upload`.* Rejected: `upload` is Payload's purpose-built
  variant, with thumbnail preview and the create-and-edit drawer.

## R2 — Turn on Payload's built-in `focalPoint` and `crop` for `media`

**Decision**: Set `focalPoint: true` and `crop: true` on `Media.upload`. These were `false`.

**How they behave (verified, `generateFileData.js`)**:
- **Focal point** is stored as `focalX`/`focalY` (0–100 percentages) on the media document. It
  only changes how *derived* sizes are framed. The original file is kept. With focal point enabled
  and no value set, Payload defaults to 50/50, the centre (FR-004 / US1 scenario 3).
- **Crop** runs `cropImage()` on the uploaded buffer and writes the result as the **main stored
  file**. The un-cropped original is not kept. This is why the spec says crop changes the image
  everywhere it is used (US4, FR-003), and why the help text must say so (FR-013).
- Changing the focal point or crop on an existing document triggers `shouldReupload` →
  Payload re-fetches the stored original and regenerates every size, overwriting the files
  (`overwriteExistingFiles = true`).

**Known quirk (verified, analysis E1)**: Payload reads the focal point with truthiness checks
(`incomingData?.focalX && incomingData?.focalY`, and `incomingData?.focalX || origDoc.focalX`).
An edge value of exactly `0` is treated as "not set", so it falls back to 50 or the previous
value. We don't work around this in Payload. Our renderers use `??`, so a stored `0` is still
honoured as `0%`.

**Alternatives considered**: A custom focal-point field plus our own sharp pipeline. Rejected: the
built-in tool already does exactly this, including the admin UI (Principle VII, Start Simple).

## R3 — Two card sizes: `card` 800×500 and `card2x` 1600×1000, `withoutEnlargement: true`

**Decision**: Add two `imageSizes` entries, `{ name: 'card', width: 800, height: 500,
withoutEnlargement: true }` and `{ name: 'card2x', width: 1600, height: 1000, withoutEnlargement:
true }`. Keep the existing `content`/`content2x` (760/1520, width-only) entries unchanged.

**Why 800 wide**: the widest a news card gets is the 2-up `/news` grid column, which is under
800 CSS px at the portal's max content width. That makes 800 the 1× size and 1600 the 2× size
(FR-004, SC-005).

**Why `withoutEnlargement: true` must be explicit (verified, `getImageResizeAction.js` +
`createImageSizes.js`)**: Payload picks one of three resize actions:
- `omit`: no file. Chosen when `withoutEnlargement` is *undefined* and the original is smaller
  than the target on **both** axes.
- `resizeWithFocalPoint`: scale so the target box fits inside the image, then `extract` a
  target-sized window centred on the focal point, clamped to the image edges. This gives an
  **exact** 16:10 derivative.
- `resize`: plain `sharp.resize(config)`, which is a centred cover crop.

With `withoutEnlargement` left *undefined*, an original that is short on just **one** axis (for
example a 3000×900 banner against 1600×1000) goes to `resizeWithFocalPoint`, which scales it **up**
to 1000 px tall (3333×1000). That breaks the "never enlarged" rule in FR-004. With
`withoutEnlargement: true`, any original smaller on either axis goes to `resize` with sharp's
own `withoutEnlargement`, so no upscaling happens. The trade-off is that such a derivative may not
be exactly 16:10, or may not follow the focal point. R4 handles that case.

**Alternatives considered**: One size plus CSS scaling. Rejected: SC-005 asks for a double-density
variant. Serving the original instead would ship multi-MB files for each card.

## R4 — Choosing the card image: exact derivative or original, with CSS focal positioning

**Decision**: Add a pure function `pickCardImage(media)` in `lib/news-view.ts`, which is
unit-tested:
1. Use `card`/`card2x` as a `srcset` (`800w`/`1600w`, using each size's **actual** stored
   width) **only when** that size exists and its aspect ratio is 16:10 within 1%. Only then is it
   known to be a focal-framed extract.
2. Otherwise fall back to the best reading-width source: `content`, then `content2x`, then the
   original `url`. The original is uncropped, so the focal framing is done by CSS instead.
3. **Always** emit `object-position: {focalX}% {focalY}%` (defaulting to 50% 50%) alongside the
   existing `object-fit: cover`. For an exact derivative this has no effect. For a fallback source
   it makes the browser crop around the same point Payload would.

**Rationale**: Every edge case in the spec renders correctly without special-casing:
- small originals (R3);
- pre-existing learning media that never got card sizes (spec Edge Cases; no bulk reprocessing is
  needed);
- a failed or partial regeneration.

The card's visual framing is identical whichever source is used.

**Alternatives considered**: Regenerating sizes for all existing media in a migration script.
Rejected: none of those images are news heroes today. The fallback costs nothing, and
reprocessing in azure mode has the risk described in R6.

## R5 — Article page: full image through the existing reading-width sizes

**Decision**: The news article page renders an uploaded hero with `sizes.content`/`content2x` as a
`srcset` (falling back to `url`), `height: auto`, and no fixed aspect ratio. This is the same
approach `LearningImage` already uses (FR-006, US2). `alt` comes from `media.alt` (FR-007).

**Verified**: with focal point enabled, the width-only `content` sizes take the
`resizeWithFocalPoint` branch. `resizeHeight` is derived as `width / originalAspectRatio`, so the
extract window is the **whole** scaled image. The aspect ratio stays the same and there is no
visible change, which satisfies FR-011/SC-004 for learning pages. A regression test pins this:
after the change, a non-16:10 upload's `content` size keeps the original aspect ratio.

**Why the legacy path keeps `alt=""`**: legacy URLs have no alt text anywhere, which is the
behaviour today. Rendering the article title as alt would duplicate the `<h1>` for screen
readers.

## R6 — Re-framing an image that is already saved, in Azure storage mode (RISK)

**Finding (verified, `generateFileData.js` + `getExternalFile.js`)**: when a saved image's focal
point or crop changes, Payload re-fetches the original:
- **Disk mode** (local dev and tests) reads it from `staticDir` through `getFileByPath`, with no
  network involved.
- **Azure mode** (production, `disableLocalStorage`) uses `getExternalFile`. It builds
  `${Origin header}${doc.url}` (`/payload-api/media/file/<name>`), forwards the browser's non-Payload
  cookies, and fetches it through `safeFetch`, which refuses private and loopback addresses.

In production the container fetches its own public URL. That should work: `media` read access is
`() => true`, the app has no middleware in front of `/api`, and the public hostname resolves to a
public IP. It cannot be proven locally, though.

**Decision (revised after analysis U2)**: remove the risk up front instead of waiting to
discover it in production. `lib/media-storage.ts` gains
`resolveMediaSelfFetchAllowList(env)`, which is wired into `Media.upload.skipSafeFetch`:
- in **azure** mode with the new optional env **`MEDIA_PUBLIC_HOSTNAME`** set, it returns
  `[{ protocol: 'https', hostname, pathname: '/payload-api/media/file/*' }]`;
- otherwise it returns `undefined`, which keeps Payload's default `safeFetch`.

Scoping the entry to our own hostname **and** our own file route means SSRF protection stays in
place for every other URL. An allow-list entry that matched on path alone would let a forged
`Origin` header aim the fetch anywhere.

Production ingress is external, at FQDN
`kihub-web.happypond-fe66d7a5.norwayeast.azurecontainerapps.io` (checked 2026-09-23 with
`az containerapp show`). The env var is set there at deploy. Setting the focal point in the upload
drawer before the first save never re-fetches, so it works whatever this is set to. Quickstart §6
remains the post-deploy confirmation.

## R7 — Cache-busting re-framed images

**Finding (verified, `generateImageSizeFilename.js`)**: derivative filenames are
`<name>-<W>x<H>.<ext>`. Re-framing overwrites the same filenames, so the URL doesn't change. The
Azure handler sends an `ETag` (`storage-azure/dist/getFile.js`), but browsers and any intermediate
cache may still serve the old framing (spec Edge Case, "Focal point changed after publishing").

**Decision**: `pickCardImage` and the article renderer append `?v=<media.updatedAt as epoch ms>` to
every media URL they emit. Payload's file route ignores query strings. Learning pages are not
touched (FR-011): they never re-frame in practice and are outside this change.

## R8 — Read layer: explicit `depth: 1` on the news queries

**Decision**: Pass `depth: 1` to the three news reads in `lib/news.ts` (`listPublishedNews`,
`listPublishedNewsPage`, `getPublishedNewsBySlug`).

**Rationale**: `heroImage` has to be populated to a `Media` object. Payload's default depth
(2) already does this, but depending on an implicit default is how a field ends up as a bare
number after someone lowers it. Depth 1 still populates `author`, which is the only other
relationship.

**Deleted media**: Payload's upload FK is `ON DELETE SET NULL`, so a deleted asset reads back as
`null`. The render helpers also treat a bare number (unpopulated) as "no upload", for FR-010. In
both cases the fallback order continues to `heroImageUrl`, then the placeholder.

## R9 — Back-office grouping for a now-shared library

**Decision**: Remove `group: 'KI Læring'` from `Media`, so it appears ungrouped next to News and
Events, which are also ungrouped. Update the collection's header comment and admin description to
say the library is shared by news and learning pages. On the `upload` config, add Norwegian help
text saying that focal point and crop apply everywhere the image is used (FR-013).

## R10 — Migration

**Decision**: Generate one migration with `payload migrate:create` (name
`news_hero_media`). The expected shape, which is additive only:
- `media`: `focal_x numeric`, `focal_y numeric`, and `sizes_card_*` / `sizes_card2x_*`
  (`url`, `width`, `height`, `mime_type`, `filesize`, `filename`), plus the
  `media_sizes_card_sizes_card_filename_idx`-style indexes Payload generates.
- `news`: `hero_image_id integer` with FK → `media(id) ON DELETE SET NULL`, plus an index.
- **No** drop or rename of `hero_image_url`.

No table is created or dropped, so the CASCADE/named-FK generator bug from 014/015/016 should
not apply. The `down` is still checked for `IF EXISTS` on the FK and index drops, and the
migration is verified up→down→up on a scratch DB `kihub_migtest_020` (017 practice).

**Local dev DB**: the change adds columns only, so push-mode should reconcile without the
data-loss prompt that hung 017's suite. If it prompts anyway, apply the migration's `up()` SQL with
`psql` first (017 gotcha).

**Implementation note**: `focal_x`/`focal_y` already existed from `20260810_093128_media_uploads`
(Payload creates them even with `focalPoint: false`), so the generated migration only adds the card
sizes and the FK. The column list above over-predicted.

**Merge ordering**: the unmerged `019-footer-contacts` branch probably carries its own
migration. Both are additive and touch different tables. Whichever merges second rebases and
checks that `src/migrations/index.ts` lists both, in timestamp order.

## R11 — Scope checks

- Only three places render `heroImageUrl` (verified by grep): `components/NewsCard.tsx` (shared
  by the frontpage "Siste nytt" section and `/news`) and `app/(app)/news/[slug]/page.tsx`.
  `ProjectCard` only mentions it in a comment. Projects stay out of scope.
- No seed script or test fixture sets `heroImageUrl`.
- The existing `media` upload rules (mime allow-list without SVG, 5 MB `beforeChange` guard,
  editor-only write) apply to the new field without changes, because they live on the collection
  (FR-012).
