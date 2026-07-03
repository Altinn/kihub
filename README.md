# KI Hub

Internal AI enablement and governance platform — a catalog and governance layer over Git-based
AI artifacts. KI Hub indexes, enriches, reviews, and exposes artifacts; it never stores their
content (that lives in the sibling [`ai-artifacts`](../ai-artifacts) repository).

> **Status**: Phase 1 — Foundation. Authenticated, employees-only shell + the `artifact.yaml`
> manifest schema. No catalog browsing, discovery automation, or search yet (later phases).

## Repository layout

```text
apps/web/                     Next.js 16 (App Router) + embedded Payload CMS 3
packages/artifact-schema/     @kihub/artifact-schema — the versioned artifact.yaml contract
specs/001-phase1-foundation/  Spec-kit artifacts (spec, plan, tasks, contracts, quickstart)
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

Open http://localhost:3000 → redirected to sign-in. With `AUTH_MODE=mock` (default) pick a persona:
`member` reaches the catalog shell; `guest`/`foreign-tenant` are denied. Set `AUTH_MODE=entra`
(plus a single-tenant Entra app registration) for real Microsoft sign-in.

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Run the web app (`--filter web dev`) |
| `pnpm build` | Build the web app |
| `pnpm test` | Run all workspace tests (`pnpm -r test`) |
| `pnpm lint` | Lint all packages |
| `pnpm --filter @kihub/artifact-schema validate <artifact.yaml>` | Validate a manifest on demand |
| `pnpm --filter @kihub/artifact-schema generate:jsonschema` | Regenerate the JSON Schema contract |

> The web integration test (`users-upsert`) needs the database running and `apps/web/.env` loaded.

## Validating artifacts

The `artifact.yaml` schema and docs live in [`packages/artifact-schema`](packages/artifact-schema).
Validate seeded examples in the sibling repo:

```bash
pnpm --filter @kihub/artifact-schema validate ../ai-artifacts/**/artifact.yaml
```

## Spec-driven development

This project follows spec-kit (constitution → specify → clarify → plan → tasks → analyze →
implement). See [`specs/001-phase1-foundation/`](specs/001-phase1-foundation) and the
[constitution](.specify/memory/constitution.md).
