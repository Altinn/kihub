---
description: "Task list for 020 News Hero Images with Editor-Controlled Framing"
---

# Tasks: News Hero Images with Editor-Controlled Framing

**Input**: Design documents from `specs/020-news-hero-media/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R11), data-model.md, contracts/cms-news-hero.md
(A), contracts/hero-image-rendering.md (B), quickstart.md

**Tests**: INCLUDED. The constitution's Testing gate requires tests for new
state/validation rules. Contracts A3 and B4 list the exact guarantees to test.

**Organization**: tasks are grouped by user story (spec.md). US1, US2 and US3 are all P1, and US4
is P3.

All paths are relative to the repo root. Every command runs with the env exported:
`set -a; source apps/web/.env; set +a`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4 from spec.md

---

## Phase 1: Setup

**Purpose**: confirm a clean baseline before any schema change.

- [x] T001 Confirm the baseline: local Postgres is up (`kihub-postgres`, port 55432), and `pnpm --filter web test`, `pnpm --filter web lint` and `pnpm --filter web exec tsc --noEmit` are green on branch `020-news-hero-media`. Record the suite count (expected 360+ across 46+ files) for comparison in the Polish phase.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the schema, types, migration and read layer that every story depends on.

**⚠️ CRITICAL**: no user-story work can start until this phase is complete.

- [x] T002 [P] Update the `Media` collection in `apps/web/src/collections/Media.ts`, following data-model.md and research R2/R3/R9:
  - set `upload.focalPoint: true` and `upload.crop: true`;
  - append the image sizes `{ name: 'card', width: 800, height: 500, withoutEnlargement: true }` and `{ name: 'card2x', width: 1600, height: 1000, withoutEnlargement: true }`, keeping `content`/`content2x` unchanged. Add a comment explaining why `withoutEnlargement: true` must be explicit (R3: undefined upscales originals that are short on one axis);
  - remove `admin.group: 'KI Læring'`;
  - add `admin.description`: «Bilder brukt i nyheter og KI Læring. Fokuspunkt og beskjæring gjelder overalt der bildet brukes.»;
  - update the header comment, which currently says News migration is out of scope, to describe the shared library;
  - append this to the existing `alt` field description, which is visible inside the upload drawer: « Fokuspunkt og beskjæring du setter på bildet, gjelder overalt der bildet brukes.» (analysis U1);
  - leave `alt`'s `required`, the `mimeTypes`, access and the 5 MB `beforeChange` guard untouched.
- [x] T003 [P] Update the `News` collection in `apps/web/src/collections/News.ts` (data-model.md, R1):
  - add `{ name: 'heroImage', type: 'upload', relationTo: 'media', label: 'Toppbilde', admin: { description: 'Last opp eller velg et bilde fra Mediefiler. Velg fokuspunkt (og eventuelt beskjæring), slik at det viktigste alltid synes på forsiden og i nyhetsoversikten. Endringer på bildet gjelder overalt der det brukes.' } }` directly before `heroImageUrl`;
  - relabel `heroImageUrl` to `'Bilde-URL (eldre)'` with `admin.description: 'Brukes bare når det ikke er lastet opp et toppbilde. Last opp et toppbilde for å kunne styre utsnittet.'`, keeping its `name` and `type` unchanged.
- [x] T004 Regenerate Payload types with `pnpm --filter web payload generate:types`. Verify that `apps/web/src/payload-types.ts` now has `News.heroImage?: (number | null) | Media`, `Media.focalX`/`focalY` and `Media.sizes.card`/`card2x` (depends on T002 and T003).
- [x] T005 Generate the migration with `pnpm --filter web migrate:create news_hero_media`, creating `apps/web/src/migrations/<ts>_news_hero_media.{ts,json}` and updating `apps/web/src/migrations/index.ts`. Check it against the migration section of data-model.md:
  - the `up` only adds things: `media.focal_x`/`focal_y`, the `sizes_card_*`/`sizes_card2x_*` columns plus filename indexes, and `news.hero_image_id` with an FK `ON DELETE SET NULL` plus an index;
  - it makes **no** change to `hero_image_url`;
  - hand-patch `IF EXISTS` onto every constraint and index drop in `down` if the generator left them out (014/015/016 precedent).

  Depends on T004.
- [x] T006 Verify the migration on a scratch DB. Create `kihub_migtest_020`, point `DATABASE_URI` at it, then run `pnpm --filter web migrate` → `pnpm --filter web payload migrate:down` → `pnpm --filter web migrate`. All three must succeed. KEEP `kihub_migtest_020` because T025 and T028 need it; only T028 drops it. Then run one integration test against the local push-mode `kihub` DB. If it hangs on a "data loss" prompt, apply the migration's `up()` SQL with `psql` and rerun (017 gotcha, R10). Depends on T005.
- [x] T007 [P] Add `depth: 1` to the three reads in `apps/web/src/lib/news.ts` (`listPublishedNews`, both `payload.find` calls in `listPublishedNewsPage` through the shared `query` object, and `getPublishedNewsBySlug`), with a one-line comment that `heroImage` must be populated (R8). Depends on T004.
- [x] T008 Add the `HeroSource` type and a pure `resolveHeroSource(article: Pick<News, 'heroImage' | 'heroImageUrl'>): HeroSource` to `apps/web/src/lib/news-view.ts`, following contract B1. The order is upload (a `Media` object with a truthy `url`), then legacy (a non-empty trimmed `heroImageUrl`), then none. `null`, `undefined`, a numeric id, or a `Media` without `url` never count as an upload. Depends on T004.
- [x] T009 Add a private `withVersion(url: string, updatedAt?: string | null): string` helper to `apps/web/src/lib/news-view.ts` (R7, B1). It appends `?v=<Date.parse(updatedAt)>`, using `&v=` if the URL already has a query, and returns the URL unchanged when `updatedAt` is missing or can't be parsed. Depends on T008 (same file).

- [x] T010 [P] Add the Azure re-fetch allow-list (research R6, analysis U2, FR-002):
  - add `resolveMediaSelfFetchAllowList(env)` to `apps/web/src/lib/media-storage.ts`. It returns `[{ protocol: 'https', hostname, pathname: '/payload-api/media/file/*' }]` when `MEDIA_STORAGE_MODE=azure` AND the new optional `MEDIA_PUBLIC_HOSTNAME` is set (trimmed and non-empty), and `undefined` otherwise;
  - wire it into `Media.upload.skipSafeFetch` in `apps/web/src/collections/Media.ts`, leaving it `undefined` when the function returns nothing, so Payload's default `safeFetch` stays in place;
  - scoping it to our own hostname AND file route keeps SSRF protection for everything else;
  - add unit cases to `apps/web/tests/unit/media-storage.test.ts`: disk mode gives `undefined`, azure without a hostname gives `undefined`, and azure with a hostname gives the scoped entry.

  Prod value (for T031): `kihub-web.happypond-fe66d7a5.norwayeast.azurecontainerapps.io`.

**Checkpoint**: the schema is migrated, the types are regenerated, the read layer populates `heroImage`, and the precedence helper exists. The UI is still unchanged.

---

## Phase 3: User Story 1: upload a hero image and set its focal point, so cards frame it correctly (P1) 🎯 MVP

**Goal**: an uploaded hero appears on the frontpage «Siste nytt» and `/news` cards as a 16:10 image framed around the editor's focal point, sharp on retina screens.

**Independent Test**: quickstart §3.2 and §4.1–4.2. Upload `wide-text.png` with the focal point on its right-edge text, publish, and see the text inside both cards, with a `srcset` of `800w`/`1600w`.

### Tests for User Story 1

- [x] T011 [P] [US1] Extend `apps/web/tests/integration/media-upload.test.ts` (contract A3.1 and A3.3):
  - a 2000×1250 PNG upload gets `focalX === 50` and `focalY === 50`, and `sizes.card` 800×500 and `sizes.card2x` 1600×1000, each with a `url`;
  - a 600×300 upload has no enlarged card size: for each of `card`/`card2x`, either there is no `url`, or `width ≤ 600 && height ≤ 300`.

  Reuse the file's existing sharp `png(w, h)` fixture helper.
- [x] T012 [P] [US1] Create `apps/web/tests/integration/news-hero.test.ts` covering contract A3.2. Upload a 3200×1000 PNG built with sharp: the left 3000 px solid blue, and the right-most 200 px solid red. Set `focalX: 95, focalY: 50` at create time (`data: { alt, focalX: 95, focalY: 50 }`). Read the `card` file back from disk (`staticDir` + `sizes.card.filename`) and assert it is exactly 800×500. Assert with `sharp(...).extract` + `stats()` that its right-most column is red-dominant. Clean up the created docs in `afterAll`. Mirror `media-upload.test.ts`'s `getPayload`/`beforeAll` setup.
- [x] T013 [P] [US1] Extend `apps/web/tests/unit/news-view.test.ts` with a `pickCardImage` suite (contract B4.2–B4.4 and B4.6):
  - exact 16:10 `card` + `card2x` → `srcSet` contains both with `800w`/`1600w`, `src` is `card`, and `objectPosition` is `'90% 20%'` for `focalX: 90, focalY: 20`;
  - `card2x` missing → `srcSet` has `card` only;
  - `card` of 600×300 (not 16:10) → falls back to `content`, then `url`, and `objectPosition` is still emitted;
  - no card or content sizes at all → `src === url`;
  - `focalX`/`focalY` null → `'50% 50%'`;
  - `focalX: 0, focalY: 0` → `'0% 0%'`. Use `??`, not `||` (analysis E1);
  - `?v=` is appended from `updatedAt` and left off when `updatedAt` is `'garbage'`.

  Build `Media` fixtures as plain objects cast to `Media`.
- [x] T014 [P] [US1] Extend `apps/web/tests/unit/news-view.test.ts` with a `resolveHeroSource` suite for the upload cases (contract B4.1): a populated Media with a `url` → `{ kind: 'upload' }` even when `heroImageUrl` is also set; a Media without `url` → not an upload. (The legacy and none cases are T022 in US3.)

### Implementation for User Story 1

- [x] T015 [US1] Implement `pickCardImage(media: Media): { src: string; srcSet?: string; objectPosition: string }` in `apps/web/src/lib/news-view.ts` exactly as contract B1 describes:
  - include `card`/`card2x` in the srcset only if the size has a `url` and `Math.abs(width / height - 1.6) / 1.6 <= 0.01`, using each size's actual width as its `w` descriptor;
  - otherwise use `content`/`content2x` (`760w`/`1520w` from their actual widths), then `url`;
  - `objectPosition` is `` `${focalX ?? 50}% ${focalY ?? 50}%` ``;
  - pass every emitted URL through `withVersion`.

  Depends on T009. T013 must go green.
- [x] T016 [US1] Update `apps/web/src/components/NewsCard.tsx` to call `resolveHeroSource(article)`:
  - `upload`: render `<img src srcSet sizes="(max-width: 719px) 100vw, 50vw" alt="" loading="lazy" decoding="async">` with `width: 100%; height: 100%; objectFit: 'cover'; objectPosition; display: block`, taking its values from `pickCardImage`;
  - `legacy`: keep today's `<img src={heroImageUrl} alt="">` markup unchanged;
  - `none`: keep the `kihub-media--placeholder` modifier.

  Update the component's comments, including the one that says there is no Media collection. The card image stays `alt=""` (B2). Add no new CSS or tokens (FR-014). Depends on T015.
- [x] T017 [US1] Run `pnpm --filter web test` for the US1 suites (T011–T014) and make sure they are green, including the existing frontpage and news tests that render `NewsCard`.

**Checkpoint**: US1 is fully functional. Cards on `/` and `/news` show uploaded heroes with focal framing. This is the MVP.

---

## Phase 4: User Story 2: the article page shows the whole image (P1)

**Goal**: `/news/[slug]` shows an uploaded hero in full, at its own aspect ratio, with the media's alt text, and never cut to 16:10.

**Independent Test**: quickstart §4.3. Open the US1 article. The hero is uncropped, its `srcset` uses `760w`/`1520w`, and its `alt` equals the media alt text.

### Tests for User Story 2

- [x] T018 [P] [US2] Extend `apps/web/tests/unit/news-view.test.ts` with a `pickArticleImage` suite (contract B4.5):
  - it uses `content`/`content2x` with actual widths and returns their width and height;
  - it falls back to `url` plus the media's own width and height when no content size exists;
  - it **never** returns a `card`/`card2x` URL, even when only card sizes exist (it then falls back to `url`);
  - `alt === media.alt`;
  - `?v=` is appended.
- [x] T019 [P] [US2] Add a learning-regression case to `apps/web/tests/integration/media-upload.test.ts` (contract A3.4, FR-011). A 2000×500 (4:1) upload's `sizes.content` is 760 wide, and its `height` is 190 ±1, which proves the focal-point branch keeps the original aspect ratio.

### Implementation for User Story 2

- [x] T020 [US2] Implement `pickArticleImage(media: Media)` in `apps/web/src/lib/news-view.ts` following contract B1. Depends on T009. T018 must go green.
- [x] T021 [US2] Update the hero block in `apps/web/src/app/(app)/news/[slug]/page.tsx` to use `resolveHeroSource`:
  - `upload`: render `<img src srcSet sizes="(max-width: 760px) 100vw, 760px" width height alt={media.alt} decoding="async">` with `width: 100%; height: auto; display: block` and no `object-fit`, inside the existing `.kihub-media.news-detail__hero` wrapper;
  - `legacy`: keep today's markup;
  - `none`: render nothing.

  Update the eslint-disable comment, which currently says managed uploads are deferred. Depends on T020.

**Checkpoint**: US1 and US2 both work. Cards are framed and the article shows the full image.

---

## Phase 5: User Story 3: existing articles keep their images (P1)

**Goal**: legacy `heroImageUrl` articles render exactly as before. An uploaded hero always takes precedence, and a deleted media item falls back cleanly.

**Independent Test**: quickstart §4.4 and §4.6. A legacy-only article looks identical to `main`. After its media is deleted, an article falls back to its legacy URL or to the placeholder, with no broken image.

### Tests for User Story 3

- [x] T022 [P] [US3] Extend the `resolveHeroSource` suite in `apps/web/tests/unit/news-view.test.ts` (contract B4.1):
  - `heroImage: null` plus a URL → `legacy`;
  - `heroImage: 42` (unpopulated id) plus a URL → `legacy`;
  - `heroImage` undefined and `heroImageUrl: '   '` → `none`;
  - both empty → `none`.
- [x] T023 [P] [US3] Add to `apps/web/tests/integration/news-hero.test.ts` (contract A3.5, FR-010):
  - create a media doc, then a published news doc with both `heroImage` and a `heroImageUrl`. Read it with `depth: 1` and assert `heroImage` is a populated object;
  - delete the media doc, then read the news doc again. It is still readable, `heroImage` is `null`, `heroImageUrl` is unchanged, and `resolveHeroSource` returns `legacy`.

### Implementation for User Story 3

- [x] T024 [US3] Review the legacy and none branches written in T016 and T021 against contract B2/B3 row by row. Diff `NewsCard.tsx` and `news/[slug]/page.tsx` against `main` to confirm the legacy markup is byte-for-byte unchanged apart from the branching. Fix any drift. Depends on T016 and T021.
- [x] T025 [US3] Confirm migration guarantee A3.6 on the scratch DB from T006: run `payload migrate:down` to get back to the pre-020 schema, insert a news row with a `hero_image_url` using `psql`, run `pnpm --filter web migrate`, then check that `SELECT hero_image_url, hero_image_id` returns the same URL and `NULL`. Record the result in the Notes section of this file.

**Checkpoint**: all P1 stories are complete, and no existing content has regressed.

---

## Phase 6: User Story 4: crop an image (P3)

**Goal**: editors can crop a library image, and the crop applies everywhere that image is used.

**Independent Test**: quickstart §3.4. Crop 10% off the left of the US1 image. The card, the article page, and any learning page using it all show the cropped result.

- [x] T026 [US4] Browser verification with the mock sign-in, as an editor: in `/cms` → Mediefiler, open the US1 image, crop it, and save. Confirm `updatedAt` changes and all four sizes regenerate. Confirm the card and article on `/news` show the cropped image after a reload, with a new `?v=`. Crop was already enabled in T002, so this story needs no code. If the admin crop UI fails, record why in Notes rather than working around it.

**Checkpoint**: all stories work.

---

## Phase 7: Polish and cross-cutting concerns

- [x] T027 [P] Run the full gates: `pnpm --filter web test` (expect the T001 count plus the new tests, all green), `pnpm --filter web lint`, and `pnpm --filter web exec tsc --noEmit`.
- [x] T028 Run the production build gate: `pnpm --filter web build` against the migrated scratch DB (`kihub_migtest_020`) with a non-mock `AUTH_MODE` (014 practice). It must typecheck and compile. Drop the scratch DB afterwards.
- [x] T029 Complete the browser walkthrough of quickstart §3 and §4 on a fresh tab with the mock sign-in:
  - upload flow timing (SC-002) and the Mediefiler grouping and description;
  - `/` and `/news` cards (DevTools: `srcset` and `?v=`), DPR 2 selecting `card2x`, and the article page's full image and alt text;
  - a legacy article unchanged, the `small.png` case, and deleting media with its fallback;
  - a learning page unchanged (SC-004);
  - zero console errors.

  Take screenshots as proof, then delete the test articles and media.
- [x] T030 [P] Update the 020 paragraph in `CLAUDE.md` (inside the SPECKIT markers): mark it DONE, add the suite count, and add any gotchas found during implementation.
- [x] T031 [P] Add a release note to the Notes section below for the deploy: run quickstart §6, the Azure re-fetch check (research R6). Set `MEDIA_PUBLIC_HOSTNAME=kihub-web.happypond-fe66d7a5.norwayeast.azurecontainerapps.io` on `kihub-web` (T010). Without it, re-framing an already-saved image goes through the default `safeFetch`. Also note the `019-footer-contacts` migration ordering (R10).

---

## Dependencies and execution order

### Phase dependencies

- **Setup (T001)** → **Foundational (T002–T009)** → the user stories → **Polish (T027–T031)**.
- Inside Foundational: T002 ∥ T003 → T004 → (T005 → T006) ∥ T007 ∥ (T008 → T009); T002 → T010.

### User story dependencies

- **US1 (P1)**: depends only on Foundational. It is the MVP.
- **US2 (P1)**: depends only on Foundational. It is independent of US1, apart from sharing `news-view.ts`, so run its tasks after US1's work in that file, or coordinate edits.
- **US3 (P1)**: its implementation review (T024) needs T016 and T021, so it runs after US1 and US2. Its tests (T022, T023) can be written any time after Foundational.
- **US4 (P3)**: needs T002 plus a working US1 or US2 surface to observe. It needs no code.

### Within each story

Write the tests first (T011–T014, T018–T019, T022–T023) and see them fail. Then write the helpers in `news-view.ts`, then the components and pages.

## Parallel opportunities

- T002 ∥ T003 (different collection files).
- After T004: T005/T006 ∥ T007 ∥ T008. T010 can start any time after T002.
- US1 tests: T011 ∥ T012 ∥ T013 ∥ T014. Caveat: T013 and T014 edit the same file, so write them sequentially if one agent does both.
- US2 tests T018 ∥ T019. US3 tests T022 ∥ T023.
- Polish: T027 ∥ T030 ∥ T031.

### Parallel example: User Story 1

```text
Task: "T011 [US1] Extend media-upload.test.ts with card-size + no-enlargement cases"
Task: "T012 [US1] Create news-hero.test.ts focal-extract pixel test"
Task: "T013 [US1] Add pickCardImage unit suite to news-view.test.ts"
```

## Implementation strategy

### MVP first (User Story 1)

1. Phase 1 → Phase 2 (schema, migration, read layer, precedence helper).
2. Phase 3 (US1). **Stop and validate** with quickstart §3.2 and §4.1–4.2. This alone fixes the reported cropping problem on both card surfaces.

### Incremental delivery

1. Add US2 (full image on the article page), then validate.
2. Add US3 (legacy regression proof), then validate. **All P1 is now done, and this is the shippable unit.** US1 on its own already keeps legacy articles working, because the legacy branch is untouched, but US3 is what proves it.
3. Add US4 (crop verification), then run Polish.

## Notes

- `[P]` means different files with no incomplete dependencies. `news-view.ts` and `news-view.test.ts` are each shared by several tasks, so serialise edits to them.
- Don't use `next/image`. Payload already generates the sizes (the 014 `LearningImage` precedent).
- Don't touch `LearningImage.tsx` or the learning pages (FR-011). The `?v=` cache-busting applies to news only (R7).

### Implementation record (2026-09-23)

**Result**: 31/31 tasks done. The suite is **382/382 across 47 files** (baseline 360/46, plus 22 new
tests). Lint and `tsc --noEmit` are clean. `next build` against the migrated scratch DB with
`AUTH_MODE=entra` compiles, type-checks and generates every route.

**T025 / A3.6 (FR-009)**: verified on real data rather than a synthetic row. The dev clone
`kihub_020` had 10 news rows, 6 of them with a legacy `hero_image_url`. 020's `up()` SQL was applied
with `psql`, and a before/after diff of `(id, hero_image_url)` was identical. `hero_image_id` is
NULL on all 10. The scratch DB round trip up → down (all batches) → up was clean.

**T026 (US4, crop)**: verified through the same request the admin image editor sends, a `PATCH`
with `uploadEdits[crop]…` in the query plus the full form state in the body. The browser pane was
hidden and cannot drive a crop drag or a native file picker. Results: the original went from
3000×1000 to 2700×1000, every size was regenerated with new dimensions (old files removed), and
`updatedAt` and `?v=` changed. A re-focus of an already-saved image regenerated all 5 files the
same way.

**T029 (browser walkthrough, mock sign-in)**, on a separate dev server
(`.claude/launch.json` → `kihub-web-020`, port 3020, DB `kihub_020`):
- the focal card shows the right-edge text «KI-DAGEN 12. oktober» in full, while the centred
  control built from the same image crops it away (screenshot);
- `srcset` is `800w`/`1600w` with `?v=`, and the high-density pane picked `card2x`;
- the small image falls back to a single candidate;
- deleted media falls back to the legacy URL;
- existing legacy articles are byte-identical;
- the article page shows the whole 3:1 image with the media alt text;
- the learning page `instruksjoner` is unchanged;
- the News form shows «Toppbilde» and «Bilde-URL (eldre)» with their help texts, and
  «Mediefiler» is ungrouped;
- zero app console errors. The only two 404s were my own probe URLs.

**Not independently verified**: SC-002 (upload flow under 2 minutes). It needs a real editor at a
real file picker.

### Findings during implementation

1. **The Payload API route is `/payload-api`, not `/api`** (`payload.config.ts` `routes.api`). The
   R6 allow-list pathname is therefore `/payload-api/media/file/*`. The first draft would have
   silently never matched in production. Caught by reading a generated `sizes.card.url`.
2. **`sizes` on the article hero**: after #148 the article column is full content width (up to
   1200px), not 760px. The first `sizes="…760px"` would have made 1× screens pick the 760 file and
   upscale it. It is now `(max-width: 1200px) 100vw, 1200px`.
3. **A small original makes Payload store the SAME file for several sizes** (`content` =
   `content2x` = `card` = `card2x` = 600×300). `toSrcSet` keeps one candidate per width, because a
   repeated `600w` descriptor makes the srcset invalid.
4. **A partial API update that only sets `focalX`/`focalY` does NOT regenerate files.** Payload
   only re-fetches the original when the body carries `filename` + `url`, and it compares
   `uploadEdits.focalPoint` against the incoming focal values. The admin always sends the full
   form state, so editors are unaffected. Any future script that re-frames images must send
   `uploadEdits` plus the full document.
5. **`media.focal_x`/`focal_y` already existed** from `20260810_093128_media_uploads`, because
   Payload creates them even with `focalPoint: false`. The migration only adds the card sizes and
   the FK.
6. **Test gotcha**: `sharp(file).extract(…).stats()` reports stats for the whole *input* image.
   Materialise with `.toBuffer()` first. This made the focal pixel test look like a product bug at
   first.
7. **Local DB gotcha (repeat of 017's)**: the shared dev DB `kihub` holds the unmerged
   `019-footer-contacts` schema (table `site_chrome_footer_contacts`, with 2 real contact rows).
   On this branch, push-mode wants to drop it and hangs every integration test on the data-loss
   prompt. All 020 work ran on a clone, `kihub_020`, with that table dropped. The shared DB was
   left untouched.
8. **Out of scope, flagged as a separate task**: every portal page overflows horizontally by 48px.
   `.portal-shell > main { width: 100% }` plus the `.kihub-container` padding with content-box
   sizing, from #147/#148. It clips the right edge of full-width images, legacy ones included.

### Release notes (deploy)

- ✅ **DONE 2026-09-24**: `MEDIA_PUBLIC_HOSTNAME=kihub-web.happypond-fe66d7a5.norwayeast.azurecontainerapps.io`
  is set on `kihub-web` (revision `--0000020`, Healthy; T010, research R6). The CI deploy only swaps
  `--image`, so it persists. Update it together with `AUTH_URL` if a custom domain is added. Without it, re-framing an already-saved image in production
  goes through Payload's default `safeFetch`. Then run quickstart §6: move the focal point of a
  saved image in prod `/cms` and confirm the card changes.
- Migration `20260924_080748_news_hero_media` only adds columns and runs through `prodMigrations`
  at boot.
- **Merge ordering with `019-footer-contacts`: resolved 2026-09-24.** #151 merged first. 020 was
  rebased onto it and its migration **regenerated** as `20260924_080748_news_hero_media`, rather than
  just hand-merging `migrations/index.ts`. The old migration's `.json` schema snapshot predated
  `site_chrome_footer_contacts`, so the next `migrate:create` after it would have tried to create
  that table again. The regenerated SQL is identical, and its snapshot includes the footer table.