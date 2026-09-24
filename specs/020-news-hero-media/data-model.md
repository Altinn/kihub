# Data Model: News Hero Images with Editor-Controlled Framing

This feature only adds things. No existing field is removed, renamed or rewritten (FR-009).

## `news` (collection `apps/web/src/collections/News.ts`), changed

| Field | Type | Req. | New? | Notes |
|---|---|---|---|---|
| `heroImage` | `upload` → `media` | no | **new** | Label **«Toppbilde»**. Help text: «Last opp eller velg et bilde fra Mediefiler. Velg fokuspunkt (og eventuelt beskjæring), slik at det viktigste alltid synes på forsiden og i nyhetsoversikten. Endringer på bildet gjelder overalt der det brukes.» DB: `hero_image_id integer NULL`, FK → `media(id)` **ON DELETE SET NULL**, indexed. |
| `heroImageUrl` | `text` | no | changed (admin only) | Column and values untouched. Relabelled **«Bilde-URL (eldre)»**. Help text: «Brukes bare når det ikke er lastet opp et toppbilde. Last opp et toppbilde for å kunne styre utsnittet.» Placed directly after `heroImage`. |

All other News fields are unchanged.

### Effective hero image (derived at render time, not stored)

Checked in this order (FR-008, FR-010):

1. `heroImage` is a populated `Media` object with a `url` → the **uploaded** hero is used.
2. Otherwise, if `heroImageUrl` is a non-empty string → the **legacy** hero is used.
3. Otherwise → **none** (card shows the existing `.kihub-media--placeholder`, and the article page
   shows no hero).

`heroImage` being `null` (deleted asset, R8), `undefined`, or a bare numeric id (not populated)
all count as "not uploaded".

## `media` (collection `apps/web/src/collections/Media.ts`), changed

| Change | Detail |
|---|---|
| `upload.focalPoint` | `false` → **`true`**. Uses stored fields `focalX`, `focalY` (numeric, 0–100; `focal_x`/`focal_y`, nullable). These columns **already existed** from the 014 media migration. Payload defaults them to 50/50 on upload. |
| `upload.crop` | `false` → **`true`**. Uses no stored field. When used, the crop is applied to the main stored file (research R2). |
| `upload.imageSizes` | Two sizes **added**, `card` `{ width: 800, height: 500, withoutEnlargement: true }` and `card2x` `{ width: 1600, height: 1000, withoutEnlargement: true }`. `content` (760) and `content2x` (1520) stay **unchanged**. Each size stores `url`, `width`, `height`, `mimeType`, `filesize`, `filename` (`sizes_card_*` / `sizes_card2x_*` columns, filename indexed). |
| `admin.group` | `'KI Læring'` → **removed**, since the library is shared (R9). |
| `admin.description` | New: «Bilder brukt i nyheter og KI Læring. Fokuspunkt og beskjæring gjelder overalt der bildet brukes.» |
| `alt` description | Append « Fokuspunkt og beskjæring du setter på bildet, gjelder overalt der bildet brukes.». Unlike the collection description, this is visible inside the upload drawer (analysis U1). |
| `upload.skipSafeFetch` | `[{ protocol: 'https', hostname: MEDIA_PUBLIC_HOSTNAME, pathname: '/payload-api/media/file/*' }]` only when azure mode + `MEDIA_PUBLIC_HOSTNAME` are set, otherwise `undefined` (research R6). |
| `alt` required, `mimeTypes`, 5 MB `beforeChange` guard, access | **Unchanged** (FR-012). |

### Validation and behaviour rules

- A focal value of exactly `0` is dropped by Payload's truthiness checks (research R2 quirk). Renderers still honour a stored `0` (`??`).
- `alt` stays required, so every uploaded hero has alt text (FR-007).
- The card sizes may be **missing** (media uploaded before this change, or `omit`) or **not
  exactly 16:10** (a small original, R3). Consumers MUST NOT assume they exist or have that shape.
  `pickCardImage` handles both cases (contracts/hero-image-rendering.md §A).
- Changing `focalX`/`focalY` or cropping regenerates **all** sizes and bumps `updatedAt`. That
  timestamp is the cache-busting version (R7).

## Relationships

```text
news.heroImage  ──(0..1)──▶  media   (ON DELETE SET NULL)
learning-pages.body (richText upload nodes)  ──▶  media   (unchanged)
```

One `media` item may be referenced by any number of news articles and learning pages. Framing
changes are shared by all of them (FR-013).

## Migration `20260924_080748_news_hero_media` (generated)

- `ALTER TABLE media ADD COLUMN sizes_card_url varchar, …, sizes_card2x_filename varchar` plus
  indexes on both `*_filename` columns. (`focal_x`/`focal_y` already exist.)
- `ALTER TABLE news ADD COLUMN hero_image_id integer`, FK `news_hero_image_id_media_id_fk` →
  `media(id) ON DELETE SET NULL`, index `news_hero_image_idx`.
- `down`: drops exactly these, with `IF EXISTS` on the constraint and index drops.
- Verified up → down → up on scratch DB `kihub_migtest_020`.
