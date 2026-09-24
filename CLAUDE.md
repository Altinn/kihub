<!-- SPECKIT START -->
Active feature: **020-news-hero-media** (DONE — specify + plan + tasks + analyze + implement
complete 2026-09-23; tasks 31/31; suite **382/382 across 47 files**, lint clean, `tsc --noEmit`
clean, `next build` green against the migrated scratch DB with `AUTH_MODE=entra`). Fixes awkward
cropping of news hero images on the frontpage «Siste nytt» and `/news` cards. News gets a managed
hero image: a new optional `heroImage` upload field (relationTo `media`, FK ON DELETE SET NULL),
with the old `heroImageUrl` text field KEPT as a legacy fallback. Precedence is upload > legacy >
placeholder, and URLs are not migrated. Payload's built-in `focalPoint` + `crop` are turned on for
`media`, and two sizes are added: `card` 800x500 and `card2x` 1600x1000, both
`withoutEnlargement: true`. That setting MUST be explicit: left undefined, an original short on ONE
axis is UPSCALED by Payload's `resizeWithFocalPoint`. `Media` is now ungrouped (shared by news +
KI Læring). Pure helpers `resolveHeroSource` / `pickCardImage` / `pickArticleImage` live in
`lib/news-view.ts`:
- cards use a card srcset only when that size is exactly 16:10, otherwise a reading-width
  fallback, and ALWAYS set `object-position: focalX% focalY%` (`??` so 0 is honoured);
- srcset candidates are deduped by width, because a small original is stored as the SAME file
  for several sizes;
- the article page uses `content`/`content2x` with `sizes="(max-width: 1200px) 100vw, 1200px"`
  (the article column is full content width since #148) and is never cropped;
- media URLs get `?v=updatedAt`, because re-framing overwrites same-named files.
One additive migration, `20260924_080748_news_hero_media`. `focal_x`/`focal_y` ALREADY existed
from 014's media migration, because Payload creates them even while disabled. New optional env
**`MEDIA_PUBLIC_HOSTNAME`** (azure mode only) feeds `resolveMediaSelfFetchAllowList` →
`Media.upload.skipSafeFetch`, scoped to that host + `/payload-api/media/file/*`. Payload's API route
is `/payload-api`, NOT `/api`. The allow-list is needed because re-framing an ALREADY-SAVED image
makes Payload re-fetch the original over our public origin. It is SET on `kihub-web` (2026-09-24, revision `--0000020`) to
`kihub-web.happypond-fe66d7a5.norwayeast.azurecontainerapps.io`. After 020 deploys, run quickstart §6. Gotchas:
- a partial API update that only sets `focalX`/`focalY` stores the numbers but does NOT regenerate
  files. Payload needs `uploadEdits` + the full doc (`filename`, `url`) in the body, which is what
  the admin sends;
- `sharp().extract().stats()` measures the whole INPUT image, so use `.toBuffer()` first in tests;
- push-mode hangs every integration test when the local DB holds schema another branch lacks. While
  019 was unmerged, the shared `kihub` DB had its footer table, so 020 work ran on per-branch
  clones (`kihub_020`, then `kihub_020b` after the rebase) instead of touching the shared DB.
Rebased onto #151 (019) on 2026-09-24 and the migration REGENERATED, because a migration's `.json`
snapshot must include every earlier migration's schema, or the next `migrate:create` re-creates
that schema. The 48px portal overflow found while verifying this is fixed separately in #153. For
details read `specs/020-news-hero-media/plan.md` (with `research.md` R1–R11, `data-model.md`,
`contracts/` x2, `quickstart.md`, and `tasks.md` Notes for the implementation record).
Constitution Check: PASS, no violations, no amendment.
Prior: **017-fix-subscriptions-banner** (DONE — specify + plan + tasks + implement
complete 2026-09-15, PLUS a post-implementation revision the same day after direct user review;
tasks 19/19 + 4 revision tasks T020–T023; suite **360/360 across 46 files**, lint clean,
`tsc --noEmit` clean; prod build TypeScript-compiles clean, blocked only on the pre-existing
`AUTH_MODE=mock` production gate, unrelated to this feature). Fixes Altinn/kihub#144 — the
frontpage "Støttede KI-abonnementer i Digdir" banner rendered "GitHub Copilot"/"Claude Teams" as
bordered `<span>`s styled like buttons that did nothing on click (false affordance), with no path
to request-access instructions. **Shipped design** (after the revision — see research.md R5 for
the superseded first pass): a dark **`.kihub-card--inverted`** card (new card variant, reusing the
pre-existing `--kihub-surface-inverted`/`--kihub-text-inverted` tokens) with two fully pill-shaped
chip buttons ("GitHub Copilot"/"Claude Teams") and a rectangular icon-led CTA
("ⓘ Hvordan bestille tilgang?") below them, matching the issue's own attached inspiration image.
Clicking any of the three opens a real **Designsystemet `Dialog`** (`@digdir/designsystemet-react`)
with the explanation/instructions — chosen because the constitution names Designsystemet as the
default for "dialogs," and because the user explicitly asked for a modal instead of a
layout-shifting dropdown. Trigger buttons are plain kihub-styled `<button>`s, NOT Designsystemet's
`Button` — the dark/pill look can't be expressed without restyling that primitive, which the
constitution prohibits — opened via the native declarative `command="show-modal"`/`commandfor`
HTML Invoker Commands attributes (typed via a new `apps/web/src/types/dom-invoker-commands.d.ts`
declaration-merge, since `@types/react` 19.2 doesn't type them yet on plain elements). This keeps
the site's client-component count at the three it had before (`SearchBar`/`CopyButton`/`SiteNav`)
for OUR OWN code — Designsystemet's `Dialog`/`Button` are themselves `'use client'`, but a Server
Component can render them as leaves without becoming one itself. Two RSC-specific bugs hit and
fixed along the way, both worth remembering for any future Designsystemet-`Dialog` usage: (1)
`<Dialog.Block>` (property access on the imported `Dialog`) renders as `undefined` at server-render
time because `Dialog` is a Client Component and its server-side "client reference" placeholder
doesn't support static sub-property access the way the callable itself works — fix: import
`DialogBlock` as its own named export instead; (2) a `<Dialog>` nested INSIDE
`.kihub-card--inverted` renders fully invisible (white-on-white) text, because a native `<dialog>`
stays in its original DOM position for CSS inheritance purposes even though it *paints* in the
browser's top layer — fix: render all `<Dialog>`s as siblings of the card, not children.
`Chip.href` (dead — never set by defaults, unused once chips stopped navigating) was REMOVED from
the schema, not just left inert; `Chip.description` and a new
`subscriptions.requestAccess: {label, body}` group were added to the `frontpage` global
(`apps/web/src/globals/Frontpage.ts`, `lib/site-content-defaults.ts`, `lib/site-content.ts`'s
`mergeFrontpage`) — this content-model part was untouched by the revision. One additive migration
(`20260915_101941_subscriptions_request_access` — two `ADD COLUMN` + one `DROP COLUMN`, no table
drop involved so, unlike 014/015/016, it did NOT hit the CASCADE/named-drop generator bug; still
verified up+down clean on scratch DB `kihub_migtest_017`). Gotcha worth keeping: after editing
`Frontpage.ts`/`site-content-defaults.ts` and regenerating types, the LOCAL push-mode dev DB still
has the OLD schema until something calls `getPayload()` against it — and because this change
included a column DROP (not just additive columns like every prior feature), Payload's push-mode
schema reconciliation blocked on an interactive "data loss" confirmation that a non-interactive
`vitest` run can't answer, hanging every integration test's `beforeAll` for a full 120s timeout
each (a 47-minute red suite). Fix: apply the migration's `up()` SQL directly to the local `kihub`
DB via `psql` before rerunning tests — after that, push-mode sees the schema already matches and
stops prompting. For technologies, structure, and context read the plan:
`specs/017-fix-subscriptions-banner/plan.md` (with `research.md` — R5 is the revision record,
`data-model.md`, `contracts/` ×2, `quickstart.md`; `spec.md` for requirements, updated post-revision
for FR-003/FR-009; `tasks.md` for what shipped, including the T020–T023 revision). Constitution
Check: PASS, no violations, no amendment needed — this extends the existing `subscriptions` group
on the `frontpage` global, not a new Product Module. Trade-off knowingly accepted (updates spec.md
FR-009): unlike this codebase's other disclosures (native `<details>`, JS-independent everywhere),
the HTML Invoker Commands API is zero-JS only in browsers that implement it natively (verified:
Chrome/Chromium 152) — older browsers depend on `@digdir/designsystemet-web`'s polyfill JS. This
was an explicit, informed request (real modal + Designsystemet), not an oversight. Verified live
via browser (mock sign-in, `Ada Employee`, on a FRESH tab to rule out stale console history from
earlier iterations): both chip dialogs and the CTA dialog open with correct heading/body content,
close via the × button, zero console errors/hydration warnings. NOTE: this browser-automation
harness's synthetic Escape-key events did not reliably close the dialog (mouse-driven open/close
via the × button worked every time) — same class of limitation already seen with the first
`<details>` pass's Enter/Space, left unresolved as a suspected tooling/CDP limitation rather than
an app defect, since Escape-closes-`<dialog>` is native, spec-mandated HTML behavior with no JS
involved — a real keyboard press was not independently verified in this session.
Prior: **016-fix-frontpage-banner-links** (DONE — specify + plan + tasks + implement
complete 2026-09-11; tasks 19/19; suite **356/356 across 45 files**, lint clean; prod build
TypeScript-compiles clean, blocked only on the pre-existing `AUTH_MODE=mock` production gate,
unrelated to this feature). Fixes Altinn/kihub#135 — frontpage tiles "Verktøy" and "KI Prosjekter
i BOD" both linked to `/registry`. Adds a fifth native-content module, **Projects**: a flat,
News-shaped collection (`title`/`slug`/`summary`/richText `body`/draft-published `status`/`order`
— no category hierarchy like Learning, no author/tags/hero-image/pagination like News, per Start
Simple/YAGNI), collection `projects` (`apps/web/src/collections/Project.ts`), read layer
`lib/projects.ts`, routes `/prosjekter` (list) + `/prosjekter/[slug]` (detail), one additive
migration (`20260911_101007_projects`, hand-patched `down` with `IF EXISTS` — same generator bug
as `20260810_090312_learning_pages`, verified up+down clean on scratch DB `kihub_migtest_016`).
Frontpage tile default href changed to `/prosjekter` ONLY for "KI Prosjekter i BOD"; "Verktøy"
stays `/registry` unchanged (regression-pinned by `tests/unit/frontpage-defaults.test.ts`). For
technologies, structure, and context read the plan:
`specs/016-fix-frontpage-banner-links/plan.md` (with `research.md`, `data-model.md`, `contracts/`
×2, `quickstart.md`; `spec.md` for requirements; `tasks.md` for what shipped). Constitution Check:
PASS, no violations — constitution bumped to v3.2.0, adding Projects as a fifth Product Module,
the same precedent as Learning's v3.1.0 addition. Verified live via browser: created + published
a project in `/cms`, saw it on `/prosjekter` + its detail page, confirmed a deleted/unknown slug
404s, then deleted the test doc.
Prior: **015-multi-source-agents** (DONE — specify + plan + tasks + analyze + implement
complete 2026-08-12; tasks 38/38 — T038's real-repo pass done against Altinn/team-kitt: PAT
must be ≤366d (Altinn org policy), scan succeeded with a live ownership takeover ('1 overtatt
fra annen kilde') because the repo's agent shares its id with the local demo seed. Suites:
**web 346/346 across 42 files**, packages 63 (schema 17, discovery-core 24, github-client 5,
governance-core 17), lint clean, prod build green vs migrated scratch `kihub_migtest` +
`AUTH_MODE=entra`). For technologies, structure, and context read the plan:
`specs/015-multi-source-agents/plan.md` (with `research.md` R1–R12, `data-model.md`,
`contracts/` ×3, `quickstart.md`; `spec.md` for requirements). Two capabilities: (1)
**source-scoped reconcile** — `artifacts` gains a nullable indexed `discoverySource`
relationship (FK ON DELETE SET NULL; do NOT name it `source`, that's the manifest group);
`reconcile(payload, scanned, {sourceId})` (REQUIRED third param) stamps ownership on every
upsert (ownership-by-last-sighting: null→`adopted`, other→`reassigned`, both new IndexReport
fields + persisted on `discovery-runs`) and deactivates ONLY
`active AND discoverySource=sourceId AND ∉seen` — legacy null-source rows are never deactivated,
no migration backfill (adoption converges on first scan). (2) **`agent` artifact type** —
`ARTIFACT_TYPES`+`'agent'`, `TYPE_DIRS`+`'agents'` (github-client needs ZERO changes, its
TYPE_DIR_SET derives), manifest schema 1.0.0→1.1.0 (regenerate committed JSON schema + docs),
optional sibling `agents/<slug>/agent-card.json` (A2A v1.0) fetched in `scanRepo` ONLY for valid
type=agent manifests, validated TOLERANTLY (new `artifact-schema/src/agent-card.ts`, only `name`
required, unknown keys pass through, 256KB cap), stored verbatim jsonb `artifacts.agentCard`
(cleared to null when card missing/invalid — never blocks registration, errors →
`cardIssues` on the run), rendered by new server-only `AgentCardPanel` between Install and
README. Plus greenfield Norwegian type-label map `lib/registry-view.ts` (NO label map exists
today — UI renders raw enum values; wire CatalogFilters/ArtifactCard/detail/Artifact.ts
options). ONE additive migration (enum ADD VALUE 'agent' is txn-safe on PG≥12 because unused in
same txn; down needs the 014 IF EXISTS hand-patch). No constitution amendment — Principle III
already names "agent definition". Search untouched (type not in tsvector; card search deferred).
Constitution Check: PASS, no violations.
Implementation notes worth keeping: reconcile reads the row's previous owner BEFORE the update
(the update overwrites it — the in-memory test fake returns live references and caught this);
`ReconcileOptions.sourceId: null` is the explicit break-glass mode (upserts leave ownership
untouched, zero deactivation) used by `scripts/index-artifacts.ts`; the type↔dir consistency
check lives in `toRawArtifact` via a `DIR_FOR_TYPE` map (policies→policy means no naive
's'-strip); the generated migration
(`20260812_131624_agents_multisource`) got the usual `IF EXISTS` down hand-patch and its
`ALTER TYPE ADD VALUE 'agent'` runs fine inside Payload's txn on PG16 (value added, never used
in-txn); its `down` recreates the enum WITHOUT 'agent' so it fails by design if agent rows
exist; zod v4 `.loose()` objects preserve unknown card fields; card errors use the
validateManifest `"path: message"` format; two integration tests migrated to the new reconcile
signature (`reconcile.test.ts` got a real source row because it asserts deactivation;
`reindex-preserves.test.ts` uses `sourceId: null`). Local dev DB holds 015 demo data (`digdir.security-review` owned by disabled source
`demo-015`) plus the REAL source `team-kitt` (Altinn/team-kitt@main, tokenEnvVar
GITHUB_TOKEN_AGENTS in apps/web/.env, 90-day fine-grained PAT) which now owns
`digdir.support-copilot` with its card. Field gotchas from the real-repo test worth remembering:
a manifest filename with a TRAILING SPACE ('artifact.yaml ') and files at the wrong depth
(agents/artifact.yaml instead of agents/<slug>/artifact.yaml) are both silently invisible to
discovery — the tree regex simply never matches; also apps/web/.env line 21 emits a harmless
'tenant-id: no such file or directory' when shell-sourced (unquoted value, worth fixing).
Prior: **014-learning-pages** (DONE — specify + plan + tasks + implement complete; suite
**328/328 across 37 files**, lint clean, prod build compiles + typechecks + generates all routes;
`specs/014-learning-pages/plan.md`). It adds **KI Læring** — the constitution's fourth
module (v3.1.0) — as a learning library: editors curate categories → subcategories → pages in
`/cms`, employees read at `/laering` behind a persistent left sidebar tree, kihub-restyled,
Norwegian. **4 new collections** (`learning-categories`, `learning-subcategories`,
`learning-pages`, and `media` — KI Hub's FIRST managed uploads), **an additive migration**, and
**2 new deps**: `shiki@4.4.3` + `@payloadcms/storage-azure@3.85.2` (exact peer pin on Payload
3.85.2). Key decisions, all in research.md: `<RichText>`'s JSX converters are SYNCHRONOUS →
shiki `createHighlighterCoreSync` + JS regex engine (no WASM in `.next/standalone`), module-scope
singleton, rendered as React elements (never `dangerouslySetInnerHTML`); Payload's premade
`CodeBlock` reused with a curated 8-language map whose ids serve both Monaco (admin) and shiki;
syntax colours are `--shiki-token-*` ALIASES of Designsystemet text-role tokens (the 012
event-colour pattern, `portal.css:194`) — the one recorded Design System deviation; the sidebar is
native `<details>` (works with JS off, FR-005) so the feature adds ZERO client components; explicit
`order` field, NOT Payload's `@experimental` `orderable`; flat addresses `/laering/<slug>` so
reorganising never breaks links; tree = 3 queries at `depth: 0` + a pure `buildLearningTree`.
Shipped shape: `lib/learning.ts` (read layer, 3 queries at `depth: 0`) + pure `lib/learning-view.ts`
(`buildLearningTree` / `learningPageHref` / `formatLearningUpdated` / `LEARNING_CODE_LANGUAGES`) +
`lib/learning-code.ts` (sync shiki singleton, `highlightCode` with the REQUIRED unloaded-language
guard) + `lib/media-storage.ts` (`MEDIA_STORAGE_MODE`); components `LearningShell` / `LearningNav` /
`LearningBody` / `LearningCodeBlock` / `LearningImage`; routes `/laering` + `/laering/[slug]`;
`portal.css` section `014 /laering` incl. the `--shiki-token-*` aliases. TWO migrations
(`..._learning_pages`, `..._media_uploads`), both hand-patched with `IF EXISTS` on the constraint /
index drops — the generated `down` drops tables with CASCADE and then drops the same FKs by name,
which aborts the transaction (first new-collection migration since baseline, so it had not surfaced).
`CopyButton` gained a `copiedLabel` prop (was hardcoded English).
Gotchas worth remembering: a Next layout cannot see a CHILD segment's `[slug]`, so the shell is a
COMPONENT not `layout.tsx`; `payload migrate` against the local push-mode DB PROMPTS "data loss will
occur" — verify migrations on a scratch DB instead; `@payloadcms/storage-azure` requires
`baseURL` (non-optional, despite the docs table) so `AZURE_STORAGE_ACCOUNT_BASEURL` is mandatory in
azure mode; `next build` is the ONLY gate that caught two implicit-`any`/type errors (vitest + eslint
both passed), and in this environment it still needs a migrated scratch DB + non-mock AUTH_MODE
(`prodMigrations` prompts against a push-mode DB; the app rejects `AUTH_MODE=mock` in production).
**Fonts are now self-hosted from files** (`apps/web/src/fonts/`, `next/font/local`, latin variable
woff2 + OFL licences) — `next build` no longer needs network at all, verified with the sandbox on.
Google served ONE variable file per family for every requested static weight, so the committed files
are byte-identical to what `next/font/google` was fetching: a build-reliability change, not a visual
one, and `kihub-fonts.css` needed no edit because the CSS variable names are unchanged.
Release notes: (1) editors must add the "KI Læring" nav entry in `/cms` → Site Chrome in any env whose
`site-chrome` global was already saved — `mergeSiteChrome` treats a saved nav as authoritative and no
migration touches editor-owned content; (2) **durable image storage is DONE (2026-08-10)** and never
needed the platform team — the account has Contributor at subscription + RG scope, so a private
`kihub-media` container was created on `stkihubmedia` (`rg-kihub-app`, `norwayeast`) and `kihub-web`
already carries `MEDIA_STORAGE_MODE=azure` + the three settings, connection string as a container-app
secret (revision `--0000002`, Healthy). Verified by write/read/delete round-trip; anonymous blob GET
returns 409, so files are only reachable via Payload's authenticated route. `Microsoft.Storage` had to
be registered on the subscription first — before that even `az storage account check-name` fails with
a misleading `SubscriptionNotFound`. Local dev still defaults to `disk`. Deployment of 014 itself is
still blocked on the TWO remaining identity items (digdir sign-in app registration, deploy-SP role
grant) — `kihub-web` runs a pre-014 image that ignores the new vars.
Prior: **013-news-page-redesign** (DONE — suite 212/212 across 28 files, lint + prod build green),
`specs/013-news-page-redesign/plan.md`. It rebuilt `/news` ("Nyheter") as a kihub-restyled editorial
card grid (16:10 media well + serif headline + nb-NO date + summary, 2-up/1-up, each card ONE link)
with server-rendered `?page=N` pagination (`NEWS_PAGE_SIZE` 12, Norwegian controls, malformed → page
1, out-of-range → clamp) and a restyled article page. Durable facts: one `NewsCard`
(`headingLevel` 2|3) — `FrontpageNewsCard` was DELETED; pure `lib/news-view.ts`
(parseNewsPageParam / buildPagination / formatNewsDate); `lib/news.ts` has
`listPublishedNewsPage()` and NO `featured`-first sort, so `News.featured` is inert for news.
Prior phases: Phase 1 (foundation)
`specs/001-phase1-foundation/`; Phase 2 (catalog) `specs/002-catalog/`; Phase 3 (governance)
`specs/003-governance/`; Phase 4 (automated discovery) `specs/004-automated-discovery/`; Phase 5
(full-text search) `specs/005-fulltext-search/`; Phase 6 (editor back-office)
`specs/006-editor-backoffice/`; Phase 7 (news) `specs/007-news/`; governance-UI reconcile
`specs/008-governance-ui-reconcile/`; Phase 8 (calendar/events) `specs/009-calendar-events/`;
home-page widgets `specs/010-home-widgets/`; frontpage redesign `specs/011-frontpage-redesign/`
(DONE, suite 134/134 → now 141/141 with deploy-phase tests); events page redesign
`specs/012-events-page-redesign/` (DONE, suite 187/187 across 27 files, lint + prod build green).
Governance rules:
`.specify/memory/constitution.md` (v3.1.0 — KI Hub is an employee portal: Registry + News +
Calendar + Learning, two surfaces; Learning is native Payload content, NOT an artifact, and the
Registry principles I/III/IV/V/VI do not apply to it; Design System constraint = Designsystemet as
FOUNDATION with the generated
KI Hub theme (`designsystemet.config.json` + `pnpm --filter web theme:build`) + kihub token layer;
custom presentational components sanctioned on the tokens).
<!-- SPECKIT END -->
