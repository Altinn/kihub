# Contract B: Employee-facing rendering of news hero images

Surfaces: frontpage «Siste nytt» (`app/(app)/page.tsx` → `NewsCard headingLevel={3}`), `/news`
grid (`NewsCard headingLevel={2}`), and article page `app/(app)/news/[slug]/page.tsx`. All are
Server Components, and this adds **no** client component. Styling uses the existing
`.kihub-media` / `.news-detail__hero` classes and inline sizing only, with no new colours or
tokens (FR-014).

## B1. Pure helpers (`apps/web/src/lib/news-view.ts`)

```ts
type HeroSource =
  | { kind: 'upload'; media: Media }
  | { kind: 'legacy'; url: string }
  | { kind: 'none' };

resolveHeroSource(article: Pick<News, 'heroImage' | 'heroImageUrl'>): HeroSource
pickCardImage(media: Media): { src: string; srcSet?: string; objectPosition: string }
pickArticleImage(media: Media): { src: string; srcSet?: string; width?: number; height?: number; alt: string }
```

- **`resolveHeroSource`** applies the precedence in data-model.md: upload, then legacy, then
  none. A `heroImage` that is `null`, `undefined`, a number, or a `Media` without `url` does not
  count as an upload.
- **`pickCardImage`**:
  - uses `srcSet` = `card 800w, card2x 1600w`, keeping only sizes that exist **and** whose
    `width/height` is within 1% of 1.6. The `w` descriptor is each size's **actual** width. `src`
    is the smallest one included.
  - if neither card size qualifies, `src` falls back to `content`, then `content2x`, then the
    original `url`, with a `srcSet` built from whichever `content`/`content2x` exist.
  - `objectPosition` is always `` `${focalX ?? 50}% ${focalY ?? 50}%` ``.
- **`pickArticleImage`** uses `content`/`content2x` (`760w`/`1520w`), falling back to `url`, never
  a `card*` size. `width`/`height` come from the chosen size, which avoids layout shift. `alt` is
  `media.alt`.
- **Cache-busting (R7)**: every URL these helpers emit has `?v=<Date.parse(media.updatedAt)>`
  appended. If `updatedAt` is missing or can't be parsed, the URL is emitted unchanged.

## B2. `NewsCard`

| Hero source | Markup inside the 16:10 `.kihub-media` well |
|---|---|
| `upload` | `<img src srcSet sizes="(max-width: 719px) 100vw, 50vw" alt="" loading="lazy" decoding="async">` with `object-fit: cover; object-position: <pickCardImage.objectPosition>`, filling the well. |
| `legacy` | Exactly as today: `<img src={heroImageUrl} alt="">`, cover. |
| `none` | Exactly as today: the `kihub-media--placeholder` modifier, with no `<img>`. |

The card image stays `alt=""` in every case. The card is a single link whose accessible name is
the article title, so the image is decorative *inside the card* (013 contract, unchanged).

## B3. Article page

| Hero source | Markup in `.kihub-media.news-detail__hero` |
|---|---|
| `upload` | `<img src srcSet sizes="(max-width: 760px) 100vw, 760px" width height alt={media.alt}>` with `width: 100%; height: auto`, so it has **no** fixed aspect ratio and no `object-fit` crop (FR-006). |
| `legacy` | Exactly as today (`alt=""`, `height: auto`). |
| `none` | No hero block (as today). |

## B4. Guarantees (tested)

| # | Guarantee | Test |
|---|---|---|
| B4.1 | Precedence upload > legacy > none, including null/number/missing-url inputs | unit `news-view.test.ts` (extended) |
| B4.2 | An exact 16:10 card + card2x → srcset with both, plus the focal objectPosition | unit |
| B4.3 | card sizes missing or not 16:10 → fallback to content/url, with the focal objectPosition still emitted | unit |
| B4.4 | Missing focal point → `50% 50%` | unit |
| B4.5 | Article helper never returns a `card*` URL and returns `media.alt` | unit |
| B4.6 | `?v=` appended from `updatedAt`, and omitted when it is invalid | unit |
| B4.7 | `/news` and frontpage render uploaded, legacy and placeholder cards with no broken image and no console errors | manual/browser (quickstart §4) |
