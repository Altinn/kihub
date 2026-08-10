---

description: "Task breakdown for 014-learning-pages"
---

# Tasks: Learning Pages (KI Læring)

**Input**: Design documents from `/specs/014-learning-pages/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: INCLUDED. Required by the constitution's testing gate, which v3.1.0 names Learning in
explicitly ("New modules (News, Events, Learning) MUST test their access control and any
state/validation rules"), and specified in research §15.

**Organization**: Grouped by user story so each is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on an incomplete task *in the same
  phase*
- **[Story]**: US1 (browse/read), US2 (authoring), US3 (rich content), US4 (visibility)
- All paths are repo-relative

## Path Conventions

Single Next.js app: source under `apps/web/src/`, tests under `apps/web/tests/`. No new workspace
packages.

**Environment note**: integration tests need the env **exported**, not just sourced —
`set -a; source apps/web/.env; set +a` — against the local `kihub-postgres` container.

**Already done — do NOT re-do**: the three dependencies are pinned exactly in
`apps/web/package.json` and installed: `shiki@4.4.3`, `@shikijs/langs@4.4.3`,
`@payloadcms/storage-azure@3.85.2`. Do not add `@shikijs/themes` (the theme is generated) and do not
loosen any pin to a caret range — `@payloadcms/storage-azure` declares `peerDependencies:
{ payload: "3.85.2" }` exactly.

**Do not reinvent**: plan.md → *Reuse and simplicity ledger* lists 14 existing things to reuse as-is
and 8 things deliberately not built. Read it before starting any task.

---

## Phase 1: Setup

**Purpose**: Establish a known-good baseline before touching anything.

- [X] T001 Confirm the baseline is green and record the count: `colima start && docker compose up -d`, then `set -a; source apps/web/.env; set +a && pnpm --filter web test` — expect **212 passing across 28 files**. This number is the regression floor for T045.
- [X] T002 Add the learning media env block to `apps/web/.env.example` — `MEDIA_STORAGE_MODE` (`disk` default), `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER_NAME`, `AZURE_STORAGE_ACCOUNT_BASEURL` — with the same commenting style as the existing `DB_AUTH_MODE` block (contracts/media-storage.md §B).
- [X] T003 Add `MEDIA_STORAGE_MODE=disk` to the local `apps/web/.env` so local dev and the suite run against filesystem storage (contracts/media-storage.md §B1.4).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The three learning collections, their schema, and the read/view layer. **Blocks every
user story.** Media and the rich-content editor deliberately land in US3.

- [X] T004 [P] Create `apps/web/src/collections/LearningCategory.ts` — `title` (required), `description` (textarea), `order` (number, `defaultValue: 100`, admin sidebar). **No `slug`** (data-model.md). `useAsTitle: 'title'`, `defaultColumns: ['title','order']`. Access: `read` → everyone, `create`/`update`/`delete` → `isEditor`, copying the posture in `apps/web/src/collections/News.ts:15-33`. Satisfies FR-015, FR-031.
- [X] T005 [P] Create `apps/web/src/collections/LearningSubcategory.ts` — `title` (required), `category` (relationship → `learning-categories`, **required**, `hasMany: false`), `order`. **No `slug`**, and deliberately **no `subcategory` field** — that absence is what makes deeper nesting impossible (FR-013). Same access posture. Satisfies FR-013, FR-015, FR-031.
- [X] T006 Create `apps/web/src/collections/LearningPage.ts` — `title` (required), `slug` (unique, indexed), `category` (required ref), `subcategory` (optional ref), `summary` (textarea), `body` (`type: 'richText'`, required — **default editor for now**, US3 swaps in the feature-configured one), `status` (select draft|published, default draft), `order`, `author` (ref → users). Access mirrors News exactly: `read` → `isEditor(req.user) ? true : { status: { equals: 'published' } }`. Satisfies FR-013, FR-017, FR-031, FR-032. Depends on T004, T005.
- [X] T007 Register the three collections in `apps/web/src/payload.config.ts` `collections` array (after `Event`, keeping the existing order stable).
- [X] T008 Generate and register the learning migration: `pnpm --filter web migrate:create` (name it `learning_pages`), then add it as the third entry in `apps/web/src/migrations/index.ts` so `prodMigrations` applies it at container boot. Verify it is purely additive — three new tables plus Payload's relationship tables, **nothing** altered in `artifacts`, `news`, `events`, `users` or the globals. Satisfies FR-038, SC-012.
- [X] T009 **REVISED — do NOT run `pnpm --filter web migrate` locally.** The local database is in **push mode** (`payload_migrations` holds only `name='dev', batch=-1`), so `payload migrate` prompts *"you've dynamically pushed changes to your database… data loss will occur. Would you like to proceed?"* — it would rebuild the schema from the baseline and destroy the data prior phases left behind. Verify the chain against a **scratch database** instead, which is also the truer production scenario (a schema built by migrations, not by push): create `kihub_migtest`, run the chain with `DATABASE_URI` pointed at it, confirm all three migrations apply in order and the three learning tables exist, then `migrate:down` and re-apply, then drop the scratch DB. Locally, dev-mode push creates the learning tables on next init. Satisfies SC-012. Depends on T008.
- [X] T010 [P] Create the pure view module `apps/web/src/lib/learning-view.ts`: `buildLearningTree()`, `learningPageHref()`, `formatLearningUpdated()` (nb-NO + `Europe/Oslo`, the `formatNewsDate` recipe), and the `LEARNING_CODE_LANGUAGES` map (8 entries, ids valid for both Monaco and shiki). **No Payload import** — that is what keeps it unit-testable. Implements contracts/learning-read.md §B, guarantees B1–B9.
- [X] T011 Create the read layer `apps/web/src/lib/learning.ts`: `readLearningLibrary()` (exactly **three** queries, pages read with `depth: 0` and `where: PUBLISHED`, all sorted `['order','title']`) and `getPublishedLearningPageBySlug()`. Always published-only by construction, the `lib/news.ts` posture. Implements contracts/learning-read.md §A, guarantees A1–A4. Depends on T006.
- [X] T012 [P] Add `apps/web/tests/unit/learning-view.test.ts` — tree assembly: order + `order`/`title` tiebreak, ungrouped-before-grouped, empty group and empty category pruning, `containsCurrent`/`isCurrent` flags, unresolvable-category pages dropped, and that the function never filters on `status`. Covers B1–B9, FR-008, FR-015. Depends on T010.
- [X] T013 [P] Add `apps/web/tests/unit/learning-date.test.ts` — `formatLearningUpdated` nb-NO long form, including a 00:30-Oslo / previous-UTC-day case and a DST boundary. Covers FR-018. Depends on T010.

**Checkpoint**: schema exists, the tree can be built and tested, nothing is rendered yet.

---

## Phase 3: User Story 1 — Employees browse and read learning content (Priority: P1) 🎯 MVP

**Goal**: `/laering` and `/laering/<slug>` render the library behind a persistent sidebar, in
Norwegian, on the kihub token layer, with zero client components.

**Independent test**: seed the library from quickstart.md §3 and verify sidebar structure and order,
that each entry renders the right page, that the current entry is marked, that drafts are absent,
that `/laering/<slug>` is shareable and reloadable, and that it works at 360 px and with scripting
disabled.

### Implementation for User Story 1

- [X] T014 [US1] **REVISED — a shared component, not `layout.tsx`.** Created `apps/web/src/components/LearningShell.tsx` instead: a Next.js layout does not receive the params of a CHILD segment, so a layout at `/laering` cannot know the `[slug]` being rendered — and the navigation needs it to mark the current entry (FR-003) and open the right group server-side (FR-004). Each route reads the library and renders the shell with its own `currentSlug`. Same two-column grid, same `minmax(0, 1fr)` content column, sidebar on both routes, still inside `(app)` so `requireSession` gates it. Implements contracts/learning-page-ui.md §A (A1–A3), FR-002, FR-033.
- [X] T015 [US1] Create `apps/web/src/components/LearningNav.tsx` — a **server** component: `<nav aria-label="Utforsk læringsinnhold">` with one native `<details>` per category, `open={category.containsCurrent}`, subcategory subgroups nested one level, `aria-current="page"` on the current link. No `'use client'`, no state. Implements §B (B1–B9), FR-003, FR-004, FR-005.
- [X] T016 [P] [US1] Create `apps/web/src/app/(app)/laering/page.tsx` — the overview: `h1` "KI Læring", one section per category (title as `h2`, `description`, entry link to its first page), Norwegian empty state when nothing is published, and **no** sidebar shell in the empty case. Implements §C (C1–C4), FR-007, FR-009.
- [X] T017 [P] [US1] Create `apps/web/src/app/(app)/laering/[slug]/page.tsx` — `h1` title, category/subcategory context derived from the record (not the address), "Sist oppdatert <nb-NO date>" from `updatedAt`, optional `summary` lead, body via `<RichText>` in `.kihub-prose`, Norwegian back link, `notFound()` for draft/unknown. Implements §D (D1–D7), FR-012, FR-018.
- [X] T018 [US1] Add the `/* ==================== 014 /laering ==================== */` section to `apps/web/src/styles/portal.css`: the two-column grid with `min-width: 0` on the content child (this is what stops a wide `<pre>` widening the page — the `portal.css:626` lesson), sticky sidebar on desktop, the `<details>` tree styling, and the single-column phone layout that *replaces* rather than shrinks the desktop one (the `portal.css:534` approach). Every value from `--kihub-*` tokens; do **not** edit `src/styles/kihub/` (synced from the design project). Implements §A (A4–A5), §E (E2–E4), FR-006, FR-034.
- [X] T019 [P] [US1] Add "KI Læring" → `/laering` to both `nav` and `footer.links` in `apps/web/src/lib/site-content-defaults.ts` `DEFAULT_SITE_CHROME`. Do **not** write a migration against the saved `site-chrome` global — an environment with a customised nav keeps editorial control (research §11). Implements §F (F1–F2), FR-001, FR-040.
- [X] T020 [US1] Add `apps/web/tests/integration/learning-tree-reads.test.ts` — the read layer returns published-only, the tree matches the seeded structure, and building it does not scale with page count (assert the query count stays fixed as pages are added). Covers A1–A4, SC-002, SC-010. Depends on T011.

**Checkpoint**: US1 is independently shippable — a prose-only learning library that reads correctly.

---

## Phase 4: User Story 2 — Editors structure the library and author pages (Priority: P2)

**Goal**: the editorial ergonomics that make the library sustainable without a developer — ordering,
grouping constraints, automatic handles, publish/unpublish, and safe deletes.

**Independent test**: build and reorder the structure entirely in `/cms`, publish and unpublish, and
confirm the employee surface reflects it; attempt the two illegal operations and see them refused.

### Implementation for User Story 2

- [X] T021 **MOVED INTO US1 — it is a blocking dependency, not authoring polish.** Added the slug-derivation `beforeValidate` hook to `apps/web/src/collections/LearningPage.ts`, reusing `slugify` from `apps/web/src/lib/slug.ts`. Discovered while verifying US1: pages are addressed by handle and `buildLearningTree` drops any page it cannot link, so with this hook unwritten every seeded page had an empty slug and the whole library rendered as the empty state. US1 cannot work without it. Covers FR-011.
- [X] T022 [US2] Add `filterOptions` to the `subcategory` field in `apps/web/src/collections/LearningPage.ts` so the dropdown offers only subcategories of the selected `category`. This is the **admin affordance** half of FR-014.
- [X] T023 [US2] Add the cross-category `beforeValidate` validation to `apps/web/src/collections/LearningPage.ts` — load the referenced subcategory and reject the write when its `category` differs from the page's `category`, with a Norwegian message. This is the **API-path** half of FR-014, and the reason `filterOptions` alone is insufficient (research §7).
- [X] T024 [US2] Add the `author` stamping `beforeChange` hook to `apps/web/src/collections/LearningPage.ts` (on create only, from `req.user`), mirroring `News.ts:56-59`.
- [X] T025 [P] [US2] Add the `beforeDelete` guard to `apps/web/src/collections/LearningCategory.ts` — count referencing subcategories and pages, and throw a Norwegian `APIError` naming the count when non-zero. Covers FR-016.
- [X] T026 [P] [US2] Add the `beforeDelete` guard to `apps/web/src/collections/LearningSubcategory.ts` — same, counting referencing pages. Covers FR-016.
- [X] T027 [P] [US2] Add `apps/web/tests/unit/learning-slug.test.ts` — page handle derivation from Norwegian titles (æ/ø/å), blank-slug derivation, and stability when the title changes. Covers FR-011. Depends on T021.
- [X] T028 [US2] Add `apps/web/tests/integration/learning-hierarchy.test.ts` — FR-014 rejected **via the API path** (not merely hidden by the admin filter), FR-016 delete refusal with content present, and that a delete succeeds once the content is moved away. Covers FR-014, FR-016. Depends on T023, T025, T026.

**Checkpoint**: the library is safely editable by a non-developer.

---

## Phase 5: User Story 3 — Rich learning content: images and code samples (Priority: P3)

**Goal**: drag-and-drop images with alt text, and display-only syntax-highlighted code samples.
Carries all the new machinery.

**Independent test**: author a page with an uploaded image and code blocks in several languages; verify
rendering, that nothing executes, that refusals work, and that images survive a restart.

### Implementation for User Story 3

- [X] T029 [US3] Create `apps/web/src/lib/media-storage.ts` — the `MEDIA_STORAGE_MODE` selector returning either no plugin (`disk`) or `azureStorage({ collections: { media: true }, connectionString, containerName, baseURL, allowContainerCreate: false })`. **Throws** on `azure` with a missing/blank connection string or container name, and on an unrecognised mode value. Modelled on `apps/web/src/lib/db-auth.ts` so it is the unit test's seam. Implements contracts/media-storage.md §B, B1.1–B1.4, FR-024, FR-025.
- [X] T030 [P] [US3] Add `apps/web/tests/unit/media-storage.test.ts` — `disk` needs no Azure vars, `azure` with missing vars throws a message naming the variable, an unknown mode throws rather than falling back. Covers FR-025, B1.1–B1.4. Depends on T029.
- [X] T031 [US3] Create `apps/web/src/collections/Media.ts` — upload collection: `mimeTypes: ['image/png','image/jpeg','image/webp','image/avif']` (**no SVG**), 5 MB limit, `alt` (required text, the **only** field — no caption), two `imageSizes` (`content` 760, `content2x` 1520), `adminThumbnail` reusing `content`, `focalPoint: false`, `crop: false`. Access: `read` → everyone, writes → `isEditor`. Implements contracts/media-storage.md §A, FR-021, FR-022, FR-023, FR-031.
- [X] T032 [US3] Wire media into `apps/web/src/payload.config.ts`: add `Media` to `collections` and add the **new** `plugins` array populated from `lib/media-storage.ts` (the config currently has no `plugins` key).
- [X] T033 [US3] Generate and register the media migration: `pnpm --filter web migrate:create` (name it `media_uploads`), add it as the fourth entry in `apps/web/src/migrations/index.ts`, and apply it locally. A second additive migration is deliberate — it keeps US3 an independently deliverable slice rather than forcing the media schema into Phase 2. Satisfies FR-038.
- [X] T034 [US3] Create the highlighter module `apps/web/src/lib/learning-code.ts` — a **module-scope** `createHighlighterCoreSync({ themes: [createCssVariablesTheme({ fontStyle: true })], langs: [...7 grammars from `@shikijs/langs/<id>`], engine: createJavaScriptRegexEngine() })` singleton, exposing `highlight(code, lang)` that returns tokens. Keep the **default** `variablePrefix` — setting `'--shiki-token-'` yields the doubled `--shiki-token-token-keyword` (verified). Implements contracts/learning-editor.md §B3, B3.1–B3.5.
- [X] T035 [US3] Add the FR-028 fallback guard to `apps/web/src/lib/learning-code.ts`: an **unloaded language throws `ShikiError`** (verified — it does not degrade silently), so check membership of the loaded language set before calling and return plain unstyled tokens otherwise. `plaintext` is a shiki special language (`isPlainLang` → true) and passes through without a grammar. Implements B3.6, FR-028. Depends on T034.
- [X] T036 [P] [US3] Add `apps/web/tests/unit/learning-code.test.ts` — a known language tokenises; an unknown/unloaded language returns the plain fallback **without throwing**; `plaintext` passes through; every emitted colour is a `var(--shiki-…)` reference and **no hex value** appears (the mechanical FR-034 guarantee); a `<script>` sample tokenises to inert text. Covers FR-027, FR-028, FR-034. Depends on T035.
- [X] T037 [US3] Swap `body` in `apps/web/src/collections/LearningPage.ts` to a **field-level** `lexicalEditor({ features })` — paragraph, `HeadingFeature` (h2/h3/h4 only, never h1), bold/italic/inline-code, both list types, link, blockquote, horizontal rule, `UploadFeature({ collections: { media: { fields: [decorative checkbox] } } })`, and `BlocksFeature({ blocks: [CodeBlock({ languages: LEARNING_CODE_LANGUAGES })] })`. Field-level, **not** the global `editor:` — changing that would alter the News editor as a side effect. Implements contracts/learning-editor.md §A, FR-019, FR-020, FR-026. Depends on T031.
- [X] T038 [P] [US3] Create `apps/web/src/components/LearningImage.tsx` — the `upload` converter: `<figure class="lp-figure">` with the `content` size, intrinsic `width`/`height` to prevent layout shift, `alt=''` when the node is `decorative` else the media `alt`, and **nothing rendered** when the media document is missing. Implements §B1 (B1.1–B1.5), FR-021, FR-023.
- [X] T039 [P] [US3] Create `apps/web/src/components/LearningCodeBlock.tsx` — the `blocks.Code` converter: `<pre><code>` with tokens rendered as **React elements** (`style={{ color: token.color }}`), never `dangerouslySetInnerHTML`; the Norwegian language label; and `CopyButton` copying the raw `code` field text. Implements §B2 (B2.1–B2.8), FR-026, FR-027, FR-029, FR-030.
- [X] T040 [US3] Create `apps/web/src/components/LearningBody.tsx` wiring `<RichText converters={({ defaultConverters }) => ({ ...defaultConverters, upload: …, blocks: { Code: … } })} />`, and use it from `[slug]/page.tsx`. Implements §B. Depends on T038, T039.
- [X] T041 [US3] Change `apps/web/src/components/CopyButton.tsx` to Norwegian — it currently hardcodes `'Copy'` as the default label and `'Copied'` as the confirmation. Default label → `'Kopier'`, confirmation → `'Kopiert'`. Check the two existing call sites still read correctly. Covers FR-036, SC-005.
- [X] T042 [US3] Extend the `014 /laering` section of `apps/web/src/styles/portal.css` with the code block, the image figure, and the `--shiki-token-*` alias block — **aliases of existing theme tokens only**, the 012 pattern at `portal.css:194`. Alias the Designsystemet **text-role** tokens (not `base` fills, which are not contrast-safe as small text), and give **every** variable the theme emits a value — an unset one falls back to the browser default instead of inheriting. Four roles: keyword = accent, string/constant = second hue, comment = subtle + italic, everything else = plain ink. Code overflow contained by `overflow-x: auto` on the `<pre>` wrapper. Implements §C, B2.7, FR-034, FR-035.
- [X] T043 [US3] Add `apps/web/tests/integration/media-upload.test.ts` — an accepted mime type stores; SVG and an oversized file are refused; `alt` is required; a Reader cannot upload. Covers FR-021, FR-022, FR-031. Depends on T031, T033.

**Checkpoint**: the library carries images and code samples.

---

## Phase 6: User Story 4 — Publication visibility is controlled and safe (Priority: P4)

**Goal**: prove the invariant the other three stories assume. The access rules were written with each
collection; this phase is where they are *verified* across every role and path.

**Independent test**: exercise reads and writes as each role against all four collections, employee
pages, draft addresses, and the REST/GraphQL paths.

- [X] T044 [US4] Add `apps/web/tests/integration/learning-access.test.ts` — for all four collections: a Reader is refused create/update/delete; Contributor, Reviewer, Approver and Admin are allowed; a draft page is **not** returned to a non-editor through the data interfaces; an unknown/draft slug 404s on the employee route; and an image stays available to editors after its page is unpublished. Modelled on `apps/web/tests/integration/news-access.test.ts`. Covers FR-031, FR-032, FR-033, SC-003. Depends on T006, T031.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T045 Full suite green: `set -a; source apps/web/.env; set +a && pnpm --filter web test` — expect **212 + 9 new files** and zero regressions against the T001 floor. Covers SC-012.
- [X] T046 `pnpm --filter web lint` clean.
- [X] T047 **Build verified, with a pre-existing environmental caveat.** `pnpm --filter web build` compiles, type-checks and generates all routes — `/laering` and `/laering/[slug]` both appear in the route manifest — and the shiki question T047 exists for is answered: **no `.wasm` is traced into the output** (only Next's own `@vercel/og` yoga/resvg, pre-existing), shiki core is traced, and the 7 grammars are inlined into the server chunk rather than the whole `@shikijs/langs` package. `oniguruma-to-es`/`oniguruma-parser` are present because that is how the **JavaScript** engine translates Oniguruma regexes — no WASM binary. **Three environmental blockers had to be worked around, none caused by 014**: (a) `next/font` cannot fetch Inter / Source Serif 4 in this environment — the pre-014 commit `196380d` fails identically in a clean worktree, proving it pre-existing; (b) the app's own guard rejects `AUTH_MODE=mock` under `NODE_ENV=production`; (c) `prodMigrations` hits the interactive "you've run Payload in dev mode… data loss will occur" prompt when the build's Payload init runs against the **push-mode dev database** (this also stalls `/`, not just `/laering`). Building against a freshly migrated scratch database with production-shaped auth placeholders completes cleanly. The build **caught two real type errors that the suite and lint both missed** — see T039/T029.
- [~] T048 [P] **Partly automated; one human pass remains.** Verified from the server-rendered HTML: 3 native `<details>` with exactly **1** carrying `open` (the current page's category — FR-004 emitted server-side), 5 plain `<a>` nav links, **0** `onclick` handlers anywhere, and the phone disclosure present in markup. `checkVisibility()` also confirmed the collapsed nav is genuinely hidden on mobile and visible after clicking the summary. **Remaining for a human**: actually toggling JavaScript off in a browser and clicking through, per quickstart.md §4.3.
- [X] T049 [P] **Automated by measurement instead of eyeballing.** At 1280 and 375 px: `document.documentElement.scrollWidth === window.innerWidth` (no horizontal scroll), grid collapses from `270px 640px` to a single `311px` column, the sidebar precedes the content, and the disclosure summary becomes visible. The wide code block measures `scrollWidth 1445` inside `clientWidth 638` with `overflow-x: auto` — i.e. it scrolls **inside its own block** while the page does not, which is exactly what the `min-width: 0` grid child buys. Per quickstart.md §4.4.
- [X] T050 [P] **Automated: 12/12 combinations pass AA.** Computed real contrast ratios from the resolved colours in the browser — body 16.18, "Sist oppdatert" 6.26, eyebrow 6.26, nav default 6.26, nav current 12.74, code language label 5.65, and the code roles: foreground 14.59, keyword 12.72, string 12.64, comment 5.65, punctuation 14.59, constant 12.64. Lowest is 5.65 against a 4.5 threshold. This vindicates aliasing Designsystemet's **text-role** tokens rather than the `base` fills (research §4.2) — no adjustment needed. Per quickstart.md §4.8.
- [X] T051 [P] Manual: **inertness and refusals** (SC-008) — the `<script>`/`${…}` samples render as visible text, an out-of-map language degrades to plain, copy yields the exact source text. Per quickstart.md §4.5.
- [X] T052 Update `CLAUDE.md`'s SPECKIT block to mark 014 DONE with the final suite count, and add the release note from quickstart.md §6.1 (editors must add the "KI Læring" nav entry in environments whose `site-chrome` was already saved) plus §6.2 (deployed environments run `MEDIA_STORAGE_MODE=disk` until the platform team provisions the blob container, so images there are ephemeral).

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
   └─> Phase 2 (Foundational) ──> Phase 3 (US1, MVP)
                              ├─> Phase 4 (US2)   ┐
                              ├─> Phase 5 (US3)   ├─> Phase 7 (Polish)
                              └─> Phase 6 (US4)   ┘
```

Phase 2 blocks everything. US1 is the MVP. US2, US3 and US4 each build on Phase 2 and are
independent of one another — US4's tests do touch the media collection (T031), so run it after US3
or drop the media assertions to run it earlier.

### Task-Level Dependencies

| Task | Depends on | Why |
|---|---|---|
| T006 | T004, T005 | the page's relationships need both grouping collections to exist |
| T008, T009 | T004–T007 | the migration is generated from the registered schema |
| T011 | T006 | the read layer queries `learning-pages` |
| T012, T013 | T010 | tests for the pure module |
| T014–T017 | T010, T011 | routes consume the tree and the read layer |
| T020 | T011 | integration test of the read layer |
| T027 | T021 | tests the slug hook |
| T028 | T023, T025, T026 | tests validation and both delete guards |
| T030 | T029 | tests the storage selector |
| T032, T033 | T031 | media must exist before wiring and migrating it |
| T035 | T034 | the guard wraps the singleton |
| T036 | T035 | tests the guard |
| T037 | T031 | `UploadFeature` names the `media` collection |
| T040 | T038, T039 | wires both converters |
| T043 | T031, T033 | needs the collection and its table |
| T044 | T006, T031 | asserts across all four collections |
| T045–T047 | everything | the completion gate |

### Parallel Opportunities

- **Phase 2**: T004 and T005 together (different files); T010 alongside them; then T012 and T013
  together.
- **Phase 3**: T016 and T017 (different route files); T019 anytime.
- **Phase 4**: T025 and T026 together (different collections); T027 alongside them.
- **Phase 5**: T030 early; T038 and T039 together (different components); T036 once T035 lands.
- **Phase 7**: T048–T051 are four independent manual passes.

Nothing in the same file is marked `[P]` — T021–T024 all edit `LearningPage.ts` and are strictly
sequential, as are T018 and T042 in `portal.css`.

---

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + Phase 3 (US1)**: a working, navigable, prose-only learning library at
`/laering`, correct on drafts, ordering, accessibility and responsiveness. Genuinely shippable —
editors can author with Payload's default rich text editor while US3 is built.

**Then, in value order**:

1. **US2** — makes the library sustainable without a developer. Small tasks, no new machinery.
2. **US3** — the biggest slice and the only one with new dependencies. Land T029/T030 (the storage
   selector) early: it is the piece with an external blocker, and getting it wrong is silent.
3. **US4** — mostly a test file, because the access rules were written alongside each collection.
   Keep it as its own phase so the invariant is explicitly proven rather than assumed.

**Two things to get right the first time**, both cheap now and expensive later:

- `min-width: 0` on the content grid child (T018). Without it, one wide code sample makes the whole
  page scroll sideways and the cause is not obvious from the symptom.
- Aliasing **text-role** rather than `base` colour tokens (T042). `base` fills look fine at a glance
  and quietly fail AA as small code text, which T050 would then bounce back.

**Test count**: 9 new files — 5 unit (`learning-view`, `learning-date`, `learning-slug`,
`learning-code`, `media-storage`) and 4 integration (`learning-tree-reads`, `learning-hierarchy`,
`media-upload`, `learning-access`). Research §15 listed 8; `media-storage.test.ts` is the ninth,
added because T029's env-selected behaviour has a unit seam worth using (it is in plan.md's file
tree).
