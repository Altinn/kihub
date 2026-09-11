# Tasks: Distinct destinations for frontpage banner links

**Input**: Design documents from `/specs/016-fix-frontpage-banner-links/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — the Constitution's Development Workflow gate requires new modules (News,
Events, Learning, and now Projects) to test their access control and validation rules.

**Organization**: Tasks are grouped by user story (US1/US2/US3 map to spec.md's priorities:
US1 = P1, US2 = P2, US3 = P1).

## Path Conventions

Single existing app: `apps/web/src/` (Next.js App Router + Payload CMS), `apps/web/tests/`. All
paths below are relative to the repo root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand up the `projects` collection and its database schema — everything else builds on this.

- [x] T001 Create the `Project` Payload collection in `apps/web/src/collections/Project.ts`: slug
      `projects`, fields `title` (text, required), `slug` (text, unique, indexed, auto-derived via
      `beforeValidate` using the existing `slugify` from `apps/web/src/lib/slug.ts` — same hook
      pattern as `News.ts`), `summary` (textarea), `body` (richText, required), `status` (select
      `draft`/`published`, required, default `draft`), `order` (number, default `100`); `access`
      gated the same way as `News.ts`'s `isEditor` check (Contributor+ create/update/delete; read
      restricted to `status: published` for non-editors). See
      `contracts/projects-collection.md` and `data-model.md`.
- [x] T002 Register `Project` in `apps/web/src/payload.config.ts`: import it and add to the
      `collections` array (after `News`, before `Event`, keeping existing order stable per the
      file's own convention).
- [x] T003 Generate the Postgres migration for the new `projects` table: run
      `pnpm --filter web migrate:create` (creates `apps/web/src/migrations/<timestamp>_projects.ts`
      + `.json` and appends the entry to `apps/web/src/migrations/index.ts`). Verify the generated
      `up`/`down` SQL only touches the new table (+ its `payload_locked_documents_rels` column), and
      hand-patch the `down` with `IF EXISTS` on any dropped constraint/index if the generator
      produces the same ordering bug noted for `20260810_090312_learning_pages` (plan.md /
      research.md precedent). Done — `20260911_101007_projects.ts` generated and hand-patched
      exactly as anticipated (the generator hit the same ordering bug).
- [x] T004 Verify the migration on a scratch database (`kihub_migtest_016`): `payload migrate` UP
      and DOWN both ran clean (confirms the T003 hand-patch works). Running `payload migrate`
      directly against the shared local dev DB was deliberately NOT done — it hit the documented
      "you've run Payload in dev mode ... data loss will occur" prompt (CLAUDE.md/runtime-config.md
      gotcha), so per that same doc's own guidance the dev DB instead picked up the new `projects`
      table automatically via Payload's dev push-mode when the app/tests next started against it.

**Checkpoint**: `projects` collection exists, is registered, and its table is migrated (scratch-DB
verified; picked up on the shared dev DB via push-mode). The CMS admin at `/cms` can already
create/edit Project entries at this point — confirmed manually (T013/T019).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The read layer every user-facing page depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Implement the read layer in `apps/web/src/lib/projects.ts`, modeled on
      `apps/web/src/lib/news.ts`:
      - `listPublishedProjects(): Promise<Project[]>` — `payload.find({ collection: 'projects',
        where: { status: { equals: 'published' } }, sort: 'order', limit: 200, overrideAccess:
        true })`.
      - `getPublishedProjectBySlug(slug: string): Promise<Project | null>` — `where: { and: [{
        slug: { equals: slug } }, { status: { equals: 'published' } }] }`, `null` when not found.
      See `contracts/projects-collection.md` (Read-layer contract).

**Checkpoint**: Foundation ready — User Stories 1 and 3 can now proceed.

---

## Phase 3: User Story 1 - Employee opens "KI Prosjekter i BOD" from the frontpage (Priority: P1) 🎯 MVP

**Goal**: Selecting "KI Prosjekter i BOD" on the frontpage opens a real, dedicated page listing
published AI projects, with detail pages — distinct from `/registry`.

**Independent Test**: Click "KI Prosjekter i BOD" on the frontpage; confirm it opens `/prosjekter`
(not `/registry`), showing published projects; open one and see its full description.

### Tests for User Story 1

- [x] T006 [P] [US1] Integration test in
      `apps/web/tests/integration/projects-access.test.ts`, modeled on
      `apps/web/tests/integration/news-access.test.ts`: seed a published + a draft `Project` via
      the Payload local API, assert `listPublishedProjects()` returns only the published one
      (never the draft), and `getPublishedProjectBySlug()` returns `null` for the draft's slug
      (FR-007/009).

### Implementation for User Story 1

- [x] T007 [P] [US1] Create `ProjectCard` in `apps/web/src/components/ProjectCard.tsx`, modeled on
      `NewsCard.tsx` but WITHOUT the date line or hero-image well (no such fields on `Project`):
      title + summary, linking to `/prosjekter/<slug>`.
- [x] T008 [US1] Create the list page `apps/web/src/app/(app)/prosjekter/page.tsx`, modeled on
      `apps/web/src/app/(app)/news/page.tsx` but WITHOUT pagination: render `ProjectCard` for every
      `listPublishedProjects()` result (sorted by `order`, already handled by T005); render a clear
      empty-state message (e.g. "Ingen prosjekter ennå") when the list is empty (FR-008).
- [x] T009 [US1] Create the detail page
      `apps/web/src/app/(app)/prosjekter/[slug]/page.tsx`, modeled on
      `apps/web/src/app/(app)/news/[slug]/page.tsx` but WITHOUT byline/tags/hero-image sections:
      resolve via `getPublishedProjectBySlug`, `notFound()` when `null` (FR-009), render `title` +
      `<RichText data={project.body} />` + a back-link to `/prosjekter` (FR-005).
- [x] T010 [US1] Add a `.prosjekter-empty` (or reuse the existing `.news-empty` pattern) CSS rule
      in the kihub stylesheet used by `/news` (find via the `news-empty`/`news-grid` class
      definitions and add the `/prosjekter` equivalent alongside them) so the empty state and card
      grid are styled consistently with the rest of the site.
- [x] T011 [US1] Update the "KI Prosjekter i BOD" tile's `href` from `/registry` to `/prosjekter`
      in `apps/web/src/lib/site-content-defaults.ts` (`DEFAULT_FRONTPAGE.tiles`) — the "Verktøy"
      tile entry is NOT touched by this task (FR-001).

**Checkpoint**: User Story 1 is fully functional — the frontpage tile leads to a real, working
`/prosjekter` experience with list + detail + empty state.

---

## Phase 4: User Story 3 - Content editor adds and publishes an AI project (Priority: P1)

**Goal**: A KITT editor can create, edit, and publish/unpublish an AI-project entry entirely
through `/cms`, and drafts never leak to employees.

**Independent Test**: In `/cms`, create a Project, publish it, confirm it appears on
`/prosjekter`; leave a second one as draft and confirm it never appears (list or by direct
slug URL).

### Tests for User Story 3

- [x] T012 [P] [US3] Extend `apps/web/tests/integration/projects-access.test.ts` (from T006) with
      the authoring matrix, modeled on `news-access.test.ts`'s `describe('News authoring access...')`
      block: Contributor+ can create/update(publish)/delete; Reader and anonymous requests are
      refused create; `slug` uniqueness is enforced (two creates with the same explicit `slug`
      reject).

### Implementation for User Story 3

- [x] T013 [US3] Manual verification only (no new code — covered by T001's collection + T012's
      test): in `/cms`, confirm the `Projects` collection's admin list view shows `title`/`status`/
      `order` as configured (`defaultColumns`), and that editing `status` between `draft` and
      `published` immediately changes what T008/T009's pages render (per quickstart.md Scenario 3).
      Done via live browser check: created "Automatisert kvalitetssjekk" in `/cms` as Contributor,
      published it, saw it appear on `/prosjekter` + its detail page, then deleted it again.

**Checkpoint**: Editors can fully author Projects content through the CMS; draft/publish
visibility is proven by automated tests, not just manual spot-checks.

---

## Phase 5: User Story 2 - Employee opens "Verktøy" from the frontpage (Priority: P2) — regression guard

**Goal**: Prove "Verktøy" is unaffected by this feature — it must still resolve to `/registry`.

**Independent Test**: Click "Verktøy" on the frontpage; confirm it still opens `/registry`, byte-
for-byte unchanged from before this feature.

### Tests for User Story 2

- [x] T014 [US2] Add/extend a unit assertion (e.g. in
      `apps/web/tests/unit/frontpage-select.test.ts` or a new small
      `apps/web/tests/unit/frontpage-defaults.test.ts`) asserting
      `DEFAULT_FRONTPAGE.tiles.find(t => t.title === 'Verktøy')?.href === '/registry'` AND
      `DEFAULT_FRONTPAGE.tiles.find(t => t.title === 'KI Prosjekter i BOD')?.href === '/prosjekter'`
      — pinning both halves of FR-001/FR-002 in one place so a future edit can't silently reunify
      them.

**Checkpoint**: All three user stories are independently verified; "Verktøy" behavior is provably
untouched.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T015 [P] Amend `.specify/memory/constitution.md`: add **Projects** as a fifth Product Module
      bullet (flat, editor-authored native content; Registry principles I/III/IV/V/VI do not
      apply — same carve-out as Learning), bump to v3.2.0 with a Sync Impact Report, matching the
      precedent set when Learning was added in v3.1.0.
- [x] T016 [P] Update `README.md`'s module description (wherever it currently enumerates
      Registry/News/Calendar/Learning) to mention Projects, mirroring how the 014-learning-pages
      README update was done.
- [x] T017 Run `pnpm --filter web lint` and `pnpm --filter web test` (full suite) and fix any
      failures. Done — lint clean, full suite **356/356 across 45 files** (including the new
      `projects-access.test.ts` and `frontpage-defaults.test.ts`).
- [x] T018 Run `pnpm --filter web build` (prod build) and confirm `/prosjekter` and
      `/prosjekter/[slug]` compile and generate correctly. TypeScript compiled + typechecked
      successfully (`Compiled successfully` + `Finished TypeScript` with no errors touching the
      new routes); the build then failed at the page-data-collection step on the pre-existing,
      unrelated `AUTH_MODE=mock is not allowed in production` gate (documented local-environment
      limitation, not caused by this feature — no real Entra registration available here).
- [x] T019 Walk through `quickstart.md` end-to-end manually (all 5 scenarios) against the local
      dev stack. Done via the live browser: Scenario 1 (Verktøy → `/registry`, KI Prosjekter i BOD
      → `/prosjekter`) ✅; Scenario 2 (empty state before any project existed) ✅; Scenario 3
      (published via `/cms`, appeared on list + detail) ✅; Scenario 4 (unknown/deleted slug → 404)
      ✅; Scenario 5 (`/registry` untouched) ✅ by code inspection + T014's pinned assertion.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 (needs the `projects` collection to query).
- **User Story 1 (Phase 3)**: Depends on Phase 2 (needs the read layer).
- **User Story 3 (Phase 4)**: Depends on Phase 1 (collection + access rules already exist); can run
  in parallel with Phase 3 — T012 only needs the collection, not the employee-facing pages.
- **User Story 2 (Phase 5)**: Depends only on T011 (the tile-href edit) landing — can run any time
  after Phase 3's T011.
- **Polish (Phase 6)**: Depends on all of the above.

### Parallel Opportunities

- T001–T002 are sequential (T002 needs T001's export); T003–T004 must follow both.
- T006 and T007 can run in parallel (different files, no shared dependency beyond T005).
- T012 (Phase 4) can run in parallel with all of Phase 3 (T007–T011) — different files, both only
  depend on Phase 1/2.
- T015 and T016 (Polish, docs) can run in parallel with each other and with Phase 5.

---

## Implementation Strategy

### MVP First

1. Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (User Story 1). At this point the reported
   bug (Altinn/kihub#135) is fixed end-to-end for employees, with at least one manually-created
   published project to prove it.
2. Phase 4 (User Story 3) proves the CMS authoring path is solid with automated tests, not just
   the manual check already implied by Phase 1.
3. Phase 5 (User Story 2) is a cheap regression pin — do it right after T011, don't defer it to the
   end.
4. Phase 6 closes out documentation and full-suite verification.
