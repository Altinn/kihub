<!-- SPECKIT START -->
Active feature: **015-multi-source-agents** (DONE — specify + plan + tasks + analyze + implement
complete 2026-08-12; tasks 37/38, T038 half-done: local browser e2e verified, the
real-GitHub-second-repo pass still needs the user's repo + PAT per quickstart §4. Suites:
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
`reindex-preserves.test.ts` uses `sourceId: null`). Local dev DB currently holds 015 demo data
(`digdir.security-review` + `digdir.support-copilot` agent with card, source `demo-015`
disabled) seeded for the T038 visual check.
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
