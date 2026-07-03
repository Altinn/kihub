# Quickstart & Validation: Phase 1 Foundation

Run guide that proves the foundation works end-to-end locally. Implementation details live in
`tasks.md`; this document is the validation scenario set. Paths are relative to the `kihub` repo
root unless noted.

## Prerequisites

- Node.js 22 LTS, pnpm, Docker (for local PostgreSQL).
- `.env` created from `apps/web/.env.example` with `DATABASE_URI`, `AUTH_SECRET`, and `AUTH_MODE`.
- **Local dev (default)**: `AUTH_MODE=mock` — no Entra credentials needed; sign in as a persona.
- **Real Entra (optional/deferred)**: `AUTH_MODE=entra` plus an Entra ID single-tenant **app
  registration** (client id/secret/issuer, redirect URI
  `http://localhost:3000/api/auth/callback/microsoft-entra-id`).

## Setup

```bash
pnpm install
docker compose -f apps/web/docker-compose.yml up -d   # local Postgres
pnpm --filter web dev                                  # Next.js + Payload on http://localhost:3000
```

## Scenario A — Authentication & catalog shell (User Story 1)

With `AUTH_MODE=mock` (default), "sign in" selects a persona; with `AUTH_MODE=entra` the same steps
run against a real Microsoft sign-in. Behavior and expectations are identical either way.

1. Open `http://localhost:3000` while signed out → **Expect**: redirected to sign-in;
   no app content visible. *(FR-001, SC-001)*
2. Sign in as the `member` persona (or a real employee/home-tenant account) → **Expect**: returned
   to the catalog shell; your identity is displayed; the shell shows an intentional **empty state**
   (no artifacts) and no errors. *(FR-003, FR-005, SC-002, SC-004)*
3. Click sign-out → **Expect**: session ends; reopening the page requires signing in again.
   *(FR-004)*
4. Sign in as the `guest` or `foreign-tenant` persona (or a real guest/external account) →
   **Expect**: access denied, no app content, not a broken page. *(FR-002, SC-003)*

## Scenario B — Manifest schema (User Story 2)

```bash
pnpm --filter @kihub/artifact-schema test          # valid + invalid fixtures pass/fail as expected
pnpm --filter @kihub/artifact-schema validate <path-to-artifact.yaml>   # on-demand validation
```

- **Expect**: a well-formed manifest reports valid; a manifest with a bad `id` (not reverse-DNS),
  an unknown `type`, or a missing required field reports invalid with a clear error. *(FR-007..FR-013, SC-005)*
- Confirm the published contract exists: `packages/artifact-schema/schema/artifact.schema.json`, and
  field docs: `packages/artifact-schema/docs/artifact-manifest.md`.

## Scenario C — Seeded examples & repo separation (User Story 3)

In the sibling `ai-artifacts` repo:

```bash
# from ai-artifacts, using the shared schema validator
npx @kihub/artifact-schema validate skills/*/artifact.yaml prompts/*/artifact.yaml
```

- **Expect**: 2–3 example artifacts, each in its own folder with `artifact.yaml` + `README.md`,
  covering ≥2 types; all pass validation. *(FR-014..FR-016, SC-006)*
- In `kihub`: confirm there is **zero** real artifact content (no skill/prompt/workflow/MCP bodies).
  *(FR-017, SC-007)*

## Automated checks (CI-independent, run locally)

```bash
pnpm --filter web test          # employee-gate unit tests + protected-route integration (mocked)
pnpm --filter @kihub/artifact-schema test
```

## Done / acceptance

Phase 1 is complete when Scenarios A–C pass locally and all automated checks are green. Azure
deployment is explicitly **not** required for completion (FR-019).
