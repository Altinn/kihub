# Quickstart: validating 020 News Hero Images

## Prerequisites

- Local Postgres running (colima + `docker compose`, container `kihub-postgres`, port 55432).
- Env exported for every command: `set -a; source apps/web/.env; set +a`.
- `MEDIA_STORAGE_MODE` unset or `disk` locally.
- Test images, which can be generated with sharp or taken from anywhere:
  - `wide-text.png`: 3000×1000 with a text block in the right-most 15%
  - `small.png`: 600×300
  - `portrait.jpg`: 1000×1500

## 1. Schema and migration

1. After the collection edits: `pnpm --filter web payload generate:types`. Confirm that `News.heroImage` and
   `Media.focalX` / `Media.sizes.card` appear in `payload-types.ts`.
2. `pnpm --filter web migrate:create news_hero_media`. Inspect the generated `up`/`down`
   against data-model.md: additive only, and no `hero_image_url` change. Hand-patch `IF EXISTS`
   into the `down` if needed.
3. Scratch-DB round trip: create `kihub_migtest_020`, run `pnpm --filter web migrate` → `payload migrate:down` →
   `migrate` against it. All three steps should succeed.
4. Local push-mode DB: run any integration test. If it hangs on a "data loss" prompt, apply the
   migration `up()` SQL with `psql` and rerun (017 gotcha).

## 2. Automated suite

```bash
pnpm --filter web test
pnpm --filter web lint
pnpm --filter web exec tsc --noEmit
```

Expected: everything green, including the new/extended `news-view.test.ts`,
`media-upload.test.ts` and `news-hero.test.ts` (contracts A3, B4).

## 3. Back-office flow (US1, US4, SC-002)

1. Start the dev server and sign in (mock, as an editor).
2. `/cms` → Nyheter → create an article → «Toppbilde» → Last opp ny → `wide-text.png`. Set the
   focal point on the text, fill in «Alternativ tekst», save, set status to published, save.
   Time the whole flow: it should take under 2 minutes.
3. Confirm «Mediefiler» is no longer under «KI Læring» and that its description mentions shared
   use.
4. Open the media item, crop 10% off the left edge, save. Confirm the sizes regenerated (new
   `updatedAt`).

## 4. Employee pages (US1–US3, SC-001/003/006)

1. `/` («Siste nytt») and `/news`: the new article's card shows the text inside the 16:10 well.
   Check in DevTools that the `<img>` has `srcset` with `800w`/`1600w` and a `?v=` query.
2. Emulate DPR 2: confirm the browser picks the `card2x` candidate.
3. Open the article. The hero shows the whole (cropped) image at its own aspect ratio, and `alt`
   equals the media alt text.
4. An existing legacy article (only `heroImageUrl`) looks identical to `main`, both on its card
   and on its article page.
5. Give an article `small.png` as its hero. The card fills the well without distortion, and the
   stored `card2x` is not larger than 600×300.
6. Delete the media item used by one article. The card and article page fall back to the legacy
   URL if there is one, or to the placeholder. There are no broken images and no console errors.
7. Open any learning page with an image. It renders exactly as before (SC-004).
8. Clean up: delete the test articles and media.

## 5. Production build gate

`next build` against the migrated scratch DB with a non-mock `AUTH_MODE` (014 practice). It must
typecheck and compile.

## 6. After deploy (Azure storage, research R6)

1. In prod `/cms`, open an **already-saved** media item, move its focal point, and save.
2. Expected: the save succeeds and the card on `/news` updates after a reload.
3. Precondition: `MEDIA_PUBLIC_HOSTNAME` is set on `kihub-web` (R6). If the save still fails
   with a file-retrieval error, check that value against the ingress FQDN. Setting the focal point in the upload
   drawer before the first save is unaffected either way.
