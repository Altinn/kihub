<!-- SPECKIT START -->
Active feature: **014-learning-pages** (DONE — specify + plan + tasks + implement complete; suite
**328/328 across 37 files**, lint clean, prod build compiles + typechecks + generates all routes).
For technologies, structure, and context read the plan:
`specs/014-learning-pages/plan.md` (with `research.md`, `data-model.md`, `contracts/`,
`quickstart.md`; `spec.md` for requirements). It adds **KI Læring** — the constitution's fourth
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
