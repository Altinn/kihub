# Implementation Plan: Editorial Drafts with Preview, and CMS-Managed Pages

**Branch**: `027-drafts-preview-pages` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/027-drafts-preview-pages/spec.md`

## Summary

Turn on Payload's built-in **versions + drafts** (autosave, history/restore) for
News, KI Læring pages, Projects and Events, replacing the hand-rolled `status` select. Then add a
**Forhåndsvis** button that opens the draft on the real employee site through Next.js draft mode. The
button is gated by the visitor's own Entra session plus a *fresh* contributor+ role lookup, with no
shared secret. One migration copies `status` → `_status` exactly and backfills one version row per
existing document, so old content is previewable too. Add a flat **`pages`** collection (title,
address, ingress, the KI Læring rich-text editor) served at `/<slug>` by a single dynamic segment
under `(app)`. Built-in routes always win, and a reserved-address list guards against collisions,
kept in sync by a route-tree test. Scheduled publishing was dropped during implementation
(2026-11-05): there is no job queue or runner. Constitution 3.2.0 →
3.3.0 adds Pages as a module.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), Node 22

**Primary Dependencies**: Payload **3.92.1** (`payload`, `@payloadcms/next`, `@payloadcms/richtext-lexical`,
`@payloadcms/db-postgres`, `@payloadcms/storage-azure`), Next.js **16.4.1** App Router, Auth.js (Entra),
`@digdir/designsystemet-react` 1.18.0. **No new dependencies** (drafts and draft mode are built in).

**Storage**: Azure PostgreSQL (local: docker `kihub-postgres` :55432). New: version tables per
draft-enabled collection, `pages` + `_pages_v`. Media unchanged (Azure Blob / disk).

**Testing**: vitest — unit (`tests/unit`) + integration against Postgres (`tests/integration`), the
local-API `overrideAccess: false` access-matrix pattern; lint; `tsc --noEmit`; `next build` against a
migrated scratch DB with `AUTH_MODE=entra`; browser walkthrough (quickstart §3).

**Target Platform**: Azure Container Apps (`kihub-web`, scale 0–1, standalone Next server).

**Project Type**: Web application (single `apps/web` Next.js + Payload app, two surfaces).

**Performance Goals**: no measurable change to employee page reads. The published path is the same
single indexed query, and preview adds one `users` lookup per request (cached per request) for
editors only. Autosave every 2 s while an editor types.

**Constraints**: Zero draft leakage on any reader surface, including the Payload REST/GraphQL API
(`readVersions`). No new client components. Norwegian UI. Migration must run inside
`prodMigrations` at boot (no CLI in the image). Scale-to-zero means there is no always-on cron.

**Scale/Scope**: about 5 editors and the whole Digdir staff as readers. Each collection holds 10s to
low-100s of documents, with 50 versions max per doc. 5 collections touched, 1 new, 1 migration, and
2 new route handlers + 1 new page route.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / constraint | Assessment |
|---|---|
| I. Git is source of truth for AI artifacts | ✅ Untouched. Pages are native content, not artifacts; the scoping sentence gets "Pages" added (amendment). |
| II. Payload owns enterprise context + native content | ✅ Pages are native Payload content, and versions/drafts are Payload's own mechanism. |
| III. Every AI asset is an artifact | ✅ Pages are explicitly NOT artifacts (own collection), the same as Projects. |
| IV. Stable artifact identity | ✅ N/A (Registry untouched). |
| V. APM distribution | ✅ N/A. |
| VI. Governance is the Registry's core | ✅ N/A. Editorial publishing is not Registry governance. Role gating stays server-side (`access`, `readVersions`, preview route). |
| VII. Start Simple / YAGNI | ✅ Built-in features only, with no new dependencies. Rejected: live preview, nested pages, SEO plugin, layout-block builder, drafts on globals, a staging environment, scheduled publishing and its job runner (research R8/R11/R13/R14). |
| VIII. Two surfaces | ✅ Authoring/publishing stay in `/cms`. The employee app only *renders* drafts for editors in preview and gains no editing UI. Server-side role gate on preview. |
| Design System | ✅ The banner uses Designsystemet `Alert` (a presentational leaf from a Server Component). The page route reuses `LearningBody` + kihub tokens, and new CSS is tokens only. The admin is exempt. |
| Security (Entra, roles server-side) | ✅ Preview requires an Entra session plus a fresh DB role. There's no secret in URLs, the open redirect is closed by `isSafeInternalPath`, `readVersions` stops version leaks. |
| Testing gate (new modules test access + rules) | ✅ Access matrix A1–A8 per collection (including Pages), slug validation, reserved-list drift test, preview-state tests, migration verification. |
| Amendment needed? | **Yes, MINOR 3.2.0 → 3.3.0**: add Pages as a sixth Product Module (R15), with the Learning v3.1.0 / Projects v3.2.0 precedent. This is not a violation, so Complexity Tracking stays empty. |

**Post-design re-check (after Phase 1)**: still PASS. The design adds no services, packages or
dependencies. Shared helpers (`lib/content-versions.ts`, `lib/article-editor.ts`, `lib/preview*.ts`,
`lib/page-slug.ts`) *remove* duplication (three private `isEditor` copies, three local `PUBLISHED`
constants, the editor config).

## Project Structure

### Documentation (this feature)

```text
specs/027-drafts-preview-pages/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R15
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── content-drafts.md   # versions/access config + read-layer contract (A1–A8)
│   ├── preview-route.md    # /api/preview, /api/preview/exit, getPreviewState, banner
│   └── pages.md            # pages collection, validatePageSlug, /<slug> route
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
.specify/memory/constitution.md                 # 3.3.0 amendment (Pages module)

apps/web/src/
├── payload.config.ts                           # + Page
├── collections/
│   ├── News.ts            (changed)            # versions, contentAccess, preview, _status hook, no `status`
│   ├── LearningPage.ts    (changed)            # same + body editor → articleEditor
│   ├── Project.ts         (changed)
│   ├── Event.ts           (changed)
│   └── Page.ts            (NEW)
├── lib/
│   ├── content-versions.ts (NEW)              # CONTENT_VERSIONS, contentAccess
│   ├── article-editor.ts   (NEW)              # lexical editor moved out of LearningPage.ts
│   ├── preview-paths.ts    (NEW, pure)        # previewPathFor, previewUrl, isSafeInternalPath
│   ├── preview.ts          (NEW)              # getPreviewState (React cache, fresh role)
│   ├── page-slug.ts        (NEW, pure)        # PAGE_SLUG_PATTERN, RESERVED_PAGE_SLUGS, validatePageSlug
│   ├── pages.ts            (NEW)              # getPageBySlug
│   ├── payload-queries.ts  (changed)          # PUBLISHED → _status
│   ├── news.ts / learning.ts / projects.ts / events.ts (changed)  # shared PUBLISHED; by-slug(slug, { preview })
│   └── access.ts           (unchanged; now the only isEditor)
├── components/
│   └── PreviewBanner.tsx   (NEW, server)
├── app/
│   ├── (app)/layout.tsx    (changed)          # renders PreviewBanner when active
│   ├── (app)/[slug]/page.tsx (NEW)            # CMS pages
│   ├── (app)/news|laering|prosjekter|events/[slug]/page.tsx (changed)  # pass { preview }
│   ├── (app)/events/[slug]/ics/route.ts (changed: rename only)
│   └── api/preview/route.ts + api/preview/exit/route.ts (NEW)
├── migrations/<ts>_drafts_pages.{ts,json} (NEW) + index.ts
├── payload-types.ts        (regenerated)
├── app/(payload)/cms/importMap.js (regenerate if the admin needs it)
└── styles/portal.css       (changed)          # "027 /<slug> pages" + preview banner spacing, tokens only

apps/web/tests/
├── unit/preview-paths.test.ts, page-slug.test.ts (incl. route-tree drift), route-caching.test.ts (NEW)
└── integration/
    ├── content-drafts.test.ts (NEW: A1–A8 across the 5 collections, table-driven)
    ├── preview-state.test.ts  (NEW: fresh-role gate, fail-closed)
    ├── pages-access.test.ts   (NEW: Pages-specific — reserved/uniqueness/route read)
    └── news-access, news-hero, events-access, learning-access, learning-tree-reads,
        learning-hierarchy, projects-access (changed: status → _status, renamed read fns)

CLAUDE.md                                       # Spec Kit active-feature block → 027
```

**Structure Decision**: Existing single-app layout (`apps/web`), with no new package. Cross-cutting
config goes in small `lib/` modules so that five collection files stay declarative.

## Implementation phases (input for /speckit-tasks)

1. **Foundation** (blocks everything): `content-versions.ts`, `preview-paths.ts` (+ unit tests),
   `PUBLISHED` → `_status`, and remove the private `isEditor`/`PUBLISHED` copies.
2. **US1+US2 core**: apply versions/access/preview to News, LearningPage, Project, Event. Fix the
   News `publishDate` hook and `defaultColumns`. Generate the migration, then hand-edit it (copy
   status → backfill versions → drop status → `IF EXISTS` down patch). Verify it on
   `kihub_migtest_027` first, then apply to `kihub_027`. Regenerate types. Update the existing
   integration tests and add `content-drafts.test.ts`.
3. **Preview surface**: `preview.ts`, `/api/preview`, `/api/preview/exit`, `PreviewBanner`, by-slug
   `{ preview }` in the 4 detail routes, the route-caching test, and `preview-state.test.ts`.
4. **US3 Pages**: `article-editor.ts` extraction (verify `generate:types` gives one
   `LearningYouTubeBlock`), `page-slug.ts` + drift test, `Page.ts`, `pages.ts`, the `(app)/[slug]`
   route + CSS. It has its own second migration (`<ts>_pages`), so Pages stays a separable increment.
   Add `pages-access.test.ts`.
5. ~~**US6 scheduling**~~ — dropped 2026-11-05 (no runner, no scheduled release).
6. **Governance + docs**: constitution 3.3.0, infrastructure note, CLAUDE.md, and the editors'
   release note.
7. **Verification**: suite, lint, `tsc`, `next build` (scratch DB + entra), then the quickstart
   browser walkthrough.

US4 (history) and US5 (autosave) come with step 2 and need only verification.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Version backfill SQL misses a child table (e.g. `news_texts`, `*_rels`) → preview of old docs shows missing tags/relations | Derive the child-table list from the generated migration's `_v_*` tables. The quickstart §1 step 4 check plus a pre-migration-doc preview test. |
| Push-mode hang on the shared dev DB (column DROP) | Per-branch DB clone, with the migration applied via `migrate` before tests (R2). |
| Duplicate `interfaceName` when sharing the YouTube block | Verify at `generate:types`; fall back to config-level `blocks` + `blockReferences` (R11). |
| `readVersions` forgotten on a future collection | It lives in the shared `contentAccess`, and A3 is table-driven over all draft-enabled slugs. |
| A future built-in route collides with a page slug | The route wins by Next precedence, and the drift test fails until `RESERVED_PAGE_SLUGS` is updated (R12). |

## Complexity Tracking

No constitution violations. The constitution amendment (3.3.0) is a planned module addition, not a
deviation.
