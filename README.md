# KI Hub

Internal AI enablement and governance platform — a catalog and governance layer over Git-based
AI artifacts. KI Hub indexes, enriches, reviews, and exposes artifacts; it never stores their
content (that lives in the sibling [`ai-artifacts`](../ai-artifacts) repository).

> **Status**: Phase 3 — Governance. On top of the Phase 2 catalog, KI Hub now has a five-role
> model (Reader/Contributor/Reviewer/Approver/Admin), a governance record per artifact (owners,
> risk, KI-Hub-managed lifecycle, recommended/featured), typed reviews (security/GDPR/technical/
> accessibility/responsible-ai/operational), an advisory approval decision, and an append-only
> audit trail — all enforced server-side. No automated discovery or semantic search yet (later
> phases). Phase 2 delivered the indexed catalog; Phase 1 delivered the auth shell + the
> `artifact.yaml` manifest schema.

## Repository layout

```text
apps/web/                     Next.js 16 (App Router) + embedded Payload CMS 3 (catalog UI + indexer CLI)
packages/artifact-schema/     @kihub/artifact-schema — the versioned artifact.yaml contract
packages/discovery-core/      @kihub/discovery-core — scan/buildRecord/reconcile indexing core
packages/governance-core/     @kihub/governance-core — role permission matrix + lifecycle FSM + review-expiry check
specs/001-phase1-foundation/  Spec-kit artifacts — Phase 1 (foundation)
specs/002-catalog/            Spec-kit artifacts — Phase 2 (catalog)
specs/003-governance/         Spec-kit artifacts — Phase 3 (governance)
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

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Run the web app (`--filter web dev`) |
| `pnpm build` | Build the web app |
| `pnpm test` | Run all workspace tests (`pnpm -r test`) |
| `pnpm lint` | Lint all packages |
| `pnpm --filter @kihub/artifact-schema validate <artifact.yaml>` | Validate a manifest on demand |
| `pnpm --filter @kihub/artifact-schema generate:jsonschema` | Regenerate the JSON Schema contract |

> The web integration tests (`users-upsert`, `reconcile`, `governance-access`,
> `reindex-preserves`, `review-approval-flow`, …) need the database running and `apps/web/.env`
> loaded. `reconcile` wipes the `artifacts` table as part of its clean-slate strategy — re-run
> `pnpm --filter web index` afterwards to repopulate the catalog for manual browsing.

## Validating artifacts

The `artifact.yaml` schema and docs live in [`packages/artifact-schema`](packages/artifact-schema).
Validate seeded examples in the sibling repo:

```bash
pnpm --filter @kihub/artifact-schema validate ../ai-artifacts/**/artifact.yaml
```

## Spec-driven development

This project follows spec-kit (constitution → specify → clarify → plan → tasks → analyze →
implement). See [`specs/001-phase1-foundation/`](specs/001-phase1-foundation),
[`specs/002-catalog/`](specs/002-catalog), [`specs/003-governance/`](specs/003-governance), and the
[constitution](.specify/memory/constitution.md).
