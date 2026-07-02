# Implementation Plan: Phase 1 Foundation

**Branch**: `001-phase1-foundation` | **Date**: 2026-07-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-phase1-foundation/spec.md`

## Summary

Stand up the KI Hub foundation: a locally-runnable Next.js (App Router) application with an embedded Payload CMS backed by PostgreSQL, gated by Azure Entra ID sign-in restricted to the organization's own employees (home-tenant members, guests excluded). Authenticated users land on a working-but-empty catalog shell built entirely with Digdir's Designsystemet. Separately, define the `artifact.yaml` manifest as a versioned, machine-readable schema (with human-readable docs) that enforces the generic `type`-differentiated artifact model and reverse-DNS-style stable IDs, and seed 2–3 conforming example artifacts in a sibling `ai-artifacts` repository. No discovery automation, catalog browsing, detail pages, or search this phase.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS.

**Primary Dependencies**:
- Next.js 15 (App Router) — application shell and server.
- Payload CMS 3.x (embedded in the Next.js app) + `@payloadcms/db-postgres` (`postgresAdapter`, `DATABASE_URI`).
- Auth.js v5 (`next-auth`) Microsoft Entra ID provider — OIDC sign-in flow — bridged into Payload via a Payload custom auth strategy. An `AUTH_MODE`-switched dev-only mock persona provider stands in for Entra locally (same claim shape → same `employeeGate`/upsert pipeline); real Entra used when `AUTH_MODE=entra`.
- Digdir Designsystemet: `@digdir/designsystemet-react`, `@digdir/designsystemet-css` (+ `@digdir/designsystemet-types`, CLI `@digdir/designsystemet` for theme/token build). All UI built from these; theming via `data-color-scheme`/`data-size` attributes on `<html>`, no custom-styled forks.
- Schema/validation: Zod (authoring + runtime validation) with a generated JSON Schema export for the published `artifact.yaml` contract; `yaml` for parsing manifests.

**Storage**: PostgreSQL 16 (local via Docker Compose in this phase). Payload owns only enterprise metadata; in Phase 1 the only populated collection is `Users` (auth mapping). No artifact content is stored (Principle I).

**Testing**: Vitest for unit/integration (schema validation, manifest parsing, auth-guard/employee-gating logic with mocked identities). Manual quickstart scenario for the real Entra ID sign-in flow (live OIDC not automated this phase).

**Target Platform**: Local developer machine (macOS/Linux) via `pnpm dev` + Docker Compose Postgres. Azure hosting deferred (FR-019).

**Project Type**: Web application — monorepo with a single `apps/web` (Next.js + Payload) plus shared `packages/`. Content lives in a separate `ai-artifacts` repository.

**Performance Goals**: Sign-in-to-shell in under 30 seconds under normal conditions (SC-002). No throughput/scale targets this phase (foundation, single-tenant internal use).

**Constraints**:
- UI MUST use Designsystemet components + tokens only (constitution, MANDATORY).
- Access restricted to home-tenant employees; guests/external identities rejected (FR-002).
- Platform repo MUST contain zero real artifact content (FR-017, Principle I).
- `artifact.yaml` schema is a versioned contract shared with `ai-artifacts` (constitution).

**Scale/Scope**: Foundation slice. 0 artifacts indexed in the platform; 2–3 example artifacts seeded in `ai-artifacts`; 1 auth flow; 1 catalog-shell page with an empty state.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Constraint | Phase 1 compliance | Status |
|------------------------|--------------------|--------|
| I. Git is source of truth (no artifact content in app/DB) | No artifact bodies stored; artifacts live only in `ai-artifacts`. Payload populates only `Users`. | ✅ PASS |
| II. Payload owns context not content | Only enterprise/auth metadata in Payload; no manifest/README indexing yet. | ✅ PASS |
| III. Everything is an Artifact | Schema models one generic artifact with an enumerated `type` field; no per-type subsystems. | ✅ PASS |
| IV. Stable artifact identity | Schema enforces reverse-DNS `org.slug` ID, independent of repo/path. | ✅ PASS |
| V. Git-centric, APM-compatible distribution | Manifest carries an `install.apm` reference; no installation reimplemented. | ✅ PASS |
| VI. Governance is the core value | Lifecycle/visibility fields defined in the schema now; review/approval workflows deferred to Phase 3 (foundation does not bypass governance, it lays its data groundwork). | ✅ PASS |
| VII. Start simple, design for growth | Local-first, on-demand, minimal collections; seams (packages, stable IDs, schema contract) preserved. | ✅ PASS |
| Design System (MANDATORY) | Catalog shell + all UI built from Designsystemet React + tokens. | ✅ PASS |
| Auth (Entra ID day one, employees only) | Auth.js Entra provider + single-tenant registration + guest exclusion. | ✅ PASS |
| Testing gate (schema validation, etc. automated) | Vitest covers manifest schema validation and employee-gating logic. | ✅ PASS |
| Contract-first (versioned manifest schema) | `artifact.yaml` schema versioned in `packages/artifact-schema`. | ✅ PASS |

**Result**: No violations. Complexity Tracking section intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-phase1-foundation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── artifact.schema.json   # Machine-readable artifact.yaml contract (JSON Schema)
│   └── auth-gating.md         # Auth/session → Payload user contract + employee-gating rule
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

Repo `kihub` (this platform) — pnpm workspace monorepo:

```text
apps/
  web/                       # Next.js 15 App Router + embedded Payload CMS
    src/
      app/
        (app)/               # Authenticated application routes
          layout.tsx         # Root layout: Designsystemet CSS imports + data-color-scheme
          page.tsx           # Catalog shell (empty state) — Designsystemet components
        (payload)/           # Payload-owned admin routes (generated)
        api/auth/[...]/      # Auth.js route handlers (Entra ID OIDC)
      collections/
        Users.ts             # Payload Users collection + custom auth strategy binding
      auth/
        entra.ts             # Auth.js config (Microsoft Entra ID provider, single-tenant)
        employee-gate.ts     # Home-tenant / guest-exclusion check (unit-tested)
        payload-strategy.ts  # Payload custom auth strategy bridging Auth.js session → user
      payload.config.ts      # Payload config: postgresAdapter, collections
    tests/
      unit/                  # employee-gate, session mapping
      integration/           # auth guard on protected routes (mocked identities)
    docker-compose.yml       # Local PostgreSQL
    .env.example

packages/
  artifact-schema/           # The artifact.yaml contract (shared with ai-artifacts)
    src/
      schema.ts              # Zod schema (id/type/name/version/.../lifecycle/visibility)
      validate.ts            # parse + validate an artifact.yaml -> {valid, errors}
      index.ts
    schema/
      artifact.schema.json   # Generated JSON Schema export (published contract)
    scripts/
      validate-file.ts       # CLI: validate one or more artifact.yaml files on demand
    docs/
      artifact-manifest.md   # Human-readable field documentation
    tests/
      schema.test.ts         # valid/invalid fixtures, bad IDs, unknown types
    package.json

pnpm-workspace.yaml
package.json
```

Repo `ai-artifacts` (separate repository — seeded this phase):

```text
skills/
  <example-skill>/
    artifact.yaml
    README.md
    examples/
prompts/
  <example-prompt-pack>/
    artifact.yaml
    README.md
mcp/                          # (optional 3rd example, different type)
  <example-mcp>/
    artifact.yaml
    README.md
README.md                     # Repo purpose + how manifests are validated
```

**Structure Decision**: pnpm workspace monorepo in `kihub`, with the Next.js + Payload app in `apps/web` and the shared, versioned manifest contract in `packages/artifact-schema` (consumed now by the seed examples and later by the discovery service). Artifact content is deliberately absent from `kihub` and lives only in the sibling `ai-artifacts` repository, enforcing Principle I and FR-017 structurally.

## Complexity Tracking

> No constitution violations — section intentionally empty.
