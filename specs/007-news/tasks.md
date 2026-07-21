---
description: "Task list for Phase 7 — News implementation"
---

# Tasks: Phase 7 — News

**Input**: Design documents from `/specs/007-news/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included where the constitution's new-module testing gate applies — the authoring access matrix
+ published-only visibility have a Payload integration test, and slug derivation has a unit test. The
employee pages (server components) and the Payload admin UI are validated via quickstart, not unit tests.

**Organization**: By user story — US1=P1 employees read the feed (MVP), US2=P2 editors author & publish,
US3=P3 publication-visibility invariant. Builds on Phases 1-6. **One new `news` collection; no new
dependency, datastore, or external service.** Entra auth, the five-role model, the Phase 6 back-office,
the lexical editor, and the Payload/PostgreSQL data layer are reused **unchanged**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete deps)
- **[Story]**: US1 / US2 / US3 (setup/foundational/polish carry no story label)
- Paths relative to the `kihub` repo root

## Path Conventions

Monorepo: all Phase 7 code lives in `apps/web/`. Employee pages under `app/(app)/news/`; the collection
under `src/collections/`; the read layer under `src/lib/`. `packages/*` unchanged. Authoring reuses the
Phase 6 Payload admin (`/cms`) — News appears there as another editable collection, gated to Contributor+.

---

## Phase 1: Setup

- [X] T001 [P] Create the News collection `apps/web/src/collections/News.ts` per contracts/news-collection.md + data-model.md: fields (`title`; `slug` unique+indexed; `summary` textarea; `body` richText/lexical; `author` relationship→`users`; `status` select `draft|published` default `draft`; `publishDate` date; `tags` hasMany text; `heroImageUrl` text; `featured` checkbox), `admin.useAsTitle: 'title'` + `defaultColumns`, a `beforeValidate` hook that derives a URL-safe `slug` from `title` when empty (extract a pure `slugify(title)` helper for unit testing), a `beforeChange` hook that defaults `author` to `req.user` on create and sets `publishDate` on first publish, and `access` (read: Contributor+ → `true`, else `{ status: { equals: 'published' } }`; create/update/delete: `isEditor` = `Boolean(req.user) && (req.user.role as Role) !== 'reader'`). News is NOT wired into `@kihub/governance-core`'s permission matrix (research §3)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Make the `news` collection live so it is authorable in `/cms` and queryable by the employee
read layer. Nothing in the user stories can be exercised until the collection is registered.

**⚠️ CRITICAL**: Blocks all user stories

- [X] T002 Register `News` in `apps/web/src/payload.config.ts` (`collections` array), regenerate Payload types (`pnpm --filter web payload generate:types`), and create a prod migration (`pnpm --filter web migrate:create news`); confirm dev schema push creates the `news` table and the collection appears (editable, Contributor+) in `/cms` (depends on T001). NOTE: migration skipped — the repo has no migrations practice (no migrationDir/dir, push-only, as in every prior phase); a one-off migration would break that convention.

**Checkpoint**: `news` collection exists, authorable at `/cms`; read layer + pages can be built against it

---

## Phase 3: User Story 1 - Employees read the internal news feed (Priority: P1) 🎯 MVP

**Goal**: Employees open the app and read published news — a `/news` list (newest-first, featured
surfaced) and a `/news/<slug>` detail page — with a friendly empty state when nothing is published.

**Independent Test**: With one or more published articles present (authored in `/cms` or seeded), sign in
as any employee (incl. a Reader), open `/news`, confirm published articles appear newest-first with
featured surfaced, open one, confirm title/byline/date/body render; confirm the empty state when none.

### Implementation for User Story 1

- [X] T003 [US1] Create `apps/web/src/lib/news.ts` — `listPublishedNews()` (filter `status: published`, sort newest-first by `publishDate`, featured surfaced) and `getPublishedNewsBySlug(slug)` (published only, else `null`), using the Payload local API (`getPayload({ config })`), mirroring `lib/catalog.ts` (depends on T002)
- [X] T004 [P] [US1] Create `apps/web/src/components/NewsCard.tsx` — a Designsystemet list card (title, summary, publish date, tags, featured marker) linking to `/news/<slug>`
- [X] T005 [US1] Create `apps/web/src/app/(app)/news/page.tsx` — the employee news list (published, newest-first, featured surfaced) using `listPublishedNews()` + `NewsCard`, with a friendly Designsystemet empty state when none are published (FR-004/012) (depends on T003, T004)
- [X] T006 [US1] Create `apps/web/src/app/(app)/news/[slug]/page.tsx` — the article detail: title, byline (author's name), publish date, rich-text body rendered with `RichText` from `@payloadcms/richtext-lexical/react`, optional hero image + tags; call `notFound()` for a draft/unknown slug (FR-005/006/011) (depends on T003)
- [X] T007 [P] [US1] Add a "News" link to the employee app header/shell (e.g. `app/(app)/page.tsx` header) pointing at `/news`, so employees can reach the feed
- [X] T008 [US1] Run quickstart.md Scenario 2 end-to-end: with a published article present, `/news` lists it (newest-first, featured surfaced), the detail page renders title/byline/date/body, and the empty state shows when none are published

**Checkpoint**: US1 functional — employees read the news feed; deployable MVP (content seeded/authored via `/cms`)

---

## Phase 4: User Story 2 - Editors author and publish news in the back-office (Priority: P2)

**Goal**: Contributor+ editors create, edit, publish/unpublish, and delete news articles in `/cms`
(server-side gated); Reader/anonymous cannot author or publish.

**Independent Test**: As a Contributor+ persona, create an article in `/cms`, save as draft, publish;
confirm it persists and (published) becomes visible in `/news`. Confirm a Reader/anonymous cannot author.

### Tests for User Story 2 ⚠️

- [X] T009 [P] [US2] Integration test `apps/web/tests/integration/news-access.test.ts` (write first, must fail): with the Payload local API (`overrideAccess: false` + explicit `user`) — a Contributor+ can create/update/publish/delete a `news` doc; a Reader and an anonymous request are refused on create/update; a two-same-title create surfaces a slug uniqueness error; and an employee-scoped read (Reader `user`) returns only `published` docs and never a draft (incl. by slug) — proving the access matrix + published-only visibility (FR-002/003/006/007, and the US3 invariant)
- [X] T010 [P] [US2] Unit test `apps/web/tests/unit/news-slug.test.ts` (write first, must fail): the pure `slugify(title)` helper lowercases, replaces spaces/punctuation with hyphens, collapses repeats, and trims — producing a URL-safe slug (FR-013)

### Implementation / Verification for User Story 2

- [X] T011 [US2] Run quickstart.md Scenarios 1 & 4: a Contributor+ authors and publishes an article in `/cms` (slug auto-derived from the title, author defaulted to them, `publishDate` set on publish) and it appears in `/news`; a Reader is refused authoring at `/cms` (Phase 6 gate) — no code beyond T001/T002 expected

**Checkpoint**: US1 + US2 — editors populate the feed; authoring is Contributor+ only, enforced server-side

---

## Phase 5: User Story 3 - Publication visibility is controlled and safe (Priority: P3)

**Goal**: Only published articles are ever visible to employees; unpublishing immediately removes an
article from every employee surface — list, detail, and direct URL.

**Independent Test**: Reach a draft's `/news/<slug>` directly as an employee (not found); publish it (now
reachable); set it back to draft (gone from the list and its detail URL no longer accessible).

### Verification for User Story 3

- [X] T012 [US3] Run quickstart.md Scenario 3: a draft is absent from `/news` and its `/news/<slug>` returns not-found; unpublishing a published article removes it from the list and 404s its detail — confirming the `lib/news.ts` published-only reads + the collection `read` access constraint hold (the automated invariant is covered by T009; no code beyond T001/T003 expected)

**Checkpoint**: US1 + US2 + US3 — drafts never leak; the feed shows only published content

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T013 [P] Update `README.md`: document the News module — the `/news` employee feed (published, newest-first, featured) and article detail; authoring in the `/cms` back-office by Contributor+; native content per Principle II (no Git source, not an artifact); and that managed image uploads (Azure Blob), scheduled publishing, comments, categories, and a home-page widget are deferred to later phases
- [X] T014 Workspace typecheck + lint (`tsc --noEmit` + `pnpm --filter web lint`) and the full `pnpm --filter web test` suite green — including the new `news-access` + `news-slug` tests and no regression in the existing suites (`route-protection`, `governance-access`, `discovery-*`, `search`, `admin-*`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 (collection file) — start immediately.
- **Foundational (Phase 2)**: T002 (register + types + migration) depends on T001; **BLOCKS all user stories**.
- **User Stories (Phase 3-5)**: depend on Foundational (the live collection).
  - US1 is the read surface (lib + pages + card + nav).
  - US2 is largely delivered by the collection (Foundational) + the Phase 6 back-office; adds the failing-first tests and authoring verification.
  - US3 is delivered by the published-only reads (T003) + `read` access rule (T001); adds verification (its automated invariant rides in T009).
- **Polish (Phase 6)**: after the stories.

### User Story Dependencies

- **US1 (P1)**: Foundational → `lib/news.ts` (T003) → list (T005) + detail (T006); NewsCard (T004) and nav (T007) parallel. MVP.
- **US2 (P2)**: builds on the same collection/access; adds tests (T009/T010) + authoring verification (T011).
- **US3 (P3)**: builds on the published-only read + access rule; verification (T012).

### Within Each User Story

- US2 tests (T009/T010) are written first and must fail before the behavior is relied upon.
- The collection (T001) + registration (T002) are the shared prerequisites for every story.

### Parallel Opportunities

- Setup: T001 alone.
- US1: T004 (NewsCard) ∥ T007 (nav) ∥ T003 (lib) — different files; T005/T006 follow T003 (+T004 for T005).
- US2 tests: T009 ∥ T010 (different files).
- Polish: T013 ∥ (before T014); T014 last, once code is final.

---

## Parallel Example: User Story 1

```bash
# After T002 (collection live):
Task: "Create read layer in apps/web/src/lib/news.ts"                 # T003
Task: "Create NewsCard in apps/web/src/components/NewsCard.tsx"        # T004 (parallel)
Task: "Add a News nav link in app/(app)/page.tsx header"              # T007 (parallel)
# then T005 (list) + T006 (detail)
```

## Parallel Example: User Story 2 tests

```bash
Task: "Integration test the access matrix + visibility in apps/web/tests/integration/news-access.test.ts"  # T009
Task: "Unit test the slugify helper in apps/web/tests/unit/news-slug.test.ts"                               # T010
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup (T001) → 2. Phase 2 Foundational (T002: register + types + migration) → 3. Phase 3 US1
   (read layer + pages + card + nav + Scenario 2) → 4. **STOP & VALIDATE**: an employee reads the `/news`
   feed and article detail (content authored in `/cms`), drafts absent. Deploy/demo (MVP).

### Incremental Delivery

1. Setup + Foundational → `news` collection live, authorable at `/cms`.
2. US1 → employees read the feed (MVP).
3. US2 → authoring role gate proven (tests + verification).
4. US3 → publication-visibility invariant verified (drafts never leak).
5. Polish → docs, typecheck/lint, full suite.

---

## Notes

- [P] = different files, no incomplete dependencies.
- Reuse is deliberate: Entra auth, the five-role model, the Phase 6 back-office entry gate, the lexical
  editor, and the Payload/PostgreSQL data layer are **unchanged**; net-new is one `news` collection, a
  `lib/news.ts` read layer, two employee pages + a card + a nav link, and two tests.
- Published-only visibility is enforced twice (read query + `read` access rule) for defense in depth; the
  employee pages are correct by construction and the API path cannot leak drafts to a Reader.
- No new collection beyond `news`; no new field on existing collections, no new datastore/service/
  dependency; managed uploads (Azure Blob) + scheduled publishing deferred.
- Commit after each task or logical group; stop at any checkpoint to validate independently.
