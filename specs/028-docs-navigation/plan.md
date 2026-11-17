# Implementation Plan: Documentation Navigation for Pages

**Branch**: `028-docs-navigation` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/028-docs-navigation/spec.md`

## Summary

Give CMS content documentation-style navigation in three independent slices. **US1**: a pure
extractor turns the Lexical body into a list of h2–h4 headings with ASCII anchors (`slugify`, `-2`
for duplicates); the shared Designsystemet heading converter (given the list by `LearningBody`) and a
new server-rendered «På denne siden» table of contents both read that list, so Pages and KI Læring pages get anchors, self-links and a TOC with no
data change. **US2**: Pages get `parent` and `order`; the address is computed from the parent chain
(`/kom-i-gang/<slug>`), the route becomes a catch-all that resolves the page by its last segment and
redirects (307) any other path ending in that slug to the canonical address, so moved pages keep
working links and nothing is stored or cascaded. **US3**: a section menu of published Pages, in a
shared `DocShell` that `LearningShell` also uses. The skip link and the single `<main>` already exist
since 026. One additive migration; constitution 4.2.0 → 4.3.0.

Rebased on `main` after the 026 Designsystemet redesign (#169) during review of the spec PR.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), Node 22

**Primary Dependencies**: Payload **3.92.1** (`payload`, `@payloadcms/richtext-lexical`,
`@payloadcms/db-postgres`), Next.js **16.4.1** App Router. **No new dependencies.**

**Storage**: PostgreSQL. Two new columns on `pages` and two on `_pages_v` (R15). No backfill.

**Testing**: vitest unit (`tests/unit`) and integration against Postgres (`tests/integration`); lint;
`tsc --noEmit`; `next build` against a migrated scratch DB with `AUTH_MODE=entra`; browser walkthrough
(quickstart.md) including keyboard-only, JavaScript disabled, phone width and an axe run.

**Target Platform**: Azure Container Apps (`kihub-web`), standalone Next server.

**Project Type**: Web application (single `apps/web` Next.js + Payload app, two surfaces).

**Performance Goals**: a page view costs at most one extra query (the section read, US3) and one
redirect for old addresses. Heading extraction is a linear walk of a body of a few hundred nodes.

**Constraints**: no client components (navigation must work without JavaScript, 014 FR-005
precedent); Norwegian UI; Designsystemet classes and `--ds-*` tokens only, no app-defined custom
properties (constitution Design System §2–§3); WCAG 2.2 AA with an axe run and a keyboard pass on the
affected routes (Accessibility gate); no draft leakage into menus or addresses (027 invariants);
built-in routes always win.

**Scale/Scope**: tens of Pages, about 5 editors. 1 collection changed, 1 route moved, ~6 new modules or
components, 1 migration.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Git is source of truth for AI artifacts**: ✅ Untouched; Pages are native content.
- **II. Payload owns native content**: ✅ Hierarchy is two Payload fields; anchors and menus are derived at render.
- **III. Every AI asset is an artifact**: ✅ N/A (Pages are not artifacts).
- **IV–VI. Registry principles**: ✅ N/A.
- **VII. Start Simple / YAGNI**: ✅ No new dependency, collection or global; addresses computed, not stored (R7); no scrollspy, no stored anchors, no redirect store. Rejected: nested-docs plugin, stored paths, navigation global, section collection (R6, R7).
- **VIII. Two surfaces**: ✅ Authoring stays in `/cms` (two sidebar fields, optional read-only address); the employee app only renders.
- **Design System**: ✅ Server components on Designsystemet: `ds-details` for the TOC and the phone menu, `ds-link`/`ds-heading` classes, KI Læring's `app-learning*` shell and nav classes reused; new CSS in `app.css` uses `--ds-*` tokens only. The TOC is a custom component because Designsystemet has none (§3).
- **Accessibility**: ✅ Uses the 026 skip link and single `main`; the menu and TOC are named `nav` landmarks; axe and a keyboard pass in quickstart §1 and §3.
- **Security**: ✅ No new route handlers or access rules; the catch-all keeps `getPreviewState` gating and the 027 published-only reads; 404s reveal nothing about drafts (FR-014).
- **Testing gate**: ✅ Unit tests for the extractor, tree builder and address resolution; integration tests for hierarchy rules on the API path, section reads (no drafts) and route resolution.
- **Amendment needed?** **Yes, MINOR 4.2.0 → 4.3.0** (R16): the Pages module bullet moves from flat one-segment addresses to a three-level hierarchy with nested addresses and a section menu. Not a violation; Complexity Tracking stays empty.

**Post-design re-check (after Phase 1)**: still PASS. The design removes nothing and adds no service.
`DocShell` removes duplication between the Learning shell and the new Pages shell.

## Project Structure

### Documentation (this feature)

```text
specs/028-docs-navigation/
├── spec.md
├── plan.md                  # this file
├── research.md              # R1–R16
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── headings-toc.md      # extractHeadings, anchor rules, heading converter, PageToc
│   └── page-hierarchy.md    # fields, hook rules, address resolution, route, SectionNav, DocShell
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
.specify/memory/constitution.md                    # 4.3.0 amendment (Pages bullet)

apps/web/src/
├── collections/Page.ts            (changed)       # + parent, order, hierarchy hook, optional address ui field
├── lib/
│   ├── headings.ts                (NEW, pure)     # extractHeadings, anchorFor, RESERVED_ANCHORS
│   ├── page-tree.ts               (NEW, pure)     # pageAddress, buildPageSection, parsePagePath
│   ├── page-hierarchy.ts          (NEW)           # validatePageParent (hook body, needs payload)
│   ├── pages.ts                   (changed)       # getPageBySlug → populated chain; getPageSection
│   ├── ds-richtext-converters.tsx (changed)       # optional headingIds → id + self-link on headings
│   └── page-slug.ts               (unchanged rules; comment updated)
├── components/
│   ├── LearningBody.tsx           (changed)       # extracts headings, passes headingIds to the ds converters
│   ├── PageToc.tsx                (NEW, server)
│   ├── DocShell.tsx               (NEW, server)   # LearningShell's markup with the nav as a prop (no <main>)
│   ├── LearningShell.tsx          (changed)       # thin wrapper over DocShell
│   ├── SectionNav.tsx             (NEW, server)
│   └── cms/PageAddressField.tsx   (NEW, optional) # FR-018
├── app/
│   ├── (app)/[slug]/page.tsx      (MOVED)         # → (app)/[...path]/page.tsx: resolve, redirect, DocShell, TOC, menu
│   ├── (app)/laering/[slug]/page.tsx (changed)    # TOC
│   └── (payload)/cms/importMap.js (regenerated if R14 ships)
├── migrations/<ts>_pages_hierarchy.{ts,json} (NEW) + index.ts
├── payload-types.ts               (regenerated)
└── styles/app.css                 (changed)       # 028 section: heading anchors, rhythm rules, :target, TOC, menu nesting

apps/web/tests/
├── unit/headings.test.ts          (NEW)
├── unit/page-tree.test.ts         (NEW)
├── unit/reserved-anchors.test.ts  (NEW: every fixed layout id is in RESERVED_ANCHORS)
├── unit/page-slug.test.ts         (changed: catch-all is [...path])
├── unit/route-caching.test.ts     (changed: [...path]/page.tsx)
└── integration/
    ├── pages-hierarchy.test.ts    (NEW: cycle/self/depth refused via API; delete parent → children top-level)
    ├── pages-section.test.ts      (NEW: section read is published-only, ordered; unpublished root → null)
    └── pages-access.test.ts       (changed: resolution by last segment, preview chain)

CLAUDE.md                                           # Spec Kit active-feature block → 028
```

**Structure Decision**: existing single-app layout. Pure logic lives in `lib/headings.ts` and
`lib/page-tree.ts` so it is unit-testable without a database; Payload-dependent code stays in
`lib/pages.ts` and `lib/page-hierarchy.ts`.

## Delivery: one spec PR, then one PR per story

The team works spec-first for this feature: the spec PR is reviewed and merged before code, then each
user story is its own PR referring to 028. Each story PR updates `tasks.md` checkboxes.

1. **PR 0 — Spec** (this branch): `specs/028-docs-navigation/**`, constitution 4.3.0, `.specify/feature.json`.
   No code.
2. **PR 1 — US1 anchors and TOC**: no migration, no CMS change. Ships alone.
3. **PR 2 — US2 hierarchy and nested addresses**: migration, route move, hook. Must merge before the
   «Kom i gang» pages are published at their final addresses.
4. **PR 3 — US3 section menu**: depends on PR 2 (hierarchy) and touches the same CSS as PR 1, so it
   goes last.

PR 1 and PR 2 touch different files except `app.css` (separate sections) and the CMS page route (PR 1
adds the TOC to `[slug]/page.tsx`; PR 2 moves it to `[...path]`). Merge PR 1 first, or rebase PR 2 on it.

The internal-link fix (`internalDocToHref`, research «Out of scope») is a separate `fix/` PR and can
land at any time.

## Risks & mitigations

- **Anchors drift from the TOC** → both read one `extractHeadings` result (R3); a unit test renders a
  body and asserts every TOC `href` matches a heading `id`.
- **Redirect loops after moves** → 307 only (R7); quickstart tests a move and a move back.
- **A cycle reaches the renderer** (bad data, concurrent drafts) → hook on every save (R9) and the
  renderer stops after three ancestors and 404s.
- **`depth: 2` with `draft: true` does not populate draft parents** → fallback chain walk (R10),
  covered by an integration test in preview.
- **Global slug uniqueness surprises editors** («Adressen er allerede i bruk») → the existing unique
  error stays; the field description explains that the segment must be unique across all pages.
- **A layout id is added and collides with an anchor** → `reserved-anchors.test.ts` scans the layout
  components.
- **The heading wrapper breaks rich-text spacing** → the rhythm rules also select `.app-heading` (R4);
  quickstart §1 compares spacing with `main`.
- **Unpublished parent leaks its segment** → readers get the flat address (R7); unit and integration
  tests cover it.
- **TOC covers content at high zoom** → the 75rem breakpoint scales with zoom, so zooming switches to
  the collapsed variant; quickstart checks 400% zoom at 1280px.

## Complexity Tracking

No constitution violations. The 4.3.0 amendment is a planned change to the Pages module, not a deviation.
