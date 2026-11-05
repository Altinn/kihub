---
description: "Task list for 027 — editorial drafts with preview, and CMS-managed pages"
---

# Tasks: Editorial Drafts with Preview, and CMS-Managed Pages

**Input**: Design documents from `/specs/027-drafts-preview-pages/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md) (R1–R15),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: INCLUDED. The constitution's Testing gate requires new modules to test their access control
and state rules, and the plan's design depends on the no-draft-leak invariants (contract
content-drafts A1–A8).

**Organization**: Grouped by user story (spec.md US1–US5; US6 scheduling was dropped 2026-11-05) so each can be implemented, tested and
demonstrated on its own once Phase 2 is done.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 … US5 from spec.md
- All paths are repo-relative; `web/` below means `apps/web/`

## Conventions for every task

- Run tests with env exported: `cd apps/web && set -a && source .env && set +a && pnpm test`.
- `DATABASE_URI` must point at the per-branch clone **`kihub_027`** (T002), never at the shared `kihub`
  DB. This feature DROPS columns, so push-mode would prompt and hang the suite (017 gotcha).
- Norwegian for every editor-/employee-visible string.
- Employee UI uses `--kihub-*` / `--ds-*` tokens only, with no new client components.

---

## Phase 1: Setup

**Purpose**: Isolated databases and a known-good baseline.

- [X] T001 Confirm the branch is based on current `origin/main` and has Payload **3.92.1** installed (`apps/web/package.json`, `pnpm install --frozen-lockfile`). Run `pnpm --filter web test` once against the shared DB to record the baseline pass count in `specs/027-drafts-preview-pages/tasks.md` Notes.
- [X] T002 Create the per-branch dev DB `kihub_027` as a copy of the local `kihub` DB inside `kihub-postgres` (`createdb -T kihub kihub_027` via `docker exec`). Point `DATABASE_URI` in `apps/web/.env` at it. Add a launch config `kihub-web-027` (port 3027) to `.claude/launch.json`, preserving the user's existing uncommitted edits in that file.
- [X] T003 [P] Create the scratch migration DB `kihub_migtest_027`, migrated to `main`'s latest migration (`pnpm --filter web migrate` with `DATABASE_URI` overridden). Seed it with real-shaped rows: at least one published and one draft per collection (`news`, `learning_pages`, `projects`, `events`), one news item with `tags` + `heroImage`, one learning page with a subcategory. Save the SC-003 baseline query (per table: `count(*)`, count published, sorted `(slug,title)`) as `specs/027-drafts-preview-pages/scripts/sc003-baseline.sql`.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Payload drafts on the four existing collections, the migration, and the published-only read
layer on `_status`. US2, US4 and US5 are largely *delivered* by this phase (Payload semantics). Their
phases add the tests that prove them.

**⚠️ CRITICAL**: No user-story work starts before this phase is green.

- [X] T004 [P] Create `apps/web/src/lib/content-versions.ts` exporting `CONTENT_VERSIONS` (`maxPerDoc: 50`, `drafts: { autosave: { interval: 2000 } }` — `schedulePublish` was removed 2026-11-05) and `contentAccess` (`read` → editors `true` else `{ _status: { equals: 'published' } }`; `readVersions`/`create`/`update`/`delete` → `isEditor`). Import `isEditor` from `apps/web/src/lib/access.ts`. See contracts/content-drafts.md §A and research R1/R10.
- [X] T005 [P] Change `PUBLISHED` in `apps/web/src/lib/payload-queries.ts` to `{ _status: { equals: 'published' } }` and update its docblock.
- [X] T006 Apply drafts to `apps/web/src/collections/News.ts`: `versions: CONTENT_VERSIONS`, `access: contentAccess`. Delete the private `isEditor` and the `status` field. Change `defaultColumns` `'status'` → `'_status'`. Change the `beforeChange` publishDate stamp to test `data._status === 'published'` (R9). Update the header docblock.
- [X] T007 [P] Apply the same to `apps/web/src/collections/LearningPage.ts`: versions, contentAccess, delete the private `isEditor` + `status` field, `defaultColumns` → `_status`. Keep both `beforeValidate` hooks unchanged.
- [X] T008 [P] Apply the same to `apps/web/src/collections/Project.ts` (versions, contentAccess, remove `status`, `defaultColumns` → `_status`).
- [X] T009 [P] Apply the same to `apps/web/src/collections/Event.ts` (versions, contentAccess, remove `status`, `defaultColumns` → `_status`).
- [X] T010 Switch `apps/web/src/lib/news.ts`, `apps/web/src/lib/learning.ts` and `apps/web/src/lib/events.ts` from their local `PUBLISHED` / inline `{ status: … }` filters to the shared `PUBLISHED` from `lib/payload-queries.ts`. Also switch `apps/web/src/lib/projects.ts`, which already imports it. Keep docblocks' "published by construction" contract.
- [X] T011 Rename the by-slug readers and add `opts?: { preview?: boolean }` per contracts/content-drafts.md §B: `getNewsBySlug`, `getLearningPageBySlug`, `getProjectBySlug`, `getEventBySlug`. Preview → `find({ where: { slug: { equals } }, draft: true, overrideAccess: true, limit: 1 })`; else the existing published query. Update all call sites: `apps/web/src/app/(app)/{news,laering,prosjekter,events}/[slug]/page.tsx` and `apps/web/src/app/(app)/events/[slug]/ics/route.ts` (no preview arg yet).
- [X] T012 Generate the migration: `pnpm --filter web migrate:create drafts` against `kihub_migtest_027`, producing `apps/web/src/migrations/<ts>_drafts.{ts,json}` and the `index.ts` entry.
- [X] T013 Hand-edit `apps/web/src/migrations/<ts>_drafts.ts` `up()` into this order (research R2):
  1. The generated create of `_status` + `_*_v` tables + NOT-NULL relaxations (no `payload_jobs` since scheduling was dropped).
  2. `UPDATE <t> SET _status = status` for news / learning_pages / projects / events. Payload names the `_status` enum `enum_<t>_status`, the SAME type name the old `status` column already uses (`enum_news_status` etc., values `draft`/`published`). So drizzle should reuse the type, and no cast is needed. Check the generated SQL does NOT drop that type while `_status` still uses it.
  3. Backfill one `latest = true` version row per existing document into `_news_v`, `_learning_pages_v`, `_projects_v`, `_events_v`. Copy every `version_*` column from the main row, plus child tables named by the generated SQL (e.g. `news_texts` → `_news_v_texts`, any `*_rels` → `_*_v_rels`).
  4. The generated drops of the old `status` columns, moved last. Keep the shared `enum_<t>_status` type (see step 2).

  In `down()`: restore `status` from `_status` before the drops, and add `IF EXISTS` to every constraint/index drop (014/015/016 hand-patch).
- [X] T014 Verify the migration on `kihub_migtest_027`. Run `migrate` and the T003 baseline query: results must be identical (SC-003). Each `_X_v WHERE latest` count must equal the main-table count. Run `migrate:down`: `status` restored and identical. Run `migrate` again: clean. Record the results in tasks.md Notes.
- [X] T015 Apply the migration to `kihub_027` with `pnpm --filter web migrate`, so push-mode sees a matching schema. Then regenerate types with `pnpm --filter web payload generate:types` → `apps/web/src/payload-types.ts`, and run `pnpm --filter web exec tsc --noEmit` to surface every remaining `status` reference.
- [X] T016 Update the existing integration tests to `_status` and the renamed readers: `apps/web/tests/integration/{news-access,news-hero,events-access,learning-access,learning-tree-reads,learning-hierarchy,projects-access}.test.ts`. Docs created as published pass `_status: 'published'`. Drafts are created with `_status: 'draft'` (or `draft: true`).
- [X] T017 Create `apps/web/tests/integration/content-drafts.test.ts`, table-driven over `['news','learning-pages','projects','events']` with reader + contributor users (the projects-access pattern, `overrideAccess: false`). Cover **A1**: a never-published draft is invisible to the reader via `find`/`findByID` and via the `lib/*` readers. **A3**: the reader's `findVersions` is forbidden. **A4**: the contributor's `findVersions` lists versions and `find({ draft: true })` returns the latest draft. **A5**: the contributor can publish.
- [X] T018 Run the full suite, lint and `tsc --noEmit` on `kihub_027`. Everything must be green before Phase 3.

**Checkpoint**: Drafts work in `/cms` for the four collections (Save draft / Publish / Unpublish /
Versions tab), readers see only published content, and all existing content keeps its visibility.

---

## Phase 3: User Story 1 — Preview a draft on the real site (Priority: P1) 🎯 MVP

**Goal**: The *Forhåndsvis* button opens the draft at its real address for editors only, with a
banner; readers get 404, including via a forwarded link.

**Independent Test**: quickstart §3 "US1". A contributor previews a never-published news draft. A
reader gets 404 on the same address and on `/api/preview?path=…`. The frontpage and `/news` never
list it.

### Tests for User Story 1

- [X] T019 [P] [US1] Create `apps/web/tests/unit/preview-paths.test.ts` with tables for `previewPathFor` (5 collections, slug encoding) and `previewUrl` (null/empty slug → null). Cover `isSafeInternalPath`: accept `/news/x`, `/om-ki-hub?x=1`; reject `//evil.com`, `/\evil.com`, `https://evil.com`, `javascript:alert(1)`, `%2F%2Fevil.com`-decoded variants, control characters, >512 chars, non-strings.
- [X] T020 [P] [US1] Create `apps/web/tests/unit/route-caching.test.ts`. It reads the 5 detail route files + `apps/web/src/app/(app)/layout.tsx` and asserts none contains `revalidate`, `force-static`, `generateStaticParams`, `unstable_cache` or `'use cache'` (R7). Include `apps/web/src/app/(app)/[slug]/page.tsx` once it exists, skipping it while absent.
- [X] T021 [P] [US1] Create `apps/web/tests/integration/preview-state.test.ts` for `resolvePreviewActive({ draftModeEnabled, userId }, payload)` (the pure core behind `getPreviewState`). Cases: draft mode off → false. Contributor → true. Reader → false. Unknown user id → false. A contributor whose role is updated to reader → false on the next call. A lookup throwing → false (fail closed).

### Implementation for User Story 1

- [X] T022 [P] [US1] Create `apps/web/src/lib/preview-paths.ts` (pure) exporting `PreviewCollection`, `previewPathFor`, `previewUrl` and `isSafeInternalPath` per contracts/preview-route.md §A.
- [X] T023 [US1] Create `apps/web/src/lib/preview.ts` exporting `resolvePreviewActive(input, payload)`, which does a fresh `users` `findByID` at `depth: 0` with `overrideAccess: true` and returns `isEditor(user)`, wrapped in try/catch → false. Also export `getPreviewState = cache(async () => …)`, which reads `(await draftMode()).isEnabled` + `auth()` session `user.id`. The contract is preview-route.md §D.
- [X] T024 [US1] Create `apps/web/src/app/api/preview/route.ts` (GET, Node runtime) per contracts/preview-route.md §B. Steps: 400 on unsafe/missing `path`. 307 → `/signin` when there is no session. Fresh role check, and a non-editor gets a 303 → `path` without enabling. An editor gets `draftMode().enable()`, then the `__prerender_bypass` cookie is re-set with `maxAge: 3600, httpOnly, secure, sameSite: 'lax', path: '/'`, then a 303 → `path`.
- [X] T025 [P] [US1] Create `apps/web/src/app/api/preview/exit/route.ts` (GET): `draftMode().disable()`, then 303 → the same-origin `Referer` pathname+search when `isSafeInternalPath`, else `/`.
- [X] T026 [P] [US1] Create the Server Component `apps/web/src/components/PreviewBanner.tsx`: Designsystemet `Alert` `data-color="warning"`, `role="status"`, copy and exit link exactly as in contracts/preview-route.md §E. Add minimal spacing in a new `/* 027 preview banner */` section of `apps/web/src/styles/portal.css` (tokens only).
- [X] T027 [US1] Render `<PreviewBanner />` first inside `.portal-shell` in `apps/web/src/app/(app)/layout.tsx` when `(await getPreviewState()).active`.
- [X] T028 [US1] Pass preview into the detail routes: `apps/web/src/app/(app)/news/[slug]/page.tsx`, `laering/[slug]/page.tsx`, `prosjekter/[slug]/page.tsx`, `events/[slug]/page.tsx` call `getPreviewState()` and pass `{ preview: active }` to their by-slug reader. The `.ics` route stays published-only. `laering/[slug]` still builds the sidebar from the published library (R3).
- [X] T029 [US1] Add `admin.preview: (doc) => previewUrl('<collection>', doc?.slug)` to `News.ts`, `LearningPage.ts`, `Project.ts`, `Event.ts` in `apps/web/src/collections/`.
- [X] T030 [US1] Browser check (dev server `kihub-web-027`, mock auth): run quickstart §3 US1 steps 1–4 plus "Pre-existing content" (preview an item created before the migration). Screenshot the banner. Record the results in tasks.md Notes.

**Checkpoint**: The MVP is shippable: editors can review drafts on the real site, and readers can't see them.

---

## Phase 4: User Story 2 — Edit published content without changing the live version (Priority: P1)

**Goal**: Prove and polish what Phase 2 delivered: a pending draft never changes what readers see
until it is published, including a slug change and unpublish.

**Independent Test**: quickstart §3 "US2". Edit a published item as a draft: the reader sees the old
version everywhere and the preview shows the new one. Publishing switches it; unpublishing hides it.

### Tests for User Story 2

- [ ] T031 [P] [US2] Extend `apps/web/tests/integration/content-drafts.test.ts` (table-driven over the 4 collections). **A2**: published + pending draft with a new title → reader `find` and the `lib/*` list/by-slug readers return the published title, while `getXBySlug(slug, { preview: true })` returns the draft title. **A6**: draft save on a published doc leaves the main row `_status = 'published'`. **A7**: unpublish → the reader no longer sees it, and the contributor still finds it as a draft. **Slug rename**: the draft changes the slug → the old slug still resolves for the reader and the new slug resolves only with `{ preview: true }`.
- [ ] T032 [P] [US2] Add **A8** to `apps/web/tests/integration/news-access.test.ts`: publishing a news doc without `publishDate` stamps it; a draft save (`draft: true`) and an autosave-style update do not.

### Implementation for User Story 2

- [ ] T033 [US2] Fix anything T031/T032 expose. Likely spots: any listing in `apps/web/src/lib/{news,learning,projects,events}.ts` or `apps/web/src/lib/frontpage-select.ts` that bypasses `PUBLISHED`, and the News hook in `apps/web/src/collections/News.ts`.
- [ ] T034 [US2] Browser check: quickstart §3 US2 steps 1–6 (reader keeps v1 on detail, `/news`, frontpage «Siste nytt»; slug rename; *Avpubliser*). Record the results in tasks.md Notes.

**Checkpoint**: US1 + US2 together deliver the "review before prod" workflow requested in the spec.

---

## Phase 5: User Story 3 — Create a standalone information page (Priority: P2)

**Goal**: A `pages` collection with drafts + preview, served at `/<slug>`. Built-in sections always
win and reserved addresses are rejected. Editors can link pages from Site Chrome.

**Independent Test**: quickstart §3 "US3". Create, preview and publish «Om KI Hub» at `/om-ki-hub`.
Reserved and duplicate addresses are refused, and `/news` etc. are unaffected.

### Tests for User Story 3

- [ ] T035 [P] [US3] Create `apps/web/tests/unit/page-slug.test.ts`. (a) The `validatePageSlug` table from contracts/pages.md §B: ok, reserved (incl. case/slash variants), and pattern failures with the exact Norwegian messages. (b) The **drift test**: list the top-level directory names under `apps/web/src/app/(app)`, `(auth)`, `(payload)`, `apps/web/src/app/api` and `apps/web/public`. Ignore route groups `(…)` and dynamic `[…]` segments, and assert each is in `RESERVED_PAGE_SLUGS`.
- [ ] T036 [P] [US3] Create `apps/web/tests/integration/pages-access.test.ts` (reader + contributor, `overrideAccess: false`): contributor create/publish/delete; reader create → forbidden. A draft page is invisible to the reader and to `getPageBySlug(slug)`, but returned with `{ preview: true }`. A published page is returned. Slug `news` → ValidationError. A duplicate slug → error. A title «News» with a blank slug → derived `news` → ValidationError. `findVersions` is forbidden for the reader. Add `'pages'` to the collection table in `content-drafts.test.ts`.

### Implementation for User Story 3

- [ ] T037 [P] [US3] Create `apps/web/src/lib/page-slug.ts` (pure) exporting `PAGE_SLUG_PATTERN`, `RESERVED_PAGE_SLUGS` (list in research R12) and `validatePageSlug` (normalise → reserved check → pattern), returning `true` or the Norwegian message.
- [ ] T038 [P] [US3] Extract the lexical editor from `apps/web/src/collections/LearningPage.ts` verbatim into `apps/web/src/lib/article-editor.ts` (`export const articleEditor = lexicalEditor({ features: … })`, including the CodeBlock and the `youtube` block with `interfaceName: 'LearningYouTubeBlock'`). Make `LearningPage.ts` import it, then run `generate:types` and confirm `payload-types.ts` is unchanged for learning pages.
- [ ] T039 [US3] Create `apps/web/src/collections/Page.ts` per contracts/pages.md §A: labels Side/Sider; versions/contentAccess; `admin.preview` via `previewUrl('pages', …)`; slug derivation (`beforeValidate`); author default (`beforeChange`); fields title (non-blank validate), slug (`validatePageSlug`, unique, index), summary, body (`articleEditor`), author. Register it in `apps/web/src/payload.config.ts` after `Media`.
- [ ] T040 [US3] Run `generate:types` and confirm there is exactly one `LearningYouTubeBlock` interface and no duplicate-name error. If Payload rejects the shared block, move the Code and YouTube blocks to config-level `blocks` in `payload.config.ts` and reference them via `blockReferences` in `lib/article-editor.ts` (R11 fallback).
- [ ] T041 [US3] Generate a second migration with `migrate:create pages` against `kihub_migtest_027` → `apps/web/src/migrations/<ts>_pages.{ts,json}` (the `pages`, `_pages_v` and rels tables). Add the `IF EXISTS` down-patch. Verify up/down/up on the scratch DB, then `migrate` `kihub_027`.
- [ ] T042 [P] [US3] Create `apps/web/src/lib/pages.ts` with `getPageBySlug(slug, opts?: { preview?: boolean })`, same shape as T011. It returns `null` without querying when the slug fails `PAGE_SLUG_PATTERN`.
- [ ] T043 [US3] Create `apps/web/src/app/(app)/[slug]/page.tsx` per contracts/pages.md §C: `getPreviewState()` → `getPageBySlug` → `notFound()` when null. Render `<main className="kihub-container">` with an `h1.kihub-h2`, the optional `.kihub-lead` summary and `<LearningBody body={page.body} />`. `generateMetadata` → `'<title> · KI Hub'`.
- [ ] T044 [P] [US3] Add a `/* 027 /<slug> CMS pages */` section to `apps/web/src/styles/portal.css` (`.cms-page`, `.cms-page__title`, `.cms-page__summary`), tokens only, reusing `.lp-page` rhythm values.
- [ ] T045 [US3] Amend `.specify/memory/constitution.md` 3.2.0 → **3.3.0** (MINOR, research R15). Add the **Pages** Product Module bullet. Add Pages to the native-content scoping sentences in Principles I, II.2, III and VIII (both bullets), and to Data ownership and the Testing gate. Add a Sync Impact Report header and set Last Amended 2026-11-05.
- [ ] T046 [US3] Browser check: quickstart §3 US3 steps 1–5, including built-in routes still rendering and a Site Chrome footer link to the page. Record the results in tasks.md Notes.

**Checkpoint**: Editors can publish standalone pages with no developer involvement (SC-005).

---

## Phase 6: User Story 4 — Version history and restore (Priority: P2)

**Goal**: Confirm the Versions tab (list, compare, restore) works for all five collections.

**Independent Test**: Three saves → Versions tab → compare v1 vs current → restore v1 → content equals v1.

- [ ] T047 [P] [US4] Add a restore test to `apps/web/tests/integration/content-drafts.test.ts` (all 5 collections): three updates with different titles, `findVersions` returns ≥3 entries each carrying author/`updatedAt`/`_status`, `restoreVersion({ id: v1 })` → the current title equals v1's and the other versions still exist.
- [ ] T048 [US4] Browser check: quickstart §3 US4 on a learning page and a page (compare view shows the rich-text diff; restore). Record the results in tasks.md Notes.

---

## Phase 7: User Story 5 — Autosave while writing (Priority: P3)

**Goal**: Drafts save themselves every ~2 s and never touch the published version.

**Independent Test**: Type, wait ~3 s, reload `/cms` → the text is kept, and the reader still sees the published version.

- [ ] T049 [P] [US5] Add an autosave test to `apps/web/tests/integration/content-drafts.test.ts`: on a published doc, two `update({ draft: true, autosave: true })` calls → the main row is unchanged and the version count grows by at most 1 (autosave updates its own version).
- [ ] T050 [US5] Browser check: quickstart §3 US5 on a news article (autosave indicator, reload, reader unchanged). Record the results in tasks.md Notes.

---

## Phase 8: User Story 6 — Schedule publishing — DROPPED

Removed on 2026-11-05 at the product owner's request: no job runner and no scheduled release.
T051–T056 are cancelled. `schedulePublish` is off in `lib/content-versions.ts`, and the drafts
migration was regenerated without the `payload_jobs` tables.

---

## Phase 9: Polish & cross-cutting

- [ ] T057 [P] Run the role-loss check from quickstart §3: a contributor previewing is downgraded to reader → the next navigation has no banner and the draft 404s. Record the result in tasks.md Notes.
- [ ] T058 [P] Write the editors' release note (Norwegian) in `specs/027-drafts-preview-pages/quickstart.md` §4 (or `documentation/`). Cover: the Status field is replaced by Lagre utkast / Publiser / Avpubliser; how to use Forhåndsvis; Versjoner; that there is no scheduled publishing; how to create a page and link it in Site Chrome.
- [ ] T059 Update the `CLAUDE.md` Spec Kit block for 027 to DONE: tasks count, suite count, gotchas found during implementation. Update the `project_kihub_new_architecture` memory note.
- [ ] T060 Final gates: `pnpm --filter web test` (record the count vs the T001 baseline), `pnpm --filter web lint`, `pnpm --filter web exec tsc --noEmit`, `pnpm --filter web generate:importmap` if the admin import map changed. Run `next build` against the migrated `kihub_migtest_027` with `AUTH_MODE=entra`.
- [ ] T061 Re-run quickstart §1 (migration up/down/up + SC-003 compare) on a fresh scratch copy with both migrations, and record the results in tasks.md Notes.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (1)** → **Foundational (2)** → user stories. Phase 2 blocks everything: it removes `status`
  and introduces `_status`, which every later file and test depends on.
- **US1 (3)** needs only Phase 2.
- **US2 (4)** needs Phase 2. T031's `{ preview: true }` assertions use the T011 readers (Phase 2),
  not US1's route work, so US2 can run in parallel with US1.
- **US3 (5)** needs Phase 2 and US1's `lib/preview-paths.ts` (T022) + `lib/preview.ts` (T023) for
  `admin.preview` and the route. Do T022/T023 first if US3 is staffed in parallel.
- **US4 (6)** and **US5 (7)** need Phase 2 (and T039 for the `pages` rows in their tables).
- **US6 (8)** dropped.
- **Polish (9)** after the stories you intend to ship.

### Within stories

Tests first and failing → pure helpers → collection/config → readers → routes/components → browser check.

### Parallel opportunities

- Phase 2: T004 ‖ T005, then T007 ‖ T008 ‖ T009 (after T006 sets the pattern, or all four at once).
- US1: T019 ‖ T020 ‖ T021 ‖ T022, then T025 ‖ T026 while T023 → T024 proceed.
- US3: T035 ‖ T036 ‖ T037 ‖ T038, then T042 ‖ T044 after T039.
- US4/US5 test tasks (T047, T049) touch different `describe` blocks and can be written in parallel. Note T047/T049 edit the same file as T031: coordinate, or append in sequence.

## Parallel Example: User Story 1

```text
Together: T019 preview-paths.test.ts | T020 route-caching.test.ts | T021 preview-state.test.ts | T022 lib/preview-paths.ts
Then:     T023 lib/preview.ts → T024 api/preview/route.ts
Alongside: T025 api/preview/exit/route.ts | T026 PreviewBanner.tsx
Then:     T027 layout → T028 detail routes → T029 admin.preview → T030 browser check
```

## Implementation Strategy

### MVP (Phase 1 + 2 + US1)

Drafts plus preview for the four existing content types is already the core user need ("review it
before we publish it to prod"). Stop after T030, run T060, and it can ship as its own PR.

### Incremental delivery

1. MVP (US1), with US2's tests added before merge: they guard the main invariant.
2. US3 Pages: its own migration (T041) makes it a separable PR, and it carries the constitution
   amendment.
3. US4 + US5: verification-only increments, tests plus checks.

## Notes

- `[P]` = different files and no dependency on unfinished work. The three tasks editing
  `content-drafts.test.ts` (T031, T047, T049) are not `[P]` with each other.
- The migration is the riskiest step (T013/T014). Never run `migrate` against a shared or prod DB
  before the scratch verification is recorded.
- Record baseline counts, migration verification and browser-check outcomes below as you go.

### Implementation record

**MVP (Phases 1–3, T001–T030) implemented 2026-11-05.** Suite **488/488 across 55 files**
(baseline 422/422 across 51), lint clean, `tsc --noEmit` clean, `next build` green against the
migrated `kihub_migtest_027` with `AUTH_MODE=entra` + azure media mode.

- **T001** baseline on the shared `kihub` DB: 422/422 across 51 files.
- **T002** deviation: `apps/web/.env` was NOT repointed. `kihub-web-026` derives its DB from that
  file by stripping `/kihub`, so editing it would break the other worktree. Every command instead
  overrides `DATABASE_URI="${DATABASE_URI%/kihub}/kihub_027"`, and so does the new `kihub-web-027`
  launch config (port 3027).
- **T003** `kihub_migtest_027` was seeded from the dev DB with a `pg_dump --data-only` of the content
  tables: 10 news (8 published, 4 tag rows, 1 with hero image), 7 projects (6 published), 16 events
  (14 published, 16 tag rows), 8 learning pages (7 published, 2 with subcategory). The fingerprint
  query is in `scripts/sc003-baseline.sql`.
- **T012** `migrate:create` asks interactively whether `_status` is new or renamed from `status`.
  We answered **rename** (driven with `expect`) in both directions. The old column already uses the
  enum type Payload names for `_status` (`enum_<t>_status`), so the rename keeps every value with
  no copy step. Research R2 step 2 is therefore a rename, not an UPDATE.
- **T012 gotcha:** generate in `MEDIA_STORAGE_MODE=azure` (dummy Azure settings are fine). In disk
  mode the storage plugin is absent, and the generator emits `ALTER TABLE "media" DROP COLUMN
  "_objectkey"`, which would destroy prod data from #175. The same applies to `generate:types`:
  disk mode drops `_objectkey` from `payload-types.ts`.
- **T013** the backfill inserts one `latest` version per doc into `_news_v`, `_projects_v`,
  `_events_v` and `_learning_pages_v`, plus `_news_v_texts`/`_events_v_texts`. Events'
  `event_type`/`format` need a `::text::` cast to the version enums. `down` only needed `IF EXISTS`
  (only CASCADE table drops, no named FK drops).
- **T014** on scratch: `up` gives an identical SC-003 fingerprint, and `latest` versions equal the
  doc counts in all 4 tables (texts 4/4, 16/16; hero image and subcategories preserved). `down`
  gives `status` back identical. Re-`up` is identical.
- **T015** `kihub_027` is a push-mode DB (only the `dev` marker), so the `up` SQL was applied
  directly with psql (017 gotcha). Afterwards push-mode accepted the schema without a prompt,
  confirming the migration matches the config.
- **T021** `lib/preview.ts` imports Auth.js, which vitest cannot load. The pure rule therefore
  lives in `lib/preview-access.ts` (`resolvePreviewActive`), used by both `getPreviewState` and
  `/api/preview`. The test's role downgrade must run as an Admin (Users hook), and its cleanup
  deletes the resulting `audit-log` row first (`actor` is NOT NULL, a pre-existing constraint).
- **T030** browser + curl on `kihub-web-027`, mock auth:
  - In `/cms` → News → create, autosave created the draft immediately ("Last saved…", Versions
    tab), derived the slug, and showed the preview button
    (`/api/preview?path=%2Fnews%2Fforhandsvisning-test-027`).
  - **Contributor:** 303 to the article, which renders with the banner. The banner shows on
    every page while active. `/news` and the frontpage do NOT list the draft. The cookie is
    re-issued as `Max-Age=3600; HttpOnly; SameSite=lax`.
  - **Reader:** `/api/preview` gives a 303 with no cookie, then 404. A reader sending the
    contributor's own bypass cookie still gets 404.
  - **Error cases:** no session → 307 `/signin`. `//evil.com`, `https://evil.com`, `/\evil.com`
    and an empty path → 400.
  - **Exit:** «Avslutt forhåndsvisning» clears the cookie and returns to the same page (now 404,
    no banner). A foreign Referer → `/`.
  - **Pre-existing content:** a learning-page draft from August previews with full body and
    sidebar (backfill verified).
  - Test draft left in `kihub_027`: news #1170 «Forhåndsvisning test 027».
- **Scheduling dropped (2026-11-05, after T030).** At the product owner's request, `schedulePublish`
  was removed from `CONTENT_VERSIONS`. The scratch DB was rolled back, the old
  `20261105_121419_drafts` migration was deleted, and it was regenerated as
  **`20261105_122923_drafts`** (same azure-mode + rename procedure, same hand-written backfill and
  `IF EXISTS` patch), now without the `payload_jobs`/`payload_jobs_log` tables and their enums.
  Re-verified on `kihub_migtest_027`: up/down/up with an identical SC-003 fingerprint, `latest`
  versions = doc counts, no `payload_jobs*` tables. The jobs tables were dropped from `kihub_027` by
  hand, and types regenerated in azure mode (`tasks: unknown` as on main). The CMS «Publish changes»
  button no longer has the schedule dropdown. Suite 488/488 across 55 files, lint, `tsc` and
  `next build` all green.
