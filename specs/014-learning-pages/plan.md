# Implementation Plan: Learning Pages (KI Læring)

**Branch**: `main` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-learning-pages/spec.md`

## Summary

A fourth portal module on the shared foundation: editors curate a learning library in the `/cms`
back-office (categories → subcategories → pages, a fixed two-level hierarchy), and employees read it
at `/laering` behind a persistent left-hand resource navigation, kihub-restyled and Norwegian.

Four new Payload collections — `learning-categories`, `learning-subcategories`, `learning-pages`, and
a general-purpose `media` upload collection, KI Hub's first managed uploads. Page bodies use a
field-level lexical editor with `UploadFeature` for drag-and-drop inline images and Payload's premade
`CodeBlock` for display-only code samples. The employee surface is entirely server-rendered with
**zero new client components**: the sidebar is native `<details>`/`<summary>`, which is what makes the
"works without scripting" requirement (FR-005) true rather than aspirational, and simultaneously
implements "the current page's group is already open" (FR-004) as a server-emitted `open` attribute.

Three findings shaped the design more than anything in the spec:

1. **The JSX converters `<RichText>` uses are synchronous** (research §3), which rules out shiki's
   ordinary async API. Hence `createHighlighterCoreSync` + the JavaScript regex engine — no WASM asset
   in the standalone build, no async component per code block, and grammars compiled once per process.
2. **Payload already ships a premade `CodeBlock`** with a language selector and code editor
   (research §2). We supply a curated 8-language map instead of writing the block, and use the same
   ids for Monaco (admin) and shiki (employee), so no id translation table can drift.
3. **012 already solved "categorical colours without new hues"** (`portal.css:194`). Syntax colours
   become `--shiki-token-*` aliases of existing theme text-role tokens, so no colour value enters the
   system and `styles/kihub/` — synced verbatim from the design project — stays untouched.

Read [research.md](./research.md) first; it records what was verified in the installed packages, and
the two places the spec's requirements pushed back on the obvious implementation.

## Technical Context

**Language/Version**: TypeScript 5.9, Node ≥ 20 (shiki 4 requires it; the repo already targets it)

**Primary Dependencies**: Next.js 16.2.11 (App Router) + Payload CMS 3.85.2 in `apps/web`;
`@payloadcms/richtext-lexical@3.85.2`; `@digdir/designsystemet-react@1.18.0` + the generated KI Hub
theme + the `styles/kihub/` token layer; React 19.2.7.
**New**: `shiki@4.4.3` + `@shikijs/langs@4.4.3` (syntax highlighting) and
`@payloadcms/storage-azure@3.85.2` (blob storage). `@shikijs/langs` is listed explicitly because it is
a *transitive* dependency of shiki and pnpm does not hoist — `@shikijs/langs/shell` does not resolve
from `apps/web` without it (verified; see learning-editor.md §B3). No `@shikijs/themes` is needed, as
the theme is generated rather than imported.
All three are written into `package.json` as **exact versions with no caret or tilde** — the same
convention the Payload/Next/React/Designsystemet entries already follow, and not the `^` style used
by the incidental dev dependencies. For `@payloadcms/storage-azure` this is not a style choice: its
`peerDependencies` is `{ payload: "3.85.2" }` exactly, so a range would resolve to something that
violates the peer constraint (latest is already 3.87.1). It must move in lockstep with any future
Payload bump. `sharp` is already present, so image sizes need no new package.

**Storage**: PostgreSQL via `@payloadcms/db-postgres` (four new tables, one additive migration
registered in `src/migrations/index.ts` for `prodMigrations`); uploaded media on the local filesystem
in development and Azure Blob Storage in deployed environments, selected by `MEDIA_STORAGE_MODE`.

**Testing**: vitest 4.1.9 — `tests/unit/` for pure logic, `tests/integration/` for Payload paths
(`environment: 'node'`, `fileParallelism: false`, env must be exported:
`set -a; source apps/web/.env; set +a`).

**Target Platform**: Server-rendered web (Azure Container Apps), modern browsers, phone to desktop
from 360 px up.

**Project Type**: Web application — one Next.js + Payload app, two surfaces (employee app + `/cms`
back-office).

**Performance Goals**: The resource-navigation tree costs **exactly three Payload queries** at
`depth: 0` regardless of library size, with in-memory assembly — no N+1, no per-category query
(SC-010). The highlighter is a module-scope singleton, so grammars compile once per server process,
not per request or per code block.

**Constraints**: No horizontal scrolling at any width ≥ 360 px, including pages with wide code blocks
(FR-006). Every colour/type/space value from `--kihub-*` tokens; no restyled Designsystemet primitive
(FR-034). WCAG 2.1 AA contrast including highlighted code (FR-035). Navigation and reading must work
with scripting disabled (FR-005). Code samples are inert — never executed, never passed through an
HTML-string path (FR-027, FR-030). Norwegian bokmål throughout (FR-036).

**Scale/Scope**: ~10 categories, ~30 subcategories, ~100 published pages. 4 new collections, 2 new
routes, 2 new `lib/` modules + a highlighter module, ~6 new components, one `portal.css` section, one
migration, 8 new test files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against **v3.1.0** (amended for this feature — Learning is now the fourth Product Module).

| Gate | Verdict | Evidence |
|---|---|---|
| **I. Git is the source of truth for AI artifacts** | ✅ N/A by scope | Learning is native platform content; v3.1.0 extends Principle I's exclusion to it explicitly. No artifact content is stored or touched. |
| **II. Payload owns enterprise context and native content** | ✅ Pass | Learning content and its uploaded media are fully Payload-owned — exactly what v3.1.0's native-content clause now names, including media assets. |
| **III. Every AI asset is an artifact** | ✅ N/A by scope | Learning pages are their own collections and are **not** forced into the `Artifact` model; v3.1.0 states this. |
| **IV. Stable artifact identity** | ✅ N/A | No artifact identity involved. |
| **V. Git-centric, APM-compatible distribution** | ✅ N/A | No installation surface. Code samples are display-only and explicitly never executed (FR-027). |
| **VI. Governance is the core value of the Registry** | ✅ N/A by scope | Registry governance untouched. Learning uses only draft/published, deliberately not wired into the governance matrix — the same call News made (007 research §3). |
| **VII. Start simple, design for growth** | ✅ Pass | Fixed two levels instead of a self-referencing tree; explicit `order` instead of experimental fractional indexing; no `publishDate` field where `updatedAt` suffices; no focal point/crop; search, versioning, progress tracking all out of scope with seams left open. |
| **VIII. Two surfaces** | ✅ Pass | Authoring is entirely `/cms` (exempt from the design system); the employee app stays read-first. Nothing admin-shaped is added to the employee surface. Role gating is server-side on every collection. |
| **Design System (mandatory foundation)** | ⚠️ Pass with one recorded deviation | All styling via `--kihub-*`/`--ds-*` tokens in a new `portal.css` section; `styles/kihub/` untouched; no Designsystemet primitive restyled or forked; `CopyButton`'s Designsystemet `Button` reused as-is. The syntax palette needs more than one chromatic role — see Complexity Tracking. |
| **Security/authz** | ✅ Pass | Contributor+ writes and published-only reads enforced in collection access rules **and** the read layer (defence in depth, the News posture). Both routes sit in `(app)`, so `requireSession` gates them. SVG uploads refused. |
| **Testing gate** (v3.1.0 names Learning explicitly) | ✅ Pass | Access control, the FR-014 validation rule and the FR-016 delete refusal are integration-tested via the API path; tree assembly, slugs, dates and the highlighter fallback are unit-tested. See research §15. |
| **Contract-first** | ✅ Pass | Four contracts in `contracts/`; the lexical stored shape is pinned there rather than the `@experimental` factory that produces it. |

**Post-design re-check**: no gate changed. The single Design System deviation was known before Phase 0
and is narrowed, not widened, by the design (four roles, aliases only, confined to code blocks).

## Project Structure

### Documentation (this feature)

```text
specs/014-learning-pages/
├── plan.md                       # This file
├── spec.md                       # Requirements (40 FR, 12 SC, 4 stories)
├── research.md                   # Phase 0 — 15 sections, all decisions resolved
├── data-model.md                 # Phase 1 — 4 collections + the derived tree
├── quickstart.md                 # Phase 1 — run, seed, validate, deploy notes
├── contracts/
│   ├── learning-read.md          # lib/learning.ts (§A) + lib/learning-view.ts (§B)
│   ├── learning-editor.md        # lexical config (§A) + employee rendering (§B) + palette (§C)
│   ├── learning-page-ui.md       # /laering and /laering/[slug] UI guarantees
│   └── media-storage.md          # media collection, env-selected storage, loud failure
├── checklists/requirements.md    # Spec quality gate — 16/16
└── tasks.md                      # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── collections/
│   │   ├── LearningCategory.ts        # NEW  title, description, order + beforeDelete (no slug)
│   │   ├── LearningSubcategory.ts     # NEW  title, order, required category ref + beforeDelete
│   │   ├── LearningPage.ts            # NEW  body richText, status, slug, refs, filterOptions + hooks
│   │   └── Media.ts                   # NEW  upload collection: mimeTypes, 2 imageSizes, alt only
│   ├── lib/
│   │   ├── learning.ts                # NEW  read layer — 3 queries, always PUBLISHED
│   │   ├── learning-view.ts           # NEW  pure: buildLearningTree, hrefs, nb-NO date, lang map
│   │   ├── learning-code.ts           # NEW  sync shiki singleton + plain fallback
│   │   ├── media-storage.ts           # NEW  MEDIA_STORAGE_MODE selector, throws when misconfigured
│   │   ├── site-content-defaults.ts   # EDIT add "KI Læring" to nav + footer defaults
│   │   └── slug.ts                    # REUSE unchanged
│   ├── components/
│   │   ├── LearningNav.tsx            # NEW  <details> sidebar tree (server component)
│   │   ├── LearningBody.tsx           # NEW  <RichText> + the two custom converters
│   │   ├── LearningCodeBlock.tsx      # NEW  <pre> + tokens as React elements + CopyButton
│   │   ├── LearningImage.tsx          # NEW  <figure> + sized image + alt/decorative
│   │   └── CopyButton.tsx             # EDIT Norwegian labels ("Kopier"/"Kopiert")
│   ├── app/(app)/laering/
│   │   ├── layout.tsx                 # NEW  two-column shell + sidebar on both routes
│   │   ├── page.tsx                   # NEW  overview from category descriptions
│   │   └── [slug]/page.tsx            # NEW  the learning page
│   ├── styles/portal.css              # EDIT new "==== 014 /laering ====" section + palette aliases
│   ├── migrations/
│   │   ├── <ts>_learning_pages.ts     # NEW  generated, additive
│   │   └── index.ts                   # EDIT register as the third entry
│   └── payload.config.ts              # EDIT + 4 collections, + plugins array (azureStorage)
├── tests/
│   ├── unit/learning-view.test.ts     # NEW  tree assembly: order, pruning, current flags
│   ├── unit/learning-slug.test.ts     # NEW  handle derivation + stability
│   ├── unit/learning-date.test.ts     # NEW  nb-NO Oslo "sist oppdatert"
│   ├── unit/learning-code.test.ts     # NEW  highlighter fallback + var() colours
│   ├── unit/media-storage.test.ts     # NEW  mode selection + loud failure
│   ├── integration/learning-access.test.ts     # NEW  roles + no draft leaks
│   ├── integration/learning-hierarchy.test.ts  # NEW  FR-014 via API, FR-016 delete refusal
│   └── integration/media-upload.test.ts        # NEW  mime/size refusals, alt required
└── .env.example                       # EDIT MEDIA_STORAGE_MODE + Azure variables
```

**Structure Decision**: The established `apps/web` layout, unchanged — collections in
`src/collections/`, a read layer plus a pure view module in `src/lib/`, presentational components in
`src/components/`, employee routes under `src/app/(app)/`, feature CSS as a new section of
`portal.css`. Two things follow house precedent deliberately: the read-layer / pure-helper split is
the `lib/news.ts` + `lib/news-view.ts` pattern (so the tree logic is testable without a database), and
`lib/media-storage.ts` is a separate small module for the same reason `lib/db-auth.ts` is — it is the
unit test's seam for an environment-selected behaviour.

## Reuse and simplicity ledger

Confirmed with the user before task breakdown: reuse whatever already exists, and keep the new
surface as small as the requirements allow. What that means concretely — the tasks phase should not
reinvent anything in the left column.

### Reused as-is (no new code)

| Existing thing | Used for |
|---|---|
| `lib/slug.ts` `slugify()` | page handle derivation (FR-011) — already handles æ/ø/å |
| `collections/News.ts` access posture (`isEditor`, published-only `read`) | copied shape for all four collections (FR-031/032) |
| `lib/news.ts` / `lib/news-view.ts` split | the read-layer / pure-helper structure for learning |
| `formatNewsDate`'s Oslo + nb-NO recipe | `formatLearningUpdated` (FR-018) |
| `kihub-prose` class | the learning body wrapper — already styles news article bodies |
| `CopyButton.tsx` | the code-block copy control (FR-029); edit is Norwegian labels only |
| Designsystemet `Button` (inside `CopyButton`) | unchanged, not restyled (FR-034) |
| `sharp` | generated image sizes (FR-023) |
| Payload's premade `CodeBlock` | the whole code-authoring UX (research §2) |
| Payload's built-in `updatedAt` | "Sist oppdatert" (FR-018) — no date field of our own |
| `requireSession` via the `(app)` route group | session gating (FR-033), zero new code |
| `instrumentation.ts` boot-time Payload init | makes FR-025's misconfiguration crash loudly, no new machinery |
| `portal.css` per-feature section convention | all new CSS, one section |
| `lib/search.ts` | untouched — learning is unreachable from it by construction (FR-039) |

### Deliberately not built

| Omitted | Why |
|---|---|
| `slug` on categories and subcategories | nothing addresses them; the overview links to a category's first *page*. A field, a unique index and a migration column per collection for routes that do not exist |
| `caption` on media | no requirement; a caption is the paragraph under the image, which rich text already does |
| A third `thumb` image size | `adminThumbnail` reuses the `content` size instead of generating another derivative of every upload |
| A `publishDate` field | `updatedAt` already answers the only date question the surface asks |
| Focal point / crop on uploads | no requirement behind either |
| Any new client component | native `<details>` covers the sidebar; `CopyButton` is the only client component involved |
| A tree-caching layer | three `depth: 0` queries is already the cheap path; caching would be speculative (Principle VII) |
| `orderable: true` | `@experimental` with "frequent breaking changes"; an integer `order` is inspectable and testable (research §8) |

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| **Syntax highlighting uses more than one chromatic role**, against the kihub design system's stated rules ("One accent — `--kihub-accent` is the only chromatic colour in the UI"; "Status colours are for status only, never decoration") | The user explicitly chose syntax highlighting over plain monospace, and **confirmed the four-role palette below** after it was presented as a deviation. A learning library about AI tooling is mostly commands and configuration, and highlighting is what makes those samples scannable. | *Monochrome code* (ink weights + italic comments only) was the constitution-cleanest option and was rejected because it does not deliver what was asked for. *A full 9-role shiki palette* was rejected as a real violation. The chosen middle path narrows the deviation to the minimum that still reads as highlighting: **four roles** (keyword = accent, string/constant = one second hue, comment = subtle ink + italic, everything else = default ink), expressed **only as aliases of existing Designsystemet text-role tokens** — so no new colour value enters the system, nothing needs syncing back into the design project, and the deviation is confined inside the code block, which is a distinct reading surface rather than UI chrome. This is the same mechanism 012 used for categorical event-type colours (`portal.css:194`), which the constitution has already lived with. |
| **A new `plugins` array and a cloud-storage dependency** in `payload.config.ts` | FR-024 requires uploaded images to survive restarts; the Azure Container Apps filesystem is ephemeral, so durable object storage is the requirement, not a preference. | *Filesystem storage only* loses every image on redeploy — a silent data-loss bug on a content surface. *Keeping News's `heroImageUrl` approach (paste a URL)* was rejected by the user's up-front decision and is a worse authoring experience for a library that is image-heavy by nature. The complexity is bounded: one plugin, registered only when `MEDIA_STORAGE_MODE=azure`, behind a selector module that mirrors `lib/db-auth.ts`. |

Two notes that are **not** deviations but are recorded so the tasks phase does not relitigate them:
`orderable: true` exists in Payload 3.85.2 and was deliberately declined because it is annotated
`@experimental. There may be frequent breaking changes` and ordering is load-bearing on an
employee-facing surface (research §8); Payload's premade `CodeBlock` is likewise `@experimental`, and
is accepted anyway because the contract pins the **stored shape** rather than the factory, so a
replacement is a few lines and reads the same documents (research §2, learning-editor.md §D).
