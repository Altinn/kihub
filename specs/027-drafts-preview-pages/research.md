# Research: Editorial Drafts with Preview, and CMS-Managed Pages (027)

All decisions below were checked against the installed **Payload 3.92.1** / **Next 16.4.1** on `main`
(`node_modules/payload/dist/versions/types.d.ts`, `config/sanitize.js`, `versions/schedule/job.js`,
`@payloadcms/ui/dist/utilities/schedulePublishHandler.js`). No open NEEDS CLARIFICATION remain.

---

## R1 — Payload's built-in drafts replace the hand-rolled `status` select

**Decision**: News, Learning pages, Projects, Events and the new Pages get

```ts
versions: {
  maxPerDoc: 50,
  drafts: {
    autosave: { interval: 2000 },
    schedulePublish: { timeFormat: 'HH:mm', timeIntervals: 15 },
  },
},
```

and the custom `status` field is **removed**. Payload adds its own `_status` (`draft` | `published`),
the *Lagre utkast / Publiser / Avpubliser* actions, version history with compare + restore, and the
schedule drawer.

**Storage semantics that the rest of the plan relies on** (Payload drafts model):
- The **main table** (`news`, `projects`, …) holds the **published** version of a published document.
  Saving a draft of a published document writes ONLY to the versions table (`_news_v`, …) as the
  `latest` version — the main row, and therefore every non-draft read, is unchanged (US2, FR-001).
- A document that has **never** been published lives in the main table with `_status = 'draft'`.
  So non-draft reads MUST still filter `_status = published` (R3).
- *Unpublish* sets the main row's `_status` to `draft`.
- `find({ draft: true })` reads the `latest` row from the versions table (the newest draft if any).

**Rationale**: FR-001/002/005/006/007/008 are exactly Payload's drafts feature. Building them on the
custom field would mean re-implementing a versions table, compare UI and a scheduler.

**Alternatives considered**:
- *Keep `status`, add a `previewToken`*: gives preview of never-published items only; editing a live
  item still goes live on save (fails US2), no history.
- *Keep `status` alongside `_status`*: two sources of truth that can disagree; rejected.

`drafts.validate` stays `false` (default): required fields are enforced on **publish**, not on every
draft/autosave, so a half-written draft can be saved. Payload consequently makes `required` columns
nullable in the DB for draft-enabled collections; the generated migration will include those
`DROP NOT NULL`s — expected, not a regression.

`maxPerDoc: 50`: bounded history (spec Assumptions); autosave **updates** the single latest autosave
version rather than appending one per tick, so 50 covers many editing sessions.

## R2 — Migration of existing content

**Decision**: ONE migration, generated with `pnpm --filter web migrate:create drafts_pages`, then
hand-edited in `up()` so the order is:

1. (generated) create `_status` columns/enums on `news`, `learning_pages`, `projects`, `events`; create
   the version tables (`_news_v`, `_news_v_texts` for `tags`, `_learning_pages_v`, `_projects_v`,
   `_events_v`, …); create `pages` + `_pages_v`; create `payload_jobs` (R8); relax NOT NULLs (R1).
2. (hand-written) `UPDATE <table> SET _status = status` for each of the four tables. This copies
   visibility exactly (FR-004, SC-003). Payload names the `_status` enum `enum_<table>_status`, which
   is the SAME type the old `status` column already uses (`enum_news_status` etc., values
   `draft`/`published`, per the existing migrations). So the type is shared and no cast is needed.
   The generated SQL must not drop that type in step 4.
3. (hand-written) seed **one version row per existing document** with `latest = true`, copying the
   main row (and child rows such as `news_texts` → `_news_v_texts`, `news_rels` → `_news_v_rels` where
   present). Without this, `find({ draft: true })` (preview, the admin's version tab) does not see
   pre-existing documents, because draft reads go to the versions table.
4. (generated, moved last) drop the old `status` columns, keeping the shared `enum_*_status` types.

`down()` restores `status` from `_status` before dropping the new structures, and gets the usual
`IF EXISTS` hand-patch on constraint/index drops (the 014/015/016 generator bug: CASCADE table drops
followed by named FK drops abort the transaction).

**Rationale**: Pure SQL keeps the migration deterministic inside Payload's transaction and runs at
container boot via `prodMigrations` (no CLI in the image). Step 3 is the non-obvious one: verify it
in the integration suite by previewing a document created *before* the migration (quickstart §3).

**Alternatives considered**:
- *Seed versions through the Payload local API inside the migration* (`payload.update` per doc):
  simpler to write, but runs every hook (News `publishDate` stamping, slug derivation, Learning's
  subcategory check) against historical data and depends on the full config at migration time —
  migrations must stay valid as the config evolves. Rejected.
- *Lazy backfill on first edit*: leaves preview broken for untouched old content. Rejected.

**Gotchas carried forward**:
- Push-mode dev DB: dropping `status` makes Payload's schema push prompt "data loss" and hangs every
  integration test (017 gotcha). Apply the migration's `up` to the local `kihub` DB (or a per-branch
  clone `kihub_027`) before running the suite.
- The migration's `.json` snapshot must include all earlier migrations' schema (020 gotcha) —
  generate it on a branch rebased on current `main`.
- Verify `up`→`down`→`up` on a scratch DB `kihub_migtest_027` with real-shaped data (published, draft,
  news with tags + hero image, learning page with subcategory).

## R3 — Read layers: published-only by default, drafts only in preview

**Decision**:
- `lib/payload-queries.ts`: `PUBLISHED = { _status: { equals: 'published' } }`. `lib/news.ts`,
  `lib/learning.ts` and `lib/events.ts` currently define their own copies — they switch to the shared
  constant, so there is one place to change.
- Every list/listing function is unchanged in shape and **never** reads drafts — not even in preview
  (frontpage, `/news`, `/prosjekter`, `/events` list + calendar, KI Læring sidebar tree, `.ics`).
- Each *by-slug* function gains an options arg: `getNewsBySlug(slug, { preview })`. When `preview` is
  true it calls `find({ draft: true, where: { slug } })` **without** the `_status` filter; otherwise
  the current published query. `preview` comes only from `getPreviewState()` (R5), never from a
  query-string.
- A pending draft that renames a published item's slug: the reader keeps getting the published row at
  the old slug (main table); preview finds the draft at the new slug (versions table) — US2 #4.

**Rationale**: Keeps FR-017 trivially true — drafts can only ever appear on the one page being
previewed. Previewing a *list* with a new draft in it was considered and dropped: it multiplies
draft-aware code paths (pagination totals, calendar ranges, the learning tree) for little review value.

**KI Læring nuance**: when previewing a never-published learning page, the sidebar tree (published
pages only) will not contain it; `buildLearningTree` already tolerates a current slug that is not in
the tree. Acceptable for review; noted in the contract.

## R4 — Preview entry point: `admin.preview` → `/api/preview`

**Decision**: each draft-enabled collection sets

```ts
admin: { preview: (doc) => (doc?.slug ? `/api/preview?path=${encodeURIComponent(<public path>)}` : null) }
```

Payload shows the **Forhåndsvis** button whenever this returns a URL. `<public path>` is
`/news/<slug>`, `/laering/<slug>`, `/prosjekter/<slug>`, `/events/<slug>`, `/<slug>` (pages), built by
one pure helper `previewPathFor(collection, slug)` in `lib/preview-paths.ts` (unit-tested).

`GET /api/preview` (route handler `src/app/api/preview/route.ts`):
1. `auth()` — no session → redirect `/signin` (same as the app shell).
2. **Fresh role lookup**: read the `users` row by `session.user.id` (`depth: 0`). The JWT carries the
   role from sign-in time and can be stale; the gate must reflect a role removed since (spec edge case).
3. Not an editor → redirect to `path` **without** enabling preview (→ the normal 404 for a draft;
   nothing reveals it exists, FR-013).
4. Validate `path`: must start with `/`, not `//`, no scheme/backslash, max length — else 400. Prevents
   an open redirect through a crafted link.
5. `(await draftMode()).enable()`, then re-issue the `__prerender_bypass` cookie with
   `maxAge: 3600`, `httpOnly`, `secure`, `sameSite: 'lax'` — Next's own cookie is session-scoped; this
   gives the automatic expiry FR-016 asks for.
6. Redirect (303) to `path`.

`GET /api/preview/exit`: `draftMode().disable()`, redirect to the same-origin `Referer` path (else `/`).

**Rationale**: FR-014 — access is the visitor's own Entra session + role; no shared secret appears in
any link. Every employee is already signed in, so a secret would add nothing but a leak vector.
`/api/preview` doesn't collide with the existing `/api/auth` and `/api/discovery`.

**Alternatives considered**: Payload website-template's `PREVIEW_SECRET` query param (rejected per
FR-014); rendering drafts inside `/cms` (rejected — the point is the real page with the real chrome).

## R5 — `getPreviewState()` is the single source of truth per request

**Decision**: `lib/preview.ts` exports `getPreviewState = cache(async () => …)` (React `cache`, one
evaluation per request) returning `{ active: boolean }`:
`active = (await draftMode()).isEnabled && isEditor(freshUser)`, where `freshUser` is the same fresh
`users` lookup as R4. A reader holding a stray/forwarded bypass cookie therefore gets `active: false`
on every page (FR-013, edge case "losing a CMS role").

Detail routes call `getPreviewState()` and pass `{ preview: active }` to the read layer; the layout
uses it to render the banner (R6).

## R6 — Preview banner

**Decision**: a server component `PreviewBanner` rendered at the top of `(app)/layout.tsx` when
`getPreviewState().active`. Designsystemet `Alert` (`data-color="warning"`) — a presentational leaf,
allowed from a Server Component — with Norwegian copy: «Forhåndsvisning – du kan se upublisert
innhold. Andre ansatte ser bare publiserte versjoner.» and a link «Avslutt forhåndsvisning» to
`/api/preview/exit`. The layout does not know the current path (there is no middleware to pass it), so
the exit handler redirects to the `Referer` path when it is same-origin, else `/`.

Zero new client components (the 014/017 posture).

## R7 — Caching: nothing to bypass

Every `(app)` route is already dynamic: the layout calls `auth()` (cookies), there are no `revalidate`
/ `dynamic` / `unstable_cache` / `'use cache'` / `generateStaticParams` uses (grepped), and
`draftMode()` itself opts a request out of static rendering. So a previewed render can never be
cached and served to a reader (FR-017). A regression test asserts the grep stays empty for the
draft-aware routes.

## R8 — Scheduled publishing on a scale-to-zero container

**Facts**: enabling `schedulePublish` makes Payload register a `schedulePublish` task and the
`payload-jobs` collection; the admin's schedule drawer queues a job on the **`default`** queue with
`waitUntil` = the chosen time (`schedulePublishHandler.js`). Something must *run* the queue. `kihub-web`
is a Container App scaled **0–1** (`documentation/infrastructure.md`).

**Decision**:
1. `jobs.autoRun: [{ cron: '* * * * *', queue: 'default', limit: 20 }]` with
   `shouldAutoRun: () => process.env.NODE_ENV === 'production' || process.env.PAYLOAD_JOBS_AUTORUN === 'true'`
   — runs every minute while the replica is up; off in vitest/dev unless opted in.
2. In `src/instrumentation.ts`, right after the boot-time `getPayload()`, run
   `payload.jobs.run({ queue: 'default', limit: 50 })` once — a replica waking from zero catches up on
   overdue publications immediately.
3. `jobs.access` (`queue`, `run`, `cancel`) → `isEditor`; the `payload-jobs` collection is hidden in the
   admin and its read access is restricted to editors via `jobsCollectionOverrides`, so readers cannot
   enumerate scheduled jobs (they contain document ids + titles).

**Behaviour this yields**: while the app is scaled to zero nobody can see the site anyway; the first
request wakes the replica, the boot run publishes anything overdue. The very first request of a cold
start may race the boot run by a second or two. SC-007 ("visible within 5 minutes") holds whenever the
replica is up; if the team wants exact-time publication with no visitors (e.g. for a Teams link-preview
at 08:00), pin `--min-replicas 1` (~€20/mo, already documented) — an ops decision, not a code change.

**Alternatives considered**: a GitHub Actions cron calling `/payload-api/payload-jobs/run` (GitHub
cron routinely lags 5–15 min and would need a machine credential); an Azure Container Apps Job (new
infra + identity for one feature, YAGNI).

## R9 — News `publishDate` and other status-dependent logic

- `News.beforeChange`: `if (data._status === 'published' && !data.publishDate)` — covers manual publish
  AND the scheduled job (it calls `payload.update({ _status: 'published' })`, which runs hooks). Draft
  and autosave saves don't stamp (FR-009).
- `admin.defaultColumns`: `'status'` → `'_status'` in all four collections.
- `Event` and `News` comments/docs that mention `status: published` are updated; the read-layer
  docblocks keep their "published by construction" contract.
- `frontpage-select.ts`, `events-view.ts`, components: grep showed no direct `status` use outside the
  read layers; the type change in `payload-types.ts` (`status` → `_status?`) will surface any miss at
  `tsc --noEmit`.

## R10 — Access control incl. versions

Each draft-enabled collection:

```ts
access: {
  read: ({ req }) => (isEditor(req.user) ? true : { _status: { equals: 'published' } }),
  readVersions: ({ req }) => isEditor(req.user),   // NEW — versions hold draft content
  create/update/delete: isEditor,
}
```

`readVersions` is the critical addition: without it, `/payload-api/news/versions` would serve draft
bodies to any signed-in employee via the Payload API (FR-003). `LearningPage.ts` and `News.ts` still
carry private `isEditor` copies — they switch to `lib/access.ts`'s shared one.

Publishing rights unchanged (spec FR-010): any contributor+ can publish/unpublish/schedule.

## R11 — Pages collection

**Decision**: `src/collections/Page.ts`, slug `pages`, labels *Side / Sider*, admin group none,
`useAsTitle: 'title'`, `defaultColumns: ['title', 'slug', '_status', 'updatedAt']`.

Fields: `title` (required, non-blank validate — Project precedent), `slug` (unique, indexed, derived
from title via `slugify`, validated by `validatePageSlug`, R12), `summary` (textarea), `body` (richText,
required, the shared article editor), `author` (sidebar, defaulted on create — LearningPage precedent).
Same `versions` / `access` / `admin.preview` as R1/R4/R10.

**Shared editor**: the LearningPage body's `lexicalEditor({ features })` moves verbatim to
`lib/article-editor.ts` (`articleEditor`), imported by both `LearningPage.ts` and `Page.ts`; the
renderer `LearningBody` is reused as-is for pages (it only depends on the node shapes). The `youtube`
block keeps `interfaceName: 'LearningYouTubeBlock'`; sharing the *same* block object in two fields is
Payload's supported way to share a block type. **Verify** `payload generate:types` emits one
interface (no duplicate-name error); fallback: move the two blocks to config-level `blocks` and use
`blockReferences`.

**Rejected**: Payload website template's layout-block builder (hero/CTA/content blocks) — YAGNI and
would need new presentational components; `@payloadcms/plugin-nested-docs` (spec FR-024: flat);
`@payloadcms/plugin-seo` (employee-only site behind sign-in; `<title>` from the page title is enough).

## R12 — Page addresses: one segment, reserved list, route precedence

**Route**: `src/app/(app)/[slug]/page.tsx` — a single dynamic segment at the `(app)` root (flat pages ⇒
not `[...slug]`). Next's App Router matches static segments before dynamic ones, so `/news`,
`/laering`, … always win (FR-021); files in `public/` (`/brand/...`) are served before routing. Two-
segment unknown paths still 404. `generateMetadata` → `"<title> · KI Hub"`.

**Validation** `lib/page-slug.ts`:
- `PAGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/` (what `slugify` produces; no `/`, so one segment).
- `RESERVED_PAGE_SLUGS`: every top-level route segment of the app and system paths — `api`, `artifacts`,
  `bidra`, `brand`, `cms`, `events`, `laering`, `news`, `payload-api`, `prosjekter`, `registry`,
  `signin`, plus `_next`, `favicon.ico`, `robots.txt`, `sitemap.xml`, `preview` (defensive).
- `validatePageSlug(value)` normalises (trim, lowercase, strip leading/trailing `/`) **before** checking
  the reserved list, then the pattern; returns a Norwegian message
  («Adressen «news» er reservert av KI Hub. Velg en annen.»).
- The `beforeValidate` slug derivation runs first, so a title like "News" yields `news` and is
  rejected with the same message.

**Drift guard**: a unit test reads the directory names under `src/app/(app)`, `src/app/(auth)`,
`src/app/(payload)`, `src/app/api` and `public/` and asserts each top-level static segment is in
`RESERVED_PAGE_SLUGS` — a future route cannot silently shadow (or be shadowed by) a page. If a new
built-in route lands on an existing page's slug, the route wins (FR-021) and the test fails until the
list is updated, flagging the conflict.

## R13 — Events in scope; Learning categories and globals are not

- **Events**: same R1/R4/R10 treatment; `.ics` route uses the published by-slug read (no preview —
  a calendar file is not something you review).
- **Learning categories / subcategories**: structural metadata with no body; no drafts.
- **Globals (`site-chrome`, `frontpage`)**: Payload supports drafts on globals, but nav/frontpage edits
  are rare and small; out of scope (spec doesn't ask). Recorded as a possible follow-up.

## R14 — Live preview deferred

Payload's `admin.livePreview` needs a client component listening to `postMessage` (or
`RefreshRouteOnSave`) on every previewable page. The site deliberately keeps client components to a
minimum, and the *Forhåndsvis* button covers the review need (spec Assumptions). Revisit later: the
`/api/preview` route and `getPreviewState()` are exactly the server half live preview would reuse.

## R15 — Constitution amendment v3.2.0 → v3.3.0 (MINOR)

Adds **Pages** as a sixth Product Module (native Payload content, editor-authored standalone
information pages, not artifacts). Same scoping-sentence edits as the 3.2.0 Projects amendment:
Principle I, II.2, III, VIII (both bullets), Product Modules, Data ownership, Testing gate. Also records
that native content uses Payload drafts/versions (a clarification under Principle II, not a new rule).
