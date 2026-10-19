# Implementation Plan: Frontpage hero design element

**Branch**: `024-hero-design-element` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/024-hero-design-element/spec.md`

## Summary

Swap the frontpage hero's decorative art from the raster three-people illustration
(`apps/web/public/brand/hero-illustration.jpg`, 2000×1660, 334 KB) to element 1 of Digdir's
"Designelementer (For skjerm)" sheet: a coral circle overlapped by a rotated navy square. The PDF
is pure vector, so the element is extracted as a small hand-cleaned SVG
(`apps/web/public/brand/hero-design-element.svg`) and `FrontpageHero` points at it. One component
line changes, one asset is added and one is deleted. No CSS, copy, CMS or schema changes.

## Technical Context

**Language/Version**: TypeScript 5 / React 19 (Next.js 16.3.3 App Router)

**Primary Dependencies**: `next/image` (already used in the hero)

**Storage**: N/A (static file in `apps/web/public/brand/`)

**Testing**: no existing test covers the hero image path; verified in the browser (quickstart)

**Target Platform**: KI Hub web portal (`apps/web`)

**Project Type**: web application (monorepo, `apps/web`)

**Performance Goals**: smaller than the 334 KB JPEG it replaces (target < 2 KB)

**Constraints**: decorative image (`alt=""`, `role="presentation"`), same 420px max width;
the art slot stays hidden below the existing hero breakpoint (`portal.css` `.fp-hero__art`)

**Scale/Scope**: 1 component, 1 asset in, 1 asset out

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v4.0.0:

- **Design System constraint**: PASS. This is a presentational brand asset inside an existing
  kihub component, and it uses Digdir's own design element. No Designsystemet primitive is
  restyled.
- **Principle II / IX (single source of truth, Umbraco migration)**: PASS. The hero art is a
  static file in the repo, not CMS content, both before and after. It does not touch
  `CONTENT_SOURCE_*` or either CMS.
- **Registry principles (I/III–VI)**: N/A. This is not an artifact.
- **Start Simple / YAGNI**: PASS. No new field, prop or config. The path stays hardcoded, as
  it is today.

Post-design re-check: PASS (no change).

## Project Structure

### Documentation (this feature)

```text
specs/024-hero-design-element/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R3
├── quickstart.md        # browser verification
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

`data-model.md` and `contracts/` are omitted. The feature has no data and no interface.

### Source Code (repository root)

```text
apps/web/
├── public/brand/
│   ├── hero-design-element.svg   # NEW — element 1, viewBox cropped to the shapes
│   └── hero-illustration.jpg     # DELETED
└── src/components/FrontpageHero.tsx   # src + intrinsic width/height + unoptimized
```

**Structure Decision**: Existing web app layout. The asset goes next to `kitt-logo.svg` in
`public/brand/`.

## Complexity Tracking

None.
