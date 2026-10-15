# Implementation Plan: Content Source Seam (Payload → Umbraco migration, step 1)

**Branch**: `023-content-source-seam` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/023-content-source-seam/spec.md`

## Summary

This feature makes the employee portal stop depending on which CMS stores editorial content,
without changing a single byte of what employees or editors see. It is step 1 of the strangler-fig
move of editorial content to Umbraco ("option 2": headless Umbraco for editorial content, the
registry stays on Payload/Postgres).

Four pieces:

1. **View models.** `lib/content/types.ts` defines KI Hub-owned shapes: `NewsArticle`, `EventItem`,
   `ProjectItem`, `LearningArticle`, `ContentImage`, `NewsHero`, `Author`, `RichTextContent`. Pages,
   components and pure view helpers consume these instead of `@/payload-types`.
2. **Per-module sources.** Each module (news, events, projects, learning, frontpage, siteChrome)
   reads through a port (`lib/content/ports.ts`) chosen by `CONTENT_SOURCE_<MODULE>`:
   - `payload` is the only source and the default;
   - a bad value fails fast at boot, and again on first use.
   The existing `lib/<module>.ts` read functions keep their names as one-line facades. The Payload
   queries move verbatim into `lib/content/payload/*`, with the mappers.
3. **Rich text.** `<RichTextBody value profile>` is the single rich-text entry point. Its lexical
   branch (`components/rich-text/LexicalRichText.tsx`) is the only employee-app importer of Payload's
   renderer. The learning code/video/image block components take neutral props.
4. **Proof.** A DB-free golden-HTML parity harness (fake `getPayload`, fixed fixtures and clock)
   renders every editorial surface. It is **captured on unchanged code first**, and every later task
   must match it without `-u`. An ESLint `no-restricted-imports` guard keeps Payload out of the
   employee surface.

No schema change, migration, new dependency, URL change, `/cms` change or infra change.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 22

**Primary Dependencies**: Next.js 16.3.3 (App Router, Server Components), Payload CMS 3.85.2
(`@payloadcms/richtext-lexical` renderer, `@payloadcms/db-postgres`), React 19.2
(`react-dom/server` for the parity harness, already a dependency), Designsystemet 1.18 + the kihub
token layer, shiki 4.4.3 (unchanged). **No new dependency.**

**Storage**: PostgreSQL 16 via Payload. **Unchanged**: no collection, global, field or migration
touched.

**Testing**: vitest 4.1 (`tests/**/*.test.ts`, node env, files run sequentially). New unit suites:
`content-source-config`, `content-mapping`, `content-parity` (goldens in `tests/unit/__parity__/`),
`content-stand-in`. Existing integration suites (`news-access`, `news-hero`, `events-access`,
`projects-access`, `learning-*`, `site-content-access`) are updated only where they assert on the
read-layer return shape.

**Target Platform**: Azure Container Apps (`kihub-web`), Linux container, Node 22 standalone build.

**Project Type**: Web application (one Next.js + Payload app, `apps/web`, plus `packages/*`).

**Performance Goals**: The same queries per page as today (SC-006). Mapping is synchronous and in
memory over ≤ 200 docs.

**Constraints**:
- Byte-identical employee HTML for the same content (FR-001).
- Draft exclusion preserved by construction (FR-014).
- Registry untouched (FR-015).
- `CONTENT_SOURCE_*` all optional, with no deploy-time action.

**Scale/Scope**:
- 6 modules, 12 read functions.
- 13 employee-facing files lose their Payload imports.
- About 10 page surfaces plus the ICS route and the site header/footer covered by goldens.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design: still PASS.*

| Principle / constraint | Assessment |
|---|---|
| I. Git is the source of truth for AI artifacts | N/A: the registry is out of scope and untouched. |
| II. Payload owns enterprise context and native content | **PASS.** Payload remains the only and default source for all native content. The seam changes *how pages read* content, not who owns it. Amending II to name Umbraco is deferred to the first feature that serves a module from Umbraco (research R11). |
| III–VI. Artifact model, identity, distribution, governance | N/A: no registry change. |
| VII. Start simple, design for growth | **PASS.** The seam is justified by a concrete, management-decided next phase (the Projects pilot on Umbraco), the exact "seam for a known future need" VII allows. YAGNI is kept: there is no CMS-neutral rich-text AST, no second source, no runtime toggle, and `RichTextContent` has one member (R5). |
| VIII. Two surfaces | **PASS.** Employee app output and the `/cms` back-office are both unchanged. |
| Stack constraint (Next.js + Payload, one app) | **PASS.** Unchanged. |
| Design System constraint | **PASS.** No new UI. Components keep their token-layer classes and Designsystemet usage. |
| Contract-first | **PASS.** Payload collection shapes are untouched. The new seam is documented as contracts (`contracts/content-source.md`, `contracts/rich-text.md`). |
| Testing gate (new modules test access control) | **PASS.** Access rules are unchanged and their suites still run. New tests cover source selection, mapping and parity (FR-018). |
| Reviews: added complexity justified | **PASS.** See the "Complexity Tracking" table: one new folder (`lib/content/`) and six one-line facades, each tied to FR-005–FR-016. |

No violations. No amendment.

## Project Structure

### Documentation (this feature)

```text
specs/023-content-source-seam/
├── plan.md              # This file
├── research.md          # R1–R12
├── data-model.md        # view models + Payload mapping tables + ports
├── quickstart.md        # gates, guardrail, browser parity, fail-fast, release notes
├── contracts/
│   ├── content-source.md   # settings, validation, ports + guarantees, facades, registry
│   └── rich-text.md        # RichTextContent, <RichTextBody>, profiles, neutral block props
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
apps/web/
├── eslint.config.mjs                     # + no-restricted-imports override (R9)
├── src/
│   ├── instrumentation.ts                # + readContentSourceConfig at boot, all NODE_ENVs (R6)
│   ├── lib/
│   │   ├── content/                      # NEW — the seam
│   │   │   ├── types.ts                  # view models (data-model.md)
│   │   │   ├── rich-text.ts              # RichTextContent, LexicalDocument
│   │   │   ├── ports.ts                  # NewsSource … SiteChromeSource
│   │   │   ├── config.ts                 # readContentSourceConfig, ContentSourceConfigError
│   │   │   ├── registry.ts               # SOURCES, resolveModuleSources, newsSource() …
│   │   │   └── payload/                  # the ONLY lib code importing Payload for editorial content
│   │   │       ├── client.ts             # getPayload + PUBLISHED (from payload-queries.ts)
│   │   │       ├── media.ts              # toContentImage, toAuthor
│   │   │       ├── news.ts               # queries from lib/news.ts + toNewsArticle + resolveHeroSource
│   │   │       ├── events.ts             # queries from lib/events.ts + toEventItem
│   │   │       ├── projects.ts           # queries from lib/projects.ts + toProjectItem
│   │   │       ├── learning.ts           # queries from lib/learning.ts + toLearningArticle
│   │   │       ├── site-content.ts       # mergeFrontpage/mergeSiteChrome + globals reads
│   │   │       └── index.ts              # payloadSources: ModuleSources
│   │   ├── news.ts | events.ts | projects.ts | learning.ts | site-content.ts   # → facades
│   │   ├── news-view.ts                  # helpers retyped to ContentImage; resolveHeroSource moves out
│   │   ├── site-content-defaults.ts      # RichTextValue→LexicalDocument (moved), FrontpageDefaults
│   │   └── payload-queries.ts            # removed (folded into content/payload/client.ts)
│   ├── components/
│   │   ├── RichTextBody.tsx              # NEW — single rich-text entry point
│   │   ├── rich-text/LexicalRichText.tsx # NEW — lexical renderer, standard + learning converters
│   │   ├── LearningBody.tsx              # wrapper only → <RichTextBody profile="learning">
│   │   ├── LearningImage.tsx | LearningCodeBlock.tsx | LearningVideo.tsx  # neutral props
│   │   ├── NewsCard.tsx | ProjectCard.tsx | NextEventCard.tsx
│   │   ├── EventsDayList.tsx | EventsMonthCalendar.tsx | EventsTimeline.tsx
│   │   └── SubscriptionsBanner.tsx       # → RichTextBody
│   └── app/(app)/
│       ├── news/[slug]/page.tsx | events/[slug]/page.tsx | prosjekter/[slug]/page.tsx
│       └── laering/[slug]/page.tsx       # view-model fields instead of relation unions
└── tests/
    └── unit/
        ├── content-source-config.test.ts # NEW
        ├── content-mapping.test.ts       # NEW
        ├── content-parity.test.ts        # NEW — golden HTML harness
        ├── content-stand-in.test.ts      # NEW — US3
        └── __parity__/*.html             # NEW — goldens, captured BEFORE the refactor
documentation/runtime-config.md           # + CONTENT_SOURCE_* rows
```

**Structure Decision**: Everything stays inside `apps/web`. The seam is a new `lib/content/`
folder: neutral types, ports, config and registry at its root, and Payload adapters under
`lib/content/payload/`. Existing `lib/<module>.ts` files remain the pages' only entry point.
Nothing moves to `packages/`, because the seam is app-internal and has exactly one consumer.

## Implementation order (for /speckit-tasks)

1. **Parity harness first, on unchanged code.**
   - Spike rendering one page outside Next (R8 risk).
   - Build the fake `getPayload` and the fixtures.
   - Capture all goldens.
   - Commit them alone.
2. **Foundations**: `types.ts`, `rich-text.ts`, `ports.ts`, `config.ts`, `registry.ts`, plus their
   unit tests. Add the boot validation to `instrumentation.ts`.
3. **Rich text**: `RichTextBody` + `LexicalRichText`. The block components take neutral props.
   `LearningBody` and the four direct `<RichText>` call sites switch over. Parity stays green.
4. **Per module, smallest first**: projects → events → news (+ `ContentImage`, `NewsHero`,
   `news-view` retype) → learning → frontpage/siteChrome. For each one: move the queries, add the
   mapper and its tests, turn the facade into delegation, retype the components/pages, and adjust
   the integration-test shape assertions. Parity stays green after each module.
5. **Stand-in test (US3)** and the **ESLint guard** (R9). Delete `payload-queries.ts`.
6. **Docs + gates**: `runtime-config.md`, full suite, lint, `tsc`, `next build` on a scratch DB,
   quickstart §2–§5 (including the R6 `next start` observation).

## Complexity Tracking

> No Constitution Check violations. Recorded for the review gate ("added complexity justified"):

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| `lib/content/` (types, ports, config, registry, Payload adapters) | FR-005/FR-010: pages must not know the CMS, and each module must be switchable | Re-exporting Payload types under new names leaves pages coupled to Payload's relation unions (R2) |
| Two rich-text profiles | Byte-identical output: news/events/projects use Payload's *default* upload converter, learning uses custom ones | One profile changes inline-image markup on non-learning pages (R5) |
| Golden-HTML parity harness | SC-001 needs a repeatable byte-level check in CI. It is also the acceptance target for the Umbraco adapters | Manual browser diff is not repeatable; DB snapshots are non-deterministic (R8) |
