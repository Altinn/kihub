# KI Hub

Internal employee portal for Digdir. It brings together, in one place for all employees, four
modules: an **AI-tool Registry** (a catalog and governance layer over Git-based AI artifacts),
**News**, a **Calendar** of events, and **KI Læring** — a curated learning library that teaches
employees how to work with AI tooling. The Registry indexes, enriches, reviews, and exposes
artifacts; it never stores their content (that lives in the sibling
[`ai-artifacts`](../ai-artifacts) repository). News, Calendar and Learning are native platform
content, authored directly in KI Hub with no Git source.

> **Status**: KI Læring (learning pages). KI Hub gained a **fourth** native-content module
> (Constitution v3.1.0, Principle II) alongside Registry, News and Calendar/Events: an
> editor-curated library of **categories → subcategories → learning pages**, authored in `/cms` by
> **Contributor+** editors and read by all employees at **`/laering`** behind a persistent
> left-hand resource navigation (native `<details>`, so it works with client-side scripting
> disabled). Page bodies support rich text (headings, lists, links, blockquotes); images are
> placed by dragging them into the editor, backed by a new **`media`** collection — KI Hub's first
> managed uploads, stored on the local filesystem in development and Azure Blob Storage in
> deployed environments (`MEDIA_STORAGE_MODE=disk|azure`); code samples get a language selector
> and **display-only** syntax highlighting (server-side, via `shiki` — never executed). Page
> addresses are flat (`/laering/<slug>`), so reorganising the library never breaks a shared link.
> Two new dependencies (`shiki`, `@payloadcms/storage-azure`) and one additive schema migration.
> Durable image storage is **provisioned** — a private Azure Blob container wired into the
> `kihub-web` container app — but deployment of the module itself is still pending two outstanding
> identity items with digdir IT (a sign-in app registration and a deploy-service-principal role
> grant); `kihub-web` currently runs a pre-014 image.
>
> Previously — News page redesign (013): `/news` ("Nyheter") became a kihub-restyled editorial
> card grid (16:10 media well, serif headline, Norwegian date, summary) with server-rendered
> `?page=N` pagination, plus a matching article-page restyle.
>
> Previously — Events page redesign (012): `/events` ("Arrangementer") became a segmented
> **Kalender | Liste** experience — a month-grid calendar view and a Norwegian date-grouped list
> view with type/format filters — modelled on the old KI HUB app's calendar page.
>
> Previously — Frontpage redesign (011): `/` was rebuilt to match the old KI HUB site's layout
> (CMS-managed header, hero, navigation tiles, subscriptions banner, events + news sections,
> footer), restyled on the kihub design system, replacing the widgets dashboard below.
>
> Previously — home-page widgets (010). The employee landing page **`/`** became a portal
> **dashboard** with three read-only widgets — the latest published **news** (3), the next
> upcoming **events** (3), and **featured/recommended** Registry tools (3) — each with a "View
> all →" link into its module. The Registry catalog **browse + full-text search moved to
> `/registry`** (its own header nav link); a shared header keeps Registry · News · Events · **KI
> Læring** nav consistent across the app. It reused the existing published-only read libs + the
> `NewsCard`/`EventCard`/`ArtifactCard` cards and the governance `featured`/`recommended` flags,
> with **zero** new collections, schema changes, migrations, or dependencies at the time.
>
> Previously — Phase 8 — Calendar / Events. KI Hub gained the **third** native-content module
> of the portal charter (Constitution Principle II; Registry + News + Calendar) at the time:
> internal events authored in the `/cms` back-office by **Contributor+** editors and read by all
> employees in the app at **`/events`** (a list of published **upcoming** events — soonest-first, featured surfaced — plus
> an `/events/<slug>` detail page; datetimes in Europe/Oslo). Events is fully owned by Payload — no Git
> source, not an artifact; only **published** events are visible to employees (drafts never leak,
> enforced by both the read query and the collection's `read` access rule), and past events drop off
> the list automatically. It reuses the shared foundation (Entra auth, five-role model, the Phase 6
> back-office, the Phase 7 slug helper, the lexical editor, the Payload/PostgreSQL data layer) with no
> new dependency, datastore, or migration. Phase 7 added **News** — the first native-content module,
> the same shape at **`/news`**. Phase 6 mounted the Payload CMS
> admin at **`/cms`** as the editor/admin back-office (Constitution Principle VIII — the second
> surface), gated to Contributor+, with Git-derived collections (`artifacts`, `discovery-runs`,
> `audit-log`) read-only (Principle I); Phase 5 added full-text search
> (`to_tsvector`/`websearch_to_tsquery` + `ts_rank`, `english`) over the live `artifacts` free-text
> fields; Phase 4 automated discovery (webhook + scheduled + in-app triggers, remote GitHub fetch);
> Phase 3 governance (five-role model, governance record per artifact, typed reviews, advisory
> approval, audit trail); Phase 2 the indexed catalog; Phase 1 the auth shell + `artifact.yaml`
> manifest schema.

## Repository layout

```text
apps/web/                     Next.js 16 (App Router) + embedded Payload CMS 3 — two surfaces:
                              (app) employee-facing dashboard + Registry catalog UI, (payload) editor back-office at /cms
packages/artifact-schema/     @kihub/artifact-schema — the versioned artifact.yaml contract
packages/discovery-core/      @kihub/discovery-core — scan/scanRepo/buildRecord/reconcile indexing core
packages/github-client/       @kihub/github-client — remote GitHub repo reader (RepoReader) for automated discovery
packages/governance-core/     @kihub/governance-core — role permission matrix + lifecycle FSM + review-expiry check
specs/001-phase1-foundation/  Spec-kit artifacts — Phase 1 (foundation)
specs/002-catalog/            Spec-kit artifacts — Phase 2 (catalog)
specs/003-governance/         Spec-kit artifacts — Phase 3 (governance)
specs/004-automated-discovery/ Spec-kit artifacts — Phase 4 (automated discovery)
specs/005-fulltext-search/    Spec-kit artifacts — Phase 5 (full-text search)
specs/006-editor-backoffice/  Spec-kit artifacts — Phase 6 (editor back-office)
specs/007-news/               Spec-kit artifacts — Phase 7 (news)
specs/008-governance-ui-reconcile/ Spec-kit artifacts — governance-UI reconcile
specs/009-calendar-events/    Spec-kit artifacts — Phase 8 (calendar / events)
specs/010-home-widgets/       Spec-kit artifacts — home-page widgets (dashboard + /registry)
specs/011-frontpage-redesign/ Spec-kit artifacts — frontpage redesign
specs/012-events-page-redesign/ Spec-kit artifacts — events page redesign
specs/013-news-page-redesign/ Spec-kit artifacts — news page redesign
specs/014-learning-pages/     Spec-kit artifacts — learning pages (KI Læring)
.specify/                     Spec-kit config + constitution
```

Built with Next.js + Payload CMS (PostgreSQL) and Auth.js (Azure Entra ID). The **employee-facing**
UI uses Digdir's [Designsystemet](https://github.com/digdir/designsystemet); the **editor
back-office** at `/cms` is Payload's own admin UI and is exempt from Designsystemet (Constitution
Principle VIII — two surfaces sharing one auth, role model, and Payload data layer).

## Prerequisites

- Node.js ≥ 22 and `pnpm`
- Docker (Colima or Docker Desktop) for local PostgreSQL

Fonts are self-hosted from `apps/web/src/fonts/` (`next/font/local`) — `pnpm build` needs no
network access to Google Fonts.

## Quick start

```bash
pnpm install

# Local database (host port 55432 to avoid collisions)
docker compose -f apps/web/docker-compose.yml up -d

# Environment — a working .env already exists; or copy the template:
cp apps/web/.env.example apps/web/.env

# Run the app
pnpm dev            # http://localhost:3000
```

Open http://localhost:3000 → redirected to sign-in. With `AUTH_MODE=mock` (default) pick a persona —
`member` (Reader), `contributor`, `reviewer`, `approver`, or `admin` reach the catalog with that
role; `guest`/`foreign-tenant` are denied. Set `AUTH_MODE=entra` (plus a single-tenant Entra app
registration) for real Microsoft sign-in — every real user starts as Reader; an Admin can
subsequently change a user's role at `/admin/roles`.

### Populate the catalog (Phase 2)

Index a local checkout of the sibling `ai-artifacts` repo into the catalog:

```bash
# set AI_ARTIFACTS_PATH (absolute) in apps/web/.env, then:
pnpm --filter web index
```

Re-run any time to reconcile (add/update/deactivate). The catalog is rebuildable from Git — nothing
is authored in the app. Then browse at http://localhost:3000 and open an artifact for its detail +
`apm install …` command.

### Governance (Phase 3; actions moved to the back-office per constitution v2.0.0)

Open an artifact's detail page to see its governance state **read-only** — the same view for every
signed-in role: lifecycle state, review/approval status, business/technical owner, risk level, the
typed-review history (with expiry/expired indicators), and the audit trail. The employee app offers
no governance actions (Principles VI & VIII: it is a read-first surface, not an admin).

All governance **actions** are performed in the `/cms` editor back-office (Contributor+):

- edit owners/risk/internal-notes/featured on a `catalog-entries` record,
- move the lifecycle (Draft → Experimental → In Review → Approved/Recommended/Deprecated/Archived,
  guarded by the `@kihub/governance-core` state machine — invalid transitions are rejected),
- record typed reviews (security/GDPR/technical/accessibility/responsible-ai/operational) with a
  decision, comments, required changes, risk level, and an expiry date,
- record approval decisions (advisory with respect to typed reviews).

Every action is attributed and audit-logged (visible read-only on the artifact's detail page). All
role/action checks are enforced server-side (Payload `access` functions + `@kihub/governance-core`),
independent of any UI. Admins additionally manage roles at `/admin/roles`.

### Automated discovery (Phase 4)

Discovery is now automated and fetches artifact content **remotely from GitHub** — the manual CLI
is retained only as a break-glass fallback. Configure a source (a `discovery-sources` record) with
its `owner/repo`, the name of the env var holding a GitHub token (`tokenEnvVar`, e.g.
`GITHUB_TOKEN_AI_ARTIFACTS`), and a webhook signing secret. Three triggers converge on one
idempotent reconcile, preserving all governance state:

- **Webhook** — point a GitHub push webhook at `POST /api/discovery/webhook/<sourceId>` with the
  source's secret. Each delivery is verified via `X-Hub-Signature-256` (HMAC) and reconciles the
  catalog.
- **Scheduled scan** — an external scheduler (Azure Container Apps job, default daily) sends
  `POST /api/discovery/scan` with the `X-Discovery-Scan-Key` header (`DISCOVERY_SCAN_KEY`) to
  converge every enabled source. Locally: `pnpm --filter web discovery:scan` (dev server running).
- **In-app trigger** — an Admin visits `/admin/discovery` to see each source's status + run history
  and click **Run now** (the successor to the CLI).

Every run — webhook, scheduled, or manual — is recorded in `discovery-runs` (trigger, outcome,
created/updated/deactivated/skipped counts) and surfaced to Admins. Required env: see the
`Automated discovery (Phase 4)` block in `apps/web/.env.example`. Secrets (the GitHub token via env,
each source's webhook secret) never appear in run records or the UI.

The local-checkout CLI remains available as a fallback:

```bash
# set AI_ARTIFACTS_PATH (absolute) in apps/web/.env, then:
pnpm --filter web index
```

### Full-text search (Phase 5)

Type a keyword or phrase into the search box on the catalog (`/registry?q=…`). KI Hub runs a PostgreSQL
full-text query over the indexed free-text fields — artifact **name**, **description**, and the
**README** snapshot — ranked by relevance, and shows a "no results" state when nothing matches.
Search combines with the existing type/tag/category filters (clearing the query returns to plain
browse), and only ever returns artifacts you're allowed to see (active + visibility, resolved
through the same governance rules as browse). Because it reads the live catalog rows that discovery
keeps current, results are always fresh — there is no separate search index to build or sync.

There is **no new datastore, service, dependency, collection, field, or migration** — search runs on
the existing PostgreSQL. The searched content (the catalogued tools) is English, so the `english`
text-search configuration is used (stemming improves recall); the Norwegian application UI is not
searchable content. Meaning-based / semantic search (embeddings + a vector store) is intentionally
deferred to a later phase.

### Editor back-office (Phase 6)

The Payload CMS admin is mounted as the **editor/admin back-office** — KI Hub's second surface
(Constitution Principle VIII) — at **`/cms`** (the Payload REST/GraphQL API lives at `/payload-api`,
so neither collides with the employee app's `/admin/*` pages or `/api/*` handlers). Sign in once (the
same Entra/Auth.js session powers both surfaces) and open http://localhost:3000/cms:

- **Entry is gated to Contributor and above**, enforced server-side by `Users.access.admin`. Readers
  and anonymous visitors are refused ("this user does not have access to the admin panel").
- **Editable** per the existing role rules: `catalog-entries`, `reviews`, `discovery-sources`, and
  `users` (a user's role can only be changed by an Admin). Edits flow through the same data layer as
  the employee app and are attributed in the `audit-log` (visible on the artifact detail page).
- **Read-only** (view only, no create/edit — Principle I, so indexed metadata can't drift from Git):
  the Git-derived/system collections `artifacts`, `discovery-runs`, and `audit-log`. Discovery-source
  secrets/tokens stay hidden here too.

The back-office is Payload's own admin UI and is **exempt from Designsystemet**. It reuses the Phase 1
Auth.js→Payload session bridge and every collection's `access` rules **unchanged** — the only net-new
code is the `(payload)` route group (boilerplate), the `routes` config, and the one entry gate. Run
`pnpm --filter web generate:importmap` after changing admin-registered components.

### News (Phase 7)

News is KI Hub's first **native-content** module (Constitution Principle II): articles authored in the
back-office and read by all employees — no Git source, not an artifact, fully owned by Payload.

- **Read** (employees): open http://localhost:3000/news for the feed — published articles newest-first
  with featured items surfaced — and `/news/<slug>` for an article (title, byline, publish date,
  rich-text body, optional tags/hero image). A "News" link sits in the app header. Unpublished drafts
  are never visible to employees — not in the list, not by direct URL (a draft slug 404s). This is
  enforced twice: `lib/news.ts` filters `status: published`, and the collection's `read` access rule
  constrains non-editors to published (API-path defense in depth).
- **Author** (`/cms`, Contributor+): create/edit/publish/unpublish/delete in the **News** collection.
  The `slug` is auto-derived from the title (editable, unique); `author` defaults to the creator (shown
  as the byline); publishing stamps the publish date. Authoring/publishing is gated to Contributor+
  server-side; News is intentionally **not** under the Registry's governance lifecycle/reviews.

The body is a lexical rich-text field (the editor already used by the platform), rendered on the
employee page via `@payloadcms/richtext-lexical/react`. No new dependency or datastore. **Deferred to
later phases**: managed image uploads (Azure Blob — the hero image is a URL for now), scheduled
publishing, reader comments, a categories taxonomy, and a home-page news widget.

### Calendar / Events (Phase 8)

Events is the **third** native-content module of the portal charter (Constitution Principle
II; Registry + News + Calendar at the time — Learning followed as the fourth): events authored in
the back-office and read by all employees — no Git source, not an artifact, fully owned by
Payload. It is a structural clone of News.

- **Read** (employees): open http://localhost:3000/events for the list — published **upcoming** events
  soonest-first with featured items surfaced — and `/events/<slug>` for an event (title; when, in
  Europe/Oslo; location and/or online-meeting link; organizer; rich-text description; optional tags).
  An "Events" link sits in the app header beside News. **Past** events drop off the list automatically
  (upcoming = `(end ?? start) ≥ now`, so an in-progress event stays listed); a published past event is
  still reachable by its detail URL. Unpublished drafts are never visible to employees — not in the
  list, not by direct URL (a draft slug 404s). This is enforced twice: `lib/events.ts` filters
  `status: published`, and the collection's `read` access rule constrains non-editors to published
  (API-path defense in depth).
- **Author** (`/cms`, Contributor+): create/edit/publish/unpublish/delete in the **Events** collection.
  The `slug` is auto-derived from the title (editable, unique); the start datetime is required and the
  end is optional (an end before the start is rejected on save); organizer is free text.
  Authoring/publishing is gated to Contributor+ server-side; Events is intentionally **not** under the
  Registry's governance lifecycle/reviews.

The description is a lexical rich-text field, rendered via `@payloadcms/richtext-lexical/react`. Pure
date logic (end≥start validation, the upcoming predicate, Europe/Oslo formatting) lives in
`lib/event-dates.ts` and is unit-tested. No new dependency, datastore, or migration. **Deferred to
later phases**: recurring events, RSVP/registration, ICS/calendar-feed export, a month-grid calendar
view, and a home-page events widget.

### KI Læring (Learning)

Learning is KI Hub's **fourth** native-content module (Constitution v3.1.0, Principle II): a
Contributor+-curated library of **categories → subcategories → learning pages** that teaches
employees how to work with AI tooling — no Git source, not an artifact, fully owned by Payload.
The Registry's principles (Git-source-of-truth, the artifact model, stable identity, APM
distribution, governance) do not apply to it.

- **Read** (employees): open http://localhost:3000/laering for the overview — a Norwegian heading
  plus one section per published category — and a persistent left-hand resource navigation
  listing every published category (grouped under subcategory headings where the editor has
  created them) with its pages beneath. Selecting a page opens it at **`/laering/<slug>`** with
  its containing group already expanded and the current page marked, both visually and to
  assistive technology. The sidebar is a native `<details>` tree, so browsing and
  expanding/collapsing groups all work with client-side scripting disabled (the feature adds
  **zero** client components). At phone widths the sidebar collapses behind a single Norwegian
  disclosure control above the content. Unpublished drafts are never visible — not in the tree,
  not by direct address.
- **Author** (`/cms`, Contributor+): create categories, optionally divide them into
  subcategories, and write pages inside them. Ordering is an explicit `order` field the editor
  controls (not alphabetical, and not Payload's `@experimental` orderable). A page's slug is
  derived from its title and stays stable if the title later changes, so reorganising the library
  never breaks a link a colleague has already shared. Deleting a category or subcategory that
  still holds content is refused with a clear explanation.
- **Rich content**: page bodies are lexical rich text (headings, paragraphs, lists, links,
  blockquotes). Images are placed by dragging them straight into the editor, backed by a new
  **`media`** collection — KI Hub's first managed uploads (raster formats only, 5 MB max, alt text
  or an explicit decorative marking required before save). Files are stored on the local
  filesystem in development and in Azure Blob Storage in deployed environments, selected by
  `MEDIA_STORAGE_MODE=disk|azure` (see `apps/web/.env.example`). Code samples get a language
  selector and render **display-only** with syntax highlighting — rendered server-side with
  `shiki`, colours resolved through the shared `--shiki-token-*` design-token aliases (never a
  vendor theme's fixed palette) — nothing in a sample is ever executed, and an unsupported
  language falls back to plain monospace text.

All learning UI is Norwegian (bokmål) and styled exclusively through the kihub token layer. Two
new dependencies (`shiki`, `@payloadcms/storage-azure`) and one additive schema migration; no
existing Registry, News or Events data is touched. Durable image storage is **provisioned** — a
private Azure Blob container (`kihub-media`) is wired into the `kihub-web` container app — but
**deployment of the Learning module itself** is still pending two outstanding identity items with
digdir IT (a sign-in app registration and a deploy-service-principal role grant); `kihub-web`
currently runs a pre-014 image that ignores the new env vars. In any environment whose site
navigation was already customised by an editor, the "KI Læring" entry does not appear
automatically — an editor adds it once in `/cms` → Site Chrome.

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Run the web app (`--filter web dev`) |
| `pnpm build` | Build the web app |
| `pnpm test` | Run all workspace tests (`pnpm -r test`) |
| `pnpm lint` | Lint all packages |
| `pnpm --filter web index` | Index a local `ai-artifacts` checkout (Phase 2 CLI, retained fallback) |
| `pnpm --filter web discovery:scan` | Trigger the scheduled-scan endpoint against a running dev server (Phase 4) |
| `pnpm --filter web generate:importmap` | Regenerate the Payload admin import map for the `/cms` back-office (Phase 6) |
| `pnpm --filter @kihub/artifact-schema validate <artifact.yaml>` | Validate a manifest on demand |
| `pnpm --filter @kihub/artifact-schema generate:jsonschema` | Regenerate the JSON Schema contract |

> The web integration tests (`users-upsert`, `reconcile`, `governance-access`,
> `reindex-preserves`, `review-approval-flow`, `discovery-run`, `discovery-webhook`,
> `discovery-scan`, `discovery-access`, `discovery-serialize`, `search`, `admin-readonly`, `news-access`, `events-access`, `learning-access`, `learning-hierarchy`, …) need the database running and
> `apps/web/.env` loaded. `reconcile` and the discovery tests wipe the `artifacts` table as part of
> their clean-slate strategy — re-run `pnpm --filter web index` afterwards to repopulate the catalog
> for manual browsing.

## Validating artifacts

The `artifact.yaml` schema and docs live in [`packages/artifact-schema`](packages/artifact-schema).
Validate seeded examples in the sibling repo:

```bash
pnpm --filter @kihub/artifact-schema validate ../ai-artifacts/**/artifact.yaml
```

## Spec-driven development

This project follows spec-kit (constitution → specify → clarify → plan → tasks → analyze →
implement). See [`specs/001-phase1-foundation/`](specs/001-phase1-foundation),
[`specs/002-catalog/`](specs/002-catalog), [`specs/003-governance/`](specs/003-governance),
[`specs/004-automated-discovery/`](specs/004-automated-discovery),
[`specs/005-fulltext-search/`](specs/005-fulltext-search),
[`specs/006-editor-backoffice/`](specs/006-editor-backoffice),
[`specs/007-news/`](specs/007-news),
[`specs/008-governance-ui-reconcile/`](specs/008-governance-ui-reconcile),
[`specs/009-calendar-events/`](specs/009-calendar-events),
[`specs/010-home-widgets/`](specs/010-home-widgets),
[`specs/011-frontpage-redesign/`](specs/011-frontpage-redesign),
[`specs/012-events-page-redesign/`](specs/012-events-page-redesign),
[`specs/013-news-page-redesign/`](specs/013-news-page-redesign),
[`specs/014-learning-pages/`](specs/014-learning-pages), and the
[constitution](.specify/memory/constitution.md).
