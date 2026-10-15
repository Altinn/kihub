---
description: "Task list for 023 content source seam"
---

# Tasks: Content Source Seam (Payload → Umbraco migration, step 1)

**Input**: Design documents from `specs/023-content-source-seam/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R12), data-model.md,
contracts/content-source.md, contracts/rich-text.md, quickstart.md

**Tests**: REQUESTED by the spec (FR-017, FR-018, SC-001), so test tasks are included. The parity
goldens (Phase 1) are written and captured BEFORE any production code changes.

**Organization**: Tasks are grouped by user story:
- **US1 (P1)**: employees notice no difference. This covers view models, rich text and the
  per-module refactor, proven by parity.
- **US2 (P1)**: operators choose the source per module.
- **US3 (P2)**: developers can add a source for one module in isolation.

All paths are relative to the repo root. The web app is `apps/web/`.

## Ground rules for every task

- **Never run the parity suite with `-u` after T005.** A golden mismatch means the change is wrong,
  not the golden.
- Tests need the env exported: `set -a; source apps/web/.env; set +a`.
- Payload queries move **verbatim**: same `where`, `sort`, `limit`, `depth`, `overrideAccess`
  (research R10). Mapping happens after the query.
- Integration tests may change only where they assert on the read-layer return shape (e.g. `id`
  is now a string, relations are resolved). Never delete or loosen an assertion of a guarantee
  (published-only, ordering, clamp, 404).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (parity harness on UNCHANGED code)

**Purpose**: Capture the byte-level "before" picture of every editorial surface (research R8), so
every later phase is checked against it.

- [X] T001 Spike the render path in `apps/web/tests/unit/content-parity.test.ts`. Prove that one page
  renders to HTML without Next and without a DB:
  - **Mocks**: `vi.mock('payload', …)` with `getPayload` returning a stub whose `find` returns one
    project; `vi.mock('@payload-config', () => ({ default: {} }))`;
    `vi.mock('@/auth', () => ({ auth: async () => ({ user: { email: 'ada@digdir.no' } }) }))`.
  - **Render**: `await ProjectDetailPage({ params: Promise.resolve({ slug }) })` (default export of
    `apps/web/src/app/(app)/prosjekter/[slug]/page.tsx`), then
    `renderToStaticMarkup(element)` from `react-dom/server`. Test files are `.ts`, so use the
    returned element directly; no JSX in tests.
  - **Also prove**:
    - `await SiteHeader()` renders, which covers `SiteNav`'s `usePathname` outside the app router;
    - the frontpage renders with `SubscriptionsBanner`'s Designsystemet `Dialog`.
  - **Record** what worked, and any surface needing the component-level fallback, under
    "Notes" at the bottom of this file.
- [X] T002 Create the in-memory Payload fake in `apps/web/tests/helpers/fake-payload.ts`:
  - `createFakePayload({ collections, globals })`.
  - **`find({ collection, where, sort, limit = 10, page = 1 })`**:
    - honours `slug: { equals }` and `status: { equals: 'published' }`, wherever they appear in a
      (nested) `and` array;
    - ignores every other predicate (date ranges, type/format filters);
    - sorts by `sort` (a string or an array; a leading `-` means desc);
    - pages by `limit`/`page`;
    - returns `{ docs, totalDocs, totalPages, page }`, with Payload's semantics: an empty
      collection gives `totalPages: 0`, and a page past the end gives `docs: []`.
  - **`findGlobal({ slug })`** returns the fixture global or `null`.
  - **Call log**: every `find`/`findGlobal` call appends
    `{ op, collection | slug, where, sort, limit, page, depth, overrideAccess }`, with argument
    values copied verbatim and `undefined` keys omitted, to `fake.calls`. `fake.resetCalls()`
    clears it (research R8, R10).
  - Support swapping the fixture set at runtime (`fake.useFixtures(set)`), so the parity suite can
    render the same surfaces against the empty set (C2).
  - Export a `mockPayloadModule(fake)` helper returning `{ getPayload: async () => fake }` for use in
    `vi.mock` factories.
- [X] T003 [P] Create deterministic fixtures in `apps/web/tests/helpers/content-fixtures.ts`. Use
  fixed numeric ids, fixed ISO timestamps, fixed filenames (`/payload-api/media/file/<name>`) and a
  `lexical(...)` builder for bodies. Include:
  - **media**:
    - full 16:10 `card`/`card2x` plus `content`/`content2x`, with `focalX: 0, focalY: 35`;
    - a small original where `content` = `content2x` = the same width (exercises dedupe);
    - one with `focalX`/`focalY` `null`.
  - **news**: 14 published plus 1 draft (so `/news?page=2` exists):
    - one with an uploaded hero, one with a legacy `heroImageUrl`, one with neither;
    - one with `heroImage` as a bare id;
    - populated `author` users (name only, email only);
    - tags including an empty string;
    - one body with an inline upload node.
  - **events**: published upcoming plus past:
    - featured and non-featured;
    - with and without `endDateTime`;
    - `onlineUrl`, `capacity`/`seatsTaken`;
    - every `eventType`;
    - plus one draft.
  - **projects**: 3 published with tied `order` values, plus 1 draft.
  - **learning**: 2 categories and 2 subcategories, with pages directly under a category and under a
    subcategory, and a draft page. One page body contains:
    - paragraph, heading, list, link;
    - a `Code` block (`typescript`) and an empty `Code` block;
    - a `youtube` block with a `?t=` start, and one with an invalid URL;
    - an upload node and a `decorative` upload node;
    - an upload node whose media is `null`;
    - a block node of an unregistered type (e.g. `blockType: 'unknownWidget'`), which pins today's
      handling of unrecognised blocks.
    The page has populated `category`/`subcategory`/`author`.
  - **globals**:
    - `frontpage` is `null` (defaults path);
    - `site-chrome` is stored with nav and footer;
    - also export a stored `frontpage` variant with rich-text chip descriptions for a second
      frontpage case, and a `site-chrome: null` variant (defaults path).
  - **an `EMPTY` fixture set**: every collection empty (no news, events, projects or learning
    content) and both globals `null`.
- [X] T004 Write the full parity suite in `apps/web/tests/unit/content-parity.test.ts`, replacing the
  spike body:
  - Wire `vi.mock('payload')` to `createFakePayload(fixtures)`, and keep the T001 mocks.
  - Pin the clock with `vi.useFakeTimers({ toFake: ['Date'] })` and
    `vi.setSystemTime(new Date('2026-10-15T08:00:00Z'))`.
  - Render each surface below and assert
    `await expect(html).toMatchFileSnapshot('./__parity__/<surface>.html')`:
    - `frontpage-defaults`, `frontpage-stored`
    - `news-p1`, `news-p2`, `news-p99` (clamp)
    - `news-article-upload`, `news-article-legacy`, `news-article-none`, `news-article-bare-id`
    - `events-list`, `events-calendar` (use the real search-param names from
      `parseEventsSearchParams` in `apps/web/src/lib/events-view.ts`), `event-detail`, `event-past`
    - `event-ics` (call the `GET` export of `apps/web/src/app/(app)/events/[slug]/ics/route.ts`;
      snapshot `await res.text()` to `.ics`)
    - `projects-list`, `project-detail`
    - `laering-index`, `laering-page`
    - `site-header`, `site-footer` (stored chrome), `site-header-defaults`, `site-footer-defaults`
      (`site-chrome: null`)
    - against the `EMPTY` set: `news-empty`, `events-empty`, `projects-empty`, `laering-empty`,
      `frontpage-empty`
  - For the ICS case, build the request as `new Request('http://kihub.test/events/<slug>/ics')`, so
    the origin in the file doesn't depend on the environment.
  - **Query goldens**: call `fake.resetCalls()` before each surface, and after rendering assert
    `await expect(JSON.stringify(fake.calls, null, 2)).toMatchFileSnapshot('./__parity__/<surface>.queries.json')`.
  - Draft and unknown slugs: assert the page calls `notFound()`. Expect the thrown
    `NEXT_HTTP_ERROR_FALLBACK;404` / `NEXT_NOT_FOUND` digest.
- [X] T005 Capture the goldens on unchanged code. This is the ONLY permitted `-u` run:
  1. `pnpm --filter web exec vitest run tests/unit/content-parity.test.ts -u`.
  2. Open every file in `apps/web/tests/unit/__parity__/` and confirm it contains the real fixture
     content: each `*.html` shows the expected titles (the `*-empty` ones show the module's empty
     state), and each `*.queries.json` lists the expected collections. A golden of an error page, an
     unexpectedly empty `<main>` or an empty call log is a harness bug: fix it and recapture.
  3. Rerun without `-u` and confirm it is green.
  4. Run the full `pnpm --filter web test` and confirm it is green.
  5. Commit the harness and goldens ALONE: `test(parity): golden HTML of editorial surfaces before 023 refactor`.

**Checkpoint**: The goldens are committed. From here on, the parity suite is the definition of
"no visible change".

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: The neutral types and the shared Payload helpers that every module task builds on.

- [X] T006 [P] Create `apps/web/src/lib/content/rich-text.ts` (contracts/rich-text.md §1):
  - Move the hand-declared lexical root interface from `apps/web/src/lib/site-content-defaults.ts`
    here as `LexicalDocument`.
  - Add `RichTextContent = { format: 'lexical'; document: LexicalDocument }` and a
    `lexicalContent(document)` constructor.
  - In `site-content-defaults.ts`, import `LexicalDocument` and replace every `RichTextValue` use
    (types unchanged otherwise for now).
  - Update the type import in `apps/web/tests/unit/subscriptions-banner-view.test.ts` to
    `LexicalDocument`.
- [X] T007 [P] Create `apps/web/src/lib/content/types.ts` with `ImageRendition`, `RenditionName`,
  `ContentImage`, `Author`, `NewsHero`, `NewsArticle`, `NewsPage`, `EventItem`, `ProjectItem` and
  `LearningArticle`, exactly as in `specs/023-content-source-seam/data-model.md`.
  - Import `EventTypeValue`/`EventFormatValue` from `@/lib/events-view` and `RichTextContent` from
    `./rich-text`.
  - No Payload imports.
- [X] T008 [P] Create `apps/web/src/lib/content/ports.ts` with:
  - `ContentModule = 'news' | 'events' | 'projects' | 'learning' | 'frontpage' | 'siteChrome'`;
  - the six port interfaces from contracts/content-source.md §3;
  - `ModuleSources = { news: NewsSource; events: EventsSource; … }`.
  `LearningLibrary` comes from `@/lib/learning-view`; `FrontpageContent`/`SiteChrome` from
  `@/lib/site-content-defaults`.
- [X] T009 Create `apps/web/src/lib/content/payload/client.ts` exporting `payloadClient()`
  (`getPayload({ config })`) and `PUBLISHED`, both moved from `apps/web/src/lib/payload-queries.ts`.
  Temporarily make `payload-queries.ts` re-export `PUBLISHED` from here; T029 removes it.
- [X] T010 [P] Create `apps/web/src/lib/content/payload/media.ts` with:
  - `toContentImage(value: number | Media | null | undefined): ContentImage | null`. This returns
    `null` for a nullish value or a bare id. Every rendition present in `sizes` is mapped to
    `{ url ?? null, width ?? null, height ?? null }`, and absent size keys stay absent. Focal `null`
    stays `null`.
  - `toAuthor(value: number | User | null | undefined): Author | null`.
  Add `apps/web/tests/unit/content-mapping.media.test.ts`, covering:
  - focal 0 kept;
  - focal null kept;
  - partial `sizes`;
  - a size with `url: null`;
  - bare id → null;
  - `author` as id → null;
  - name-only and email-only authors.

**Checkpoint**: The types compile (`pnpm --filter web exec tsc --noEmit`), and the parity suite is
still green (no production behaviour changed yet).

---

## Phase 3: User Story 1 — Employees notice no difference (Priority: P1) 🎯 MVP

**Goal**: Every employee-facing editorial page and component consumes KI Hub view models and the
single rich-text entry point, and the parity goldens still match byte-for-byte.

**Independent Test**: `pnpm --filter web exec vitest run tests/unit/content-parity.test.ts`
(without `-u`) is green, the full suite is green, and quickstart §3 shows no browser diff.

### Rich-text entry point (contracts/rich-text.md)

- [X] T011 [US1] Create `apps/web/src/components/rich-text/LexicalRichText.tsx`, which renders
  `<RichText data={document} converters=…>` from `@payloadcms/richtext-lexical/react`:
  - profile `standard` passes NO `converters` prop, identical to today's bare calls;
  - profile `learning` uses the converters moved verbatim from
    `apps/web/src/components/LearningBody.tsx`.
  The converters now map nodes to neutral props:
  - `upload` → `<LearningImage image={toContentImage(node.value)} decorative={Boolean(node.fields?.decorative)} />`
  - `Code` → `<LearningCodeBlock code={fields.code ?? ''} language={fields.language ?? null} />`
  - `youtube` → `<LearningVideo url=… title=… caption=… />`
  Then change the props of `apps/web/src/components/LearningImage.tsx`,
  `LearningCodeBlock.tsx` and `LearningVideo.tsx` to the neutral shapes in contracts/rich-text.md
  §4, keeping their bodies' logic identical: `image.renditions.content?.url ?? image.url`, the
  width/height fallbacks, the empty-code and invalid-URL early returns, and the title fallback.
- [X] T012 [US1] Create `apps/web/src/components/RichTextBody.tsx`:
  - signature `RichTextBody({ value, profile = 'standard' }: { value: RichTextContent; profile?: 'standard' | 'learning' })`;
  - an exhaustive `switch (value.format)`, with a `never` check in the default branch, delegating
    `'lexical'` to `LexicalRichText`;
  - no wrapper element of its own.
  Run the parity suite. It must still be green, since nothing calls the new component yet.

### Projects (smallest module first)

- [X] T013 [P] [US1] Add `apps/web/tests/unit/content-mapping.projects.test.ts` for `toProjectItem`:
  - `id` stringified;
  - `slug: null` → `''`;
  - `summary` nullish → `null`;
  - `body` wrapped as `{ format: 'lexical', document }`.
- [X] T014 [US1] Create `apps/web/src/lib/content/payload/projects.ts`:
  - `toProjectItem`;
  - `payloadProjectsSource: ProjectsSource`, with the two queries moved verbatim from
    `apps/web/src/lib/projects.ts`.
  Then rewrite `apps/web/src/lib/projects.ts` as a facade: `listPublishedProjects()` and
  `getPublishedProjectBySlug()` delegate to `payloadProjectsSource` and return `ProjectItem`
  types. The registry comes in US2.
- [X] T015 [US1] Retype the project consumers:
  - `apps/web/src/components/ProjectCard.tsx` → `ProjectItem`, and drop the `@/payload-types`
    import;
  - `apps/web/src/app/(app)/prosjekter/page.tsx`;
  - `apps/web/src/app/(app)/prosjekter/[slug]/page.tsx` → `<RichTextBody value={project.body} />`
    instead of `RichText`.
  Adjust the shape-only assertions in `apps/web/tests/integration/projects-access.test.ts`. The
  parity suite and the projects suites must be green.

### Events

- [ ] T016 [P] [US1] Add `apps/web/tests/unit/content-mapping.events.test.ts` for `toEventItem`:
  - every nullable field → `null`;
  - `description` wrapped;
  - `eventType`/`format` passed through;
  - `status`/`featured`/`tags` absent from the result.
- [ ] T017 [US1] Create `apps/web/src/lib/content/payload/events.ts`:
  - `toEventItem`;
  - `payloadEventsSource: EventsSource`, with `listUpcoming` (query plus the featured-first
    stable sort, applied to the Payload docs BEFORE mapping), `listInRange` and
    `getPublishedBySlug` moved verbatim from `apps/web/src/lib/events.ts`.
  Rewrite `lib/events.ts` as a facade with the same exported names.
- [ ] T018 [US1] Retype the event consumers to `EventItem` and remove their `@/payload-types`
  imports:
  - `apps/web/src/components/EventsDayList.tsx`, `EventsMonthCalendar.tsx`, `EventsTimeline.tsx`,
    `NextEventCard.tsx`;
  - `apps/web/src/app/(app)/events/page.tsx`;
  - `apps/web/src/app/(app)/events/[slug]/page.tsx` → `<RichTextBody value={event.description} />`;
  - `apps/web/src/app/(app)/events/[slug]/ics/route.ts`, which should compile unchanged because
    `EventItem` satisfies `IcsEvent`.
  Remove now-redundant `as EventTypeValue` casts only where the type already says so. Adjust the
  shape-only assertions in `apps/web/tests/integration/events-access.test.ts`. Parity must be green.

### News (+ images)

- [ ] T019 [P] [US1] Add `apps/web/tests/unit/content-mapping.news.test.ts` for `toNewsArticle`:
  - `tags` filtered of empties;
  - `author` resolved;
  - `hero` precedence: populated media with url → `image`; populated media without url → legacy;
    bare id → legacy or none; blank `heroImageUrl` → none.
  MOVE the existing `resolveHeroSource` cases out of `apps/web/tests/unit/news-view.test.ts` into
  this file, adapted to the new return shape. Keep the same inputs and the same precedence
  expectations.
- [ ] T020 [US1] Create `apps/web/src/lib/content/payload/news.ts`:
  - `resolveHeroSource`, moved from `apps/web/src/lib/news-view.ts` and returning `NewsHero` with
    `image: toContentImage(media)`;
  - `toNewsArticle`;
  - `payloadNewsSource: NewsSource`, with the three queries moved verbatim, including the clamp.
  Rewrite `apps/web/src/lib/news.ts` as a facade. `NewsPage` is now imported from
  `@/lib/content/types` and re-exported.
- [ ] T021 [US1] Retype the pure helpers in `apps/web/src/lib/news-view.ts`:
  - `pickCardImage(image: ContentImage)` and `pickArticleImage(image: ContentImage)`.
  - Property paths only: `media.sizes?.X` → `image.renditions.X`, `media.focalX` →
    `image.focalX`, `media.url`/`width`/`height`/`alt`/`updatedAt` keep their names.
  - Delete `resolveHeroSource`/`HeroSource` from this file and remove the `@/payload-types`
    import.
  Convert the fixtures in `apps/web/tests/unit/news-view.test.ts` to `ContentImage`, with
  identical expected values.
- [ ] T022 [US1] Retype the news consumers:
  - `apps/web/src/components/NewsCard.tsx` → `article: NewsArticle`, with
    `article.hero.kind === 'image' ? pickCardImage(article.hero.image) : null` and the legacy branch
    on `kind === 'legacy'`;
  - `apps/web/src/app/(app)/news/page.tsx`;
  - `apps/web/src/app/(app)/news/[slug]/page.tsx`: byline from `article.author`, `article.tags`
    already filtered, `<RichTextBody value={article.body} />`;
  - `apps/web/src/app/(app)/page.tsx` (frontpage «Siste nytt»; `selectLatestNews` is generic and
    unchanged).
  Adjust the shape-only assertions in `apps/web/tests/integration/news-access.test.ts` and
  `news-hero.test.ts`. Parity must be green, including all four `news-article-*` goldens.

### KI Læring

- [ ] T023 [P] [US1] Add `apps/web/tests/unit/content-mapping.learning.test.ts` for
  `toLearningArticle`:
  - populated `category`/`subcategory` → titles;
  - ids or null → `''`;
  - `author` resolved or null;
  - `body` wrapped;
  - `updatedAt` passed through.
- [ ] T024 [US1] Create `apps/web/src/lib/content/payload/learning.ts`:
  - `payloadLearningSource: LearningSource`, with `readLibrary` moved verbatim from
    `apps/web/src/lib/learning.ts` (three queries, `depth: 0`, same mapping into `LearningLibrary`),
    and `getPublishedPageBySlug` (same query, default depth) plus `toLearningArticle`.
  Rewrite `apps/web/src/lib/learning.ts` as a facade.
- [ ] T025 [US1] Update the learning consumers:
  - `apps/web/src/components/LearningBody.tsx`: `body: RichTextContent`, keep the
    `lp-page__body kihub-prose` wrapper, render `<RichTextBody value={body} profile="learning" />`,
    and remove the converters and Payload imports, which now live in `LexicalRichText`;
  - `apps/web/src/app/(app)/laering/[slug]/page.tsx`: use `page.categoryTitle`,
    `page.subcategoryTitle`, and `page.author?.name || page.author?.email || null`; delete
    `relationTitle` and the `@/payload-types` import.
  Adjust the shape-only assertions in `apps/web/tests/integration/learning-access.test.ts` and
  `learning-tree-reads.test.ts`. Parity must be green, including the `laering-page` golden with
  code, video and images.

### Frontpage + site chrome

- [ ] T026 [P] [US1] Add `apps/web/tests/unit/content-mapping.site-content.test.ts`:
  - `mergeFrontpage(null)` equals the defaults, with chip descriptions and `requestAccess.body`
    wrapped as `RichTextContent`;
  - a stored subscriptions section is wrapped the same way;
  - a stored `requestAccess` missing label/body falls back per field;
  - tiles ≠ 2 → default tiles;
  - `mergeSiteChrome` per-section fallback is unchanged.
- [ ] T027 [US1] Create `apps/web/src/lib/content/payload/site-content.ts`:
  - `mergeSiteChrome` and `mergeFrontpage`, moved from `apps/web/src/lib/site-content.ts`.
    `mergeFrontpage` wraps rich text into `RichTextContent` for both stored and defaulted chips and
    request-access (research R12).
  - `payloadFrontpageSource` and `payloadSiteChromeSource`, holding the two `findGlobal` reads.
  In `apps/web/src/lib/site-content-defaults.ts`:
  - `Chip.description` and `RequestAccess.body` become `RichTextContent`;
  - add stored-shape types (`FrontpageDefaults` and its stored chip/requestAccess) using
    `LexicalDocument`;
  - type `DEFAULT_FRONTPAGE` as `FrontpageDefaults`, leaving its values untouched.
  Check that `apps/web/src/globals/Frontpage.ts` `defaultValue`s still compile. Rewrite
  `apps/web/src/lib/site-content.ts` as a facade that keeps the type re-exports. Point the merge
  imports in `apps/web/tests/integration/site-content-access.test.ts` at the new module.
- [ ] T028 [US1] In `apps/web/src/components/SubscriptionsBanner.tsx`, replace both `RichText` calls
  with `<RichTextBody value=… />` (standard profile) and remove the
  `@payloadcms/richtext-lexical/react` import. Parity must be green: `frontpage-defaults`,
  `frontpage-stored`, `site-header`, `site-footer`.
- [ ] T029 [US1] Delete `apps/web/src/lib/payload-queries.ts` and repoint any remaining importers
  (`grep -rn "payload-queries" apps/web/src apps/web/tests`) to `@/lib/content/payload/client`.
  Then confirm that
  `grep -rln "@/payload-types\|@payloadcms/richtext-lexical/react\|from 'payload'" "apps/web/src/app/(app)" apps/web/src/components`
  lists only `apps/web/src/components/cms/**` and `apps/web/src/components/rich-text/LexicalRichText.tsx`.
  Run the full suite plus `tsc --noEmit`.

**Checkpoint**: US1 is complete. The pages are CMS-neutral and the parity is byte-identical. This
is shippable on its own, since every facade still calls the Payload adapter directly.

---

## Phase 4: User Story 2 — Operators choose the content source per module (Priority: P1)

**Goal**: There is one setting per module, `payload` is the default, and a bad value fails fast
with one clear message.

**Independent Test**: `apps/web/tests/unit/content-source-config.test.ts` is green, and quickstart §4
(bad values refuse to serve; `Payload`, blank and unknown names start normally).

- [ ] T030 [P] [US2] Write `apps/web/tests/unit/content-source-config.test.ts` BEFORE the
  implementation (contracts/content-source.md §2 and §5). Cover:
  - an empty env → all `payload`;
  - an explicit `payload`;
  - `' Payload '` → `payload`;
  - a single invalid value → throws `ContentSourceConfigError` naming the setting, the raw value and
    `accepted: payload`;
  - two invalid values → ONE error listing both, in module order;
  - `CONTENT_SOURCE_SOMETHING` is ignored;
  - `resolveModuleSources(config, { payload: A, fixture: B })` with only `projects: 'fixture'` →
    projects from B and everything else from A, which proves per-module independence.
  Confirm the tests fail.
- [ ] T031 [US2] Create `apps/web/src/lib/content/config.ts`:
  - `CONTENT_MODULES`, an ordered list;
  - `SETTING_FOR_MODULE`, mapping each module to its env name (`siteChrome` →
    `CONTENT_SOURCE_SITE_CHROME`);
  - `SOURCE_IDS = ['payload'] as const` and `SourceId`;
  - `ContentSourceConfigError`;
  - a pure `readContentSourceConfig(env: Record<string, string | undefined>)`.
  T030 must now be green.
- [ ] T032 [US2] Create `apps/web/src/lib/content/payload/index.ts` exporting `payloadSources:
  ModuleSources`. Create `apps/web/src/lib/content/registry.ts` with:
  - `SOURCES: Record<SourceId, ModuleSources> = { payload: payloadSources }`;
  - a pure `resolveModuleSources(config, table)`;
  - memoised getters `newsSource()`, `eventsSource()`, `projectsSource()`, `learningSource()`,
    `frontpageSource()` and `siteChromeSource()`. These read
    `readContentSourceConfig(process.env)` once; a failure is cached and rethrown on every call,
    never defaulted.
- [ ] T033 [US2] Switch the facades from direct adapter imports to the registry getters:
  - `apps/web/src/lib/news.ts`, `events.ts`, `projects.ts`, `learning.ts`, `site-content.ts`;
  - each exported function becomes `return xSource().method(...)`.
  Run the full suite. Parity must be green.
- [ ] T034 [US2] In `apps/web/src/instrumentation.ts`, call `readContentSourceConfig(process.env)`
  when `NEXT_RUNTIME === 'nodejs'`, for EVERY `NODE_ENV`, BEFORE the existing production-only
  early return. Use a dynamic import, matching the file's style.
  - On `ContentSourceConfigError`: `console.error(err.message)`, then `process.exit(1)`. This is
    deterministic fail-fast and doesn't depend on how Next.js treats a thrown `register()` error
    (research R6). Rethrow any other error.
  - Extend the doc comment to explain why it exits explicitly.
- [ ] T035 [P] [US2] Add the six `CONTENT_SOURCE_*` rows to `documentation/runtime-config.md`:
  - not required; default `payload`; accepted `payload`;
  - trimmed and case-insensitive;
  - an invalid value aborts startup (the process exits non-zero) with one message listing every
    bad setting;
  - the module→setting mapping;
  - a pointer to `specs/023-content-source-seam/contracts/content-source.md`.
- [ ] T036 [US2] Run quickstart §4 manually:
  1. `next dev` with `CONTENT_SOURCE_NEWS=paylod CONTENT_SOURCE_EVENTS=umbraco`. The process must
     exit non-zero with the single message, before serving any request.
  2. Then a production build plus `next start` with the same values, with the same expectation.
     Build against the migrated scratch DB `kihub_023` with `AUTH_MODE=entra`, using the procedure
     written in T039. Create the DB now if it doesn't exist yet; T039 reuses it.
  3. Record the observed exit code and message under Notes.
  4. Confirm that `Payload`, blank and `CONTENT_SOURCE_SOMETHING=x` start normally.

**Checkpoint**: US2 is complete. Switching a module is one setting, and misconfiguration can't
serve silently.

---

## Phase 5: User Story 3 — Developers can add a source for one module in isolation (Priority: P2)

**Goal**: Prove the seam with a stand-in source for one module and no page change.

**Independent Test**: `apps/web/tests/unit/content-stand-in.test.ts` is green.

- [ ] T037 [US3] Write `apps/web/tests/unit/content-stand-in.test.ts`:
  - Reuse the T002 fake for `payload` and the T001 mocks.
  - `vi.mock('@/lib/content/registry', async (importOriginal) => ({ ...(await importOriginal()), projectsSource: () => standIn }))`,
    where `standIn: ProjectsSource` returns hand-built `ProjectItem`s with ids like `'umb-…'`
    (GUID-style strings) and a `RichTextContent` body.
  - Render `/prosjekter` and `/prosjekter/<stand-in slug>`. Assert the stand-in titles, summary and
    body text appear and the Payload fixture projects do not.
  - Render `/news` in the same test file and assert it still shows the Payload fixture articles,
    which shows the other modules are unaffected.
  - Confirm that no file under `apps/web/src/app` or `apps/web/src/components` was changed to make
    this test pass (SC-004).

**Checkpoint**: All three user stories are complete.

---

## Phase 6: Polish & cross-cutting

- [ ] T038 Add the guardrail (research R9) in `apps/web/eslint.config.mjs`.
  - Add a config object with `files`:
    - `src/app/(app)/**`
    - `src/components/**`
    - `src/lib/*-view.ts`, `src/lib/frontpage-select.ts`, `src/lib/site-content-defaults.ts`
    - the facades `src/lib/news.ts`, `src/lib/events.ts`, `src/lib/projects.ts`,
      `src/lib/learning.ts`, `src/lib/site-content.ts`
    - `src/lib/content/*.ts`
  - Set `ignores`:
    - `src/components/cms/**`
    - `src/components/rich-text/LexicalRichText.tsx`
    - `src/lib/content/registry.ts` (the switch itself)
  - The rule is `no-restricted-imports` with `paths` `@/payload-types`, `payload` and
    `@payload-config`, and `patterns` `@payloadcms/*` and `@/lib/content/payload/*` (so nothing can
    bypass the per-module switch, FR-010). Its message is: "Editorial pages/components
    use KI Hub view models from @/lib/content/types and <RichTextBody> — Payload access lives in
    src/lib/content/payload/ (023)".
  - Note `src/lib/content/payload/**` is NOT matched by `src/lib/content/*.ts`.
  - Run `pnpm --filter web lint` and confirm it is clean. Then do the negative checks, reverting
    each one:
    - quickstart §2: add `@/payload-types` to `NewsCard.tsx` and see the error;
    - add `import { payloadNewsSource } from '@/lib/content/payload/news'` to
      `src/lib/news.ts` and see the error.
- [ ] T039 Run all the gates and record the counts in Notes:
  - `pnpm --filter web test` (suite count, files);
  - `pnpm --filter web lint`;
  - `pnpm --filter web exec tsc --noEmit`;
  - `next build` against a migrated scratch DB with `AUTH_MODE=entra`. Use `createdb kihub_023` on
    `kihub-postgres`, then `pnpm --filter web migrate` with `DATABASE_URI` pointed at it; this is
    the 020 pattern.
  `next build` is the gate that catches implicit `any` (014 lesson).
- [ ] T040 Run quickstart §3 and §5 in the browser:
  - Use the `kihub-web-main` launch config (port 3021, `main` worktree) against the same DB as
    this branch's `kihub-web` (port 3000).
  - Compare the `<main>` HTML of each listed page; expect no diff.
  - Open `/cms` (news, event, learning page, Frontpage global): it must be unchanged.
  - Check `/registry`, an artifact page and search: unchanged.
  - Confirm `git diff main -- apps/web/src/collections apps/web/src/globals apps/web/src/migrations apps/web/src/payload.config.ts`
    is empty, or only a type-import line in `Frontpage.ts`.
  - Confirm `git diff main -- apps/web/package.json pnpm-lock.yaml` is empty (FR-004).
- [ ] T041 Update the agent context in `CLAUDE.md` (the 023 entry inside `<!-- SPECKIT START -->`):
  - set the status to DONE with the date, task count, suite count, and the lint/tsc/build results;
  - add the R6 `next start` observation and any harness gotchas found in T001;
  - add a pointer to this file's Notes.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (T001–T005)** has no dependencies and MUST be finished and committed first. The goldens
  have to describe the old code.
- **Phase 2 (T006–T010)** depends on Phase 1 and blocks all stories.
- **Phase 3 (US1)** depends on Phase 2. Inside it:
  - T011 → T012 come before any module task;
  - the module groups run sequentially, in the order Projects → Events → News → Learning →
    Frontpage, because each must leave parity green;
  - T029 comes last.
- **Phase 4 (US2)** depends on Phase 2. T030/T031 can start right after Phase 2. T032–T033 need US1's
  adapters (they import `payloadSources`). T034/T035 only need T031.
- **Phase 5 (US3)** depends on US1 and US2 (it mocks the registry getters).
- **Phase 6** depends on everything. T038 can run any time after T029.

### User story dependencies

- **US1** is independent. It is the MVP and shippable alone (facades call Payload adapters
  directly).
- **US2** is independent of US1 for config/validation (T030, T031, T034, T035). Its registry wiring
  (T032/T033) needs US1's adapters.
- **US3** needs US1 and US2.

### Within each module group

The mapping test [P] comes first, then the adapter plus facade, then the consumers. Parity and the
module's integration suite are checked at the end of each group.

---

## Parallel Opportunities

- Phase 1: T003 (fixtures) ∥ T002 (fake), after T001.
- Phase 2: T006 ∥ T007 ∥ T008 ∥ T010. T009 is quick and sequential.
- US1: each module's mapping test (T013, T016, T019, T023, T026) can be written in parallel,
  ahead of its group. They are separate `content-mapping.<module>.test.ts` files.
- US2: T030 ∥ T035, and both can run in parallel with late US1 work.

### Parallel example: US1 mapping tests

```text
Task: "T013 content-mapping.projects.test.ts"
Task: "T016 content-mapping.events.test.ts"
Task: "T019 content-mapping.news.test.ts"
Task: "T023 content-mapping.learning.test.ts"
Task: "T026 content-mapping.site-content.test.ts"
```

---

## Implementation Strategy

### MVP first (US1)

1. Phase 1: capture and commit the goldens.
2. Phase 2: types and helpers.
3. Phase 3: module by module, with parity green after every group. **Stop and validate.** This
   alone already removes all Payload coupling from pages, and could ship.

### Incremental delivery

1. Add US2: the switch plus fail-fast. Ship (no env changes needed anywhere).
2. Add US3: the stand-in proof. Then the guardrail, the gates and the docs.
3. The next feature (Projects on Umbraco) then:
   - adds an `umbraco` entry to `SOURCES` plus `lib/content/umbraco/projects.ts`;
   - renders the same parity surfaces from Umbraco-shaped fixtures, which must match the same
     goldens;
   - sets `CONTENT_SOURCE_PROJECTS=umbraco` in one environment.

---

## Notes

- `content-mapping` is split into per-module files (`content-mapping.<module>.test.ts`) so they can
  be written in parallel. plan.md names one file; this is the only deviation.
- 2026-10-15 `/speckit-analyze` remediation:
  - I1 (fail-fast is now an explicit `process.exit(1)`);
  - C1 (query-call goldens);
  - C2 (empty-state surfaces);
  - C3 (adapter-bypass lint);
  - C4 (unknown block);
  - C5 (default chrome);
  - C6 (dependency diff);
  - F1 (T036 → T039 scratch DB);
  - F2 (plan names per-module mapping files);
  - U1 (fixed ICS request URL).
- Record the T001 spike results, the T036 exit observation, and the T039 gate counts here.
- **Baseline before 023 code** (main @ 673fefa + spec docs): suite **419/419 across 49 files**.
- **T001 spike results**:
  - (a) Importing `.tsx` from tests needs `oxc: { jsx: { runtime: 'automatic' } }` in
    `apps/web/vitest.config.ts`. tsconfig's `jsx: "preserve"` is for Next's compiler, and Vite
    refuses to parse the JSX otherwise. This is test tooling only.
  - (b) `renderToStaticMarkup` cannot await the nested async server components in
    `events/page.tsx` (`ListView`/`CalendarView`). React 19's `renderToReadableStream` + `allReady`
    renders them inline with no Suspense markers, so the harness uses the stream renderer for every
    surface.
  - (c) `SiteNav`'s `usePathname()` is `null` outside the app router and crashes `isActivePath`.
    The harness mocks `next/navigation` with `usePathname: () => '/'` and keeps the real
    `notFound`.
  - (d) `next/link`, `next/image` (frontpage hero art; it emits a deterministic
    `<link rel="preload">`) and Designsystemet's `Dialog` render fine. No surface needed the
    component-level fallback.
  - (e) Payload's default upload converter reads `mimeType` and per-size
    `filename`/`filesize`/`mimeType`, so fixtures carry the full Media shape.
  - (f) An unregistered block renders Payload's `<span>unknown node</span>` and
    `console.error`s. This is pinned in `laering-page.html`.
- **T005 capture gotcha**: the first capture run timed out on the cold first surface (5 s
  default). The timed-out render kept going after the next test had swapped fixtures, so it wrote
  a CONTAMINATED `frontpage-defaults`/`frontpage-stored` pair. Fix: `{ timeout: 60_000 }` on both
  describes; the two pairs were deleted and recaptured, still on unchanged code. After that, three
  consecutive runs (one with `CI=1`) were green with 0 written.
- **T011**: `/bidra` (the contribute guide) also renders `LearningCodeBlock` directly, so a
  `bidra` golden was captured on unchanged component code (own commit) before its props changed.
- **Goldens**: 31 surfaces = 62 files (`.html` + `.queries.json`) plus `event-ics.ics` and its
  queries file. With the parity suite added, the full suite is **457/457 across 50 files**.
