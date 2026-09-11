# Implementation Plan: Distinct destinations for frontpage banner links

**Branch**: `016-fix-frontpage-banner-links` | **Date**: 2026-09-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/016-fix-frontpage-banner-links/spec.md`

## Summary

The frontpage "KI Prosjekter i BOD" tile currently links to `/registry`, the same destination as
the unrelated "Verktøy" tile (Altinn/kihub#135). There is no existing page or content model for "AI
projects in BOD" in KI Hub. This plan adds a fifth native-content module — **Projects** — modeled
directly on the existing **News** module (Constitution Principle II: native platform content, no
Git source): a new `projects` Payload collection (title, slug, summary, richText body, draft/
published status, manual order), a new `/prosjekter` list page and `/prosjekter/[slug]` detail
page, and a Postgres migration. The frontpage tile default href is updated to `/prosjekter`; the
"Verktøy" tile is left untouched.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), React Server Components

**Primary Dependencies**: Payload CMS 3.85 (`@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`), existing `apps/web` app

**Storage**: PostgreSQL via Payload's postgres adapter, migration-backed (`apps/web/src/migrations/`)

**Testing**: Vitest (`pnpm --filter web test`), matching existing collection/access-control test patterns (e.g. News, Learning)

**Target Platform**: Server-rendered web app, deployed on Azure Container Apps

**Project Type**: Web application — single `apps/web` Next.js + Payload app (per Constitution "Technology & Architecture Constraints")

**Performance Goals**: N/A beyond existing page-load norms — a simple editorial list, no new perf-sensitive path

**Constraints**: Must not touch the Registry/Artifact model (Constitution Principle III: Projects is native content, not an artifact); "Verktøy" behavior must be unchanged (spec FR-002)

**Scale/Scope**: A handful to a few dozen AI-project entries expected; no pagination required at this scale (unlike `/news`, which paginates)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (Git is Source of Truth for AI Artifacts)** — N/A. Projects are native content with
  no Git source, same as News/Events/Learning. PASS.
- **Principle II (Payload Owns Enterprise Context and Native Content)** — Projects content is fully
  owned by Payload, authored in KI Hub, no external source of truth. PASS.
- **Principle III (Every AI Asset is an Artifact)** — An "AI project in BOD" is not an AI asset
  (skill/prompt/workflow/etc.) and MUST NOT be modeled as an `Artifact` type. It gets its own
  collection, exactly as News/Events/Learning do. PASS.
- **Principle IV/V/VI (Registry-specific: identity, APM distribution, governance)** — N/A, Projects
  is outside the Registry module, same carve-out already granted to Learning. PASS.
- **Principle VII (Start Simple, Design for Growth)** — Single flat collection (no
  category/subcategory hierarchy like Learning) because the spec only calls for a flat list of
  projects with title/summary/body; no speculative hierarchy added. PASS.
- **Principle VIII (Two Surfaces)** — Employee-facing `/prosjekter` pages built on the Designsystemet
  token layer, matching News/Learning page conventions; authoring happens in the Payload admin
  back-office (`/cms`), exempt from the Designsystemet requirement. PASS.
- **Product Modules enumeration** — Adding "Projects" as a fifth module is the same kind of change
  that added "Learning" in constitution v3.1.0 (a MINOR, purely-additive amendment to keep the
  module list truthful). A documentation task will bump the constitution to v3.2.0 alongside this
  feature, mirroring that precedent.

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/016-fix-frontpage-banner-links/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   ├── projects-collection.md   # Payload `projects` collection contract
│   └── projects-routes.md       # /prosjekter route behavior contract
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

This feature extends the existing single `apps/web` application (Next.js App Router + Payload CMS
in one app, per the Constitution's Technology & Architecture Constraints) — no new project/app is
created.

```text
apps/web/src/
├── collections/
│   └── Project.ts                       # NEW — Payload collection, modeled on News.ts
├── lib/
│   ├── projects.ts                      # NEW — read layer, modeled on lib/news.ts
│   └── site-content-defaults.ts         # EDIT — "KI Prosjekter i BOD" tile href → /prosjekter
├── globals/
│   └── Frontpage.ts                     # EDIT — tiles field defaultValue mirrors the above
├── components/
│   └── ProjectCard.tsx                  # NEW — list card, modeled on NewsCard.tsx
├── app/(app)/
│   └── prosjekter/
│       ├── page.tsx                     # NEW — list page, modeled on news/page.tsx (no pagination)
│       └── [slug]/page.tsx              # NEW — detail page, modeled on news/[slug]/page.tsx
├── payload.config.ts                    # EDIT — register `Project` in `collections`
└── migrations/
    └── <timestamp>_projects.ts (+.json) # NEW — generated via `pnpm --filter web migrate:create`
```

**Structure Decision**: Reuse the existing News module's file layout one-to-one (collection → read
lib → card component → list/detail routes) because it is the closest existing precedent for a
flat, editor-authored, published/draft content type with no Registry/governance coupling. No new
top-level structure, package, or app is introduced.
