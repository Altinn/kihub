# Implementation Plan: News Hero Images with Editor-Controlled Framing

**Branch**: `020-news-hero-media` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/020-news-hero-media/spec.md`

## Summary

News gets a managed hero image. A new optional `heroImage` upload field references the existing
`media` library, and the old `heroImageUrl` text field is kept as a fallback. Payload's built-in
**focal point** and **crop** tools are turned on for `media`, and two focal-framed card sizes are
added (`card` 800×500, `card2x` 1600×1000, both never enlarged).

On the employee side, pure helpers in `lib/news-view.ts` resolve the hero source (upload, then
legacy, then none) and pick the image:
- **Cards** (frontpage «Siste nytt» and `/news`) get a 16:10 srcset. If a card size is missing or
  not exactly 16:10, they fall back to a reading-width source. Either way,
  `object-position: focalX% focalY%` keeps the framing correct.
- **The article page** shows the full, uncropped reading-width image with its alt text.

Media URLs are cache-busted with `?v=updatedAt`, because re-framing overwrites same-named files.
There is one additive migration, no new dependency, and no new client component.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 22

**Primary Dependencies**: Next.js 16.3.3 (App Router, Server Components), Payload CMS 3.85.2
(`@payloadcms/db-postgres`, `@payloadcms/storage-azure` 3.85.2), sharp 0.35 (already wired as
`sharp` in `payload.config.ts`), Designsystemet 1.18 + the kihub token layer. **No new
dependencies.**

**Storage**: PostgreSQL (new columns on `media` and `news`). Upload files go to disk locally and
to the private Azure Blob container `kihub-media` in production (existing `MEDIA_STORAGE_MODE`).

**Testing**: Vitest 4.1.11. Unit tests for the pure helpers, and integration tests against the
local Postgres for the upload sizes, focal framing, the relationship and deletion.

**Target Platform**: Azure Container Apps (Linux), evergreen browsers.

**Project Type**: Web application (single `apps/web` Next.js + Payload app).

**Performance Goals**: Card images ≤ ~1600 px wide instead of arbitrary originals. There are no
extra queries: `heroImage` is populated in the existing news reads (`depth: 1`).

**Constraints**:
- Card sizes are never enlarged (FR-004).
- Learning image sizes and appearance stay unchanged (FR-011).
- The migration only adds things (FR-009).
- No new client components.
- Norwegian admin labels.

**Scale/Scope**: Tens to low hundreds of news articles, and the media library has a similar
number of images. The change touches 2 collections, 3 read functions, 2 render sites and 1
migration.

## Constitution Check

*GATE: must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle / constraint | Assessment |
|---|---|
| I, III, IV, V, VI (Registry) | **N/A**: News is native content, not an artifact. |
| II. Payload owns native content | **PASS**: hero images become Payload-owned `media` records. The constitution already says media "uploaded for them" is Payload-owned data (Security § Data ownership). |
| VII. Start Simple | **PASS**: this reuses Payload's built-in focal/crop and the existing `media` collection and storage adapter. There is no custom image pipeline and no bulk reprocessing. The legacy field is kept instead of building an import. |
| VIII. Two surfaces | **PASS**: the editor side is plain Payload admin (exempt from the Design System), and the employee side is the existing pages. |
| Design System (employee app) | **PASS**: no new visual component. The existing `.kihub-media` well and `.news-detail__hero` are reused, and the only style additions are `object-position`, sourced from data, plus `srcset`/`sizes`. No hardcoded colour, type or spacing values. |
| Contract-first (collection shapes) | **PASS**: the collection changes are recorded in data-model.md and contracts/cms-news-hero.md, and types are regenerated. |
| Testing gate | **PASS (planned)**: the new render rules have unit tests. The upload sizes, focal framing, no-enlargement, the learning regression and the relationship/deletion all have integration tests. Access rules are unchanged and still covered by the existing tests. |
| Product Modules | **PASS**: this extends News. It is not a new module, so no amendment is needed. |

**Result: PASS, with no violations.** Re-checked after Phase 1: still PASS. The design added no
dependency, no client component and no new token.

## Project Structure

### Documentation (this feature)

```text
specs/020-news-hero-media/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R11
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cms-news-hero.md          # A: back-office content model
│   └── hero-image-rendering.md   # B: employee-facing rendering
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks; Notes = implementation record
```

### Source Code (touched)

```text
apps/web/
├── src/
│   ├── collections/
│   │   ├── News.ts                 # + heroImage upload field; heroImageUrl relabelled (legacy)
│   │   └── Media.ts                # focalPoint/crop on; + card/card2x sizes; ungrouped; descriptions
│   ├── lib/
│   │   ├── news.ts                 # depth: 1 on the three reads
│   │   ├── media-storage.ts        # + resolveMediaSelfFetchAllowList (R6)
│   │   └── news-view.ts            # + resolveHeroSource / pickCardImage / pickArticleImage
│   ├── components/
│   │   └── NewsCard.tsx            # renders HeroSource (upload | legacy | none)
│   ├── app/(app)/news/[slug]/page.tsx   # article hero via pickArticleImage
│   ├── migrations/
│   │   ├── 20260924_080748_news_hero_media.{ts,json}   # generated, additive
│   │   └── index.ts
│   └── payload-types.ts            # regenerated
└── tests/
    ├── unit/news-view.test.ts              # extended (B4.1–B4.6)
    ├── integration/media-upload.test.ts    # extended (A3.1, A3.3, A3.4)
    └── integration/news-hero.test.ts       # new (A3.2, A3.5)
```

**Structure Decision**: This uses the existing single-app layout. The render logic lives as pure
functions in `lib/news-view.ts`, following the 013 pattern (`parseNewsPageParam`,
`formatNewsDate`), so the precedence and fallback rules are unit-testable without rendering React.

## Phase 0 / Phase 1 outputs

- [research.md](./research.md): R1 field choice · R2 focal/crop semantics (verified in Payload
  source) · R3 sizes and why `withoutEnlargement: true` must be explicit · R4 card fallback plus
  CSS focal positioning · R5 article image and the learning regression · **R6 Azure re-fetch
  risk** · R7 cache-busting · R8 depth · R9 admin grouping · R10 migration · R11 scope.
- [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Re-framing an **already-saved** image in Azure mode fails because Payload re-fetches the file over the public origin (R6) | An editor can't adjust an existing image in prod | Handled up front: `skipSafeFetch` is scoped to our own hostname and `/payload-api/media/file/*` through the new optional env `MEDIA_PUBLIC_HOSTNAME` (T010). The upload-drawer flow is unaffected either way. Confirmed after deploy (quickstart §6). |
| A browser or proxy serves stale framing after a refocus (R7) | The card shows old framing | `?v=updatedAt` on every emitted media URL |
| Migration collides with the unmerged `019-footer-contacts` migration | A merge conflict in `migrations/index.ts` | Both are additive and touch different tables. Rebase and regenerate the index order on whichever merges second. |
| Local push-mode DB prompts during tests (017 gotcha) | The suite hangs | Additive-only, so a prompt is unlikely. If it happens, apply the `up()` SQL with `psql`. |

## Complexity Tracking

No constitution violations, so nothing to justify.
