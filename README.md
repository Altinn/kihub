# KI Hub

Internal AI enablement and governance platform — a catalog and governance layer over Git-based
AI artifacts. KI Hub indexes, enriches, reviews, and exposes artifacts; it never stores their
content (that lives in the sibling [`ai-artifacts`](../ai-artifacts) repository).

> **Status**: Phase 5 — Full-text search. Employees can now search the catalog by keyword: a
> PostgreSQL full-text query (`to_tsvector`/`websearch_to_tsquery` + `ts_rank`, `english` config)
> over the live `artifacts` free-text fields (name, description, README), ranked by relevance,
> governance-safe (active + visibility), and combining with the existing type/tag/category filters —
> on the database the platform already runs (no new datastore, service, package, or schema change).
> Semantic / embeddings / Qdrant remain deferred to a later phase (Constitution Principle VII:
> "full-text search first"). Phase 4 added automated discovery (webhook + scheduled + in-app
> triggers, remote GitHub fetch); Phase 3 governance (five-role model, governance record per
> artifact, typed reviews, advisory approval, audit trail); Phase 2 the indexed catalog; Phase 1 the
> auth shell + `artifact.yaml` manifest schema.

## Repository layout

```text
apps/web/                     Next.js 16 (App Router) + embedded Payload CMS 3 (catalog UI + indexer CLI)
packages/artifact-schema/     @kihub/artifact-schema — the versioned artifact.yaml contract
packages/discovery-core/      @kihub/discovery-core — scan/scanRepo/buildRecord/reconcile indexing core
packages/github-client/       @kihub/github-client — remote GitHub repo reader (RepoReader) for automated discovery
packages/governance-core/     @kihub/governance-core — role permission matrix + lifecycle FSM + review-expiry check
specs/001-phase1-foundation/  Spec-kit artifacts — Phase 1 (foundation)
specs/002-catalog/            Spec-kit artifacts — Phase 2 (catalog)
specs/003-governance/         Spec-kit artifacts — Phase 3 (governance)
specs/004-automated-discovery/ Spec-kit artifacts — Phase 4 (automated discovery)
specs/005-fulltext-search/    Spec-kit artifacts — Phase 5 (full-text search)
.specify/                     Spec-kit config + constitution
```

Built with Next.js + Payload CMS (PostgreSQL), Auth.js (Azure Entra ID), and — for all UI —
Digdir's [Designsystemet](https://github.com/digdir/designsystemet).

## Prerequisites

- Node.js ≥ 22 and `pnpm`
- Docker (Colima or Docker Desktop) for local PostgreSQL

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

### Governance (Phase 3)

Open an artifact's detail page to see its governance state (lifecycle badge, approved/recommended)
and, depending on the signed-in role:

- **Contributor+**: edit owners/risk/notes and submit the artifact for review (Draft → Experimental
  → In Review).
- **Reviewer+**: record a typed review (security/GDPR/technical/accessibility/responsible-ai/
  operational) with a decision, comments, required changes, risk level, and an expiry date.
- **Approver+**: approve or reject (advisory with respect to typed reviews) and move the lifecycle
  through Approved/Recommended/Deprecated/Archived.
- **Admin**: everything above, plus role management at `/admin/roles`.

Every governance action is attributed and recorded in an audit trail visible on the artifact's
detail page. All role/action checks are enforced server-side (Payload `access` functions +
`@kihub/governance-core`), not just hidden in the UI.

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

Type a keyword or phrase into the search box on the catalog (`/?q=…`). KI Hub runs a PostgreSQL
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

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Run the web app (`--filter web dev`) |
| `pnpm build` | Build the web app |
| `pnpm test` | Run all workspace tests (`pnpm -r test`) |
| `pnpm lint` | Lint all packages |
| `pnpm --filter web index` | Index a local `ai-artifacts` checkout (Phase 2 CLI, retained fallback) |
| `pnpm --filter web discovery:scan` | Trigger the scheduled-scan endpoint against a running dev server (Phase 4) |
| `pnpm --filter @kihub/artifact-schema validate <artifact.yaml>` | Validate a manifest on demand |
| `pnpm --filter @kihub/artifact-schema generate:jsonschema` | Regenerate the JSON Schema contract |

> The web integration tests (`users-upsert`, `reconcile`, `governance-access`,
> `reindex-preserves`, `review-approval-flow`, `discovery-run`, `discovery-webhook`,
> `discovery-scan`, `discovery-access`, `discovery-serialize`, `search`, …) need the database running and
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
[`specs/005-fulltext-search/`](specs/005-fulltext-search), and the
[constitution](.specify/memory/constitution.md).
