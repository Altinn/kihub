# Quickstart & Validation: Phase 2 — Catalog

Run guide proving the catalog works end-to-end locally. Builds on the Phase 1 setup. Paths relative
to the `kihub` repo root.

## Prerequisites

- Phase 1 running locally (Node 22+, pnpm, Docker Postgres on host port 55432, `apps/web/.env`).
- A local checkout of the sibling `ai-artifacts` repo (the Phase 1 seed at `../ai-artifacts`).
- `AI_ARTIFACTS_PATH` set to that checkout (add to `apps/web/.env`, e.g. `AI_ARTIFACTS_PATH=../ai-artifacts`).

## Setup

```bash
pnpm install
docker compose -f apps/web/docker-compose.yml up -d   # local Postgres (from Phase 1)
```

## Scenario A — Index artifacts (User Story 1)

```bash
AI_ARTIFACTS_PATH=../ai-artifacts pnpm --filter web index
```

- **Expect**: a report creating one record per seeded artifact (`digdir.security-review`,
  `digdir.code-review`, `digdir.lovdata-mcp`), each with type/name/version/source/install command.
  *(FR-001..FR-004, SC-001)*
- Edit an artifact (e.g. bump a version) and add a temporary invalid manifest, then re-run:
  **Expect** the edited record updated in place (no duplicate), the invalid one skipped+reported,
  and — after removing an artifact and re-running — that record deactivated (absent from listing).
  *(FR-005, FR-002, SC-002, SC-003)*
- Automated: `pnpm --filter web test` (reconcile integration) and
  `pnpm --filter @kihub/discovery-core test` (scan/record/reconcile units).

## Scenario B — Browse & filter (User Story 2)

```bash
pnpm --filter web dev    # http://localhost:3000  (sign in as the mock `member` persona)
```

- **Expect**: the catalog lists all active artifacts with name/type/description. *(FR-009)*
- Apply `?type=skill`, then a tag filter, then a category filter, then a combination →
  **Expect** the listing narrows to matching artifacts; a no-match combination shows an empty state.
  *(FR-010..FR-014, SC-007)*
- Sign out / open unauthenticated → redirected to sign-in. *(FR-015, SC-008)*

## Scenario C — Artifact detail (User Story 3)

- From the listing, open `digdir.security-review` →
  **Expect**: metadata (identity/type/owner/tags/visibility/lifecycle), the README rendered
  readably, the current version, and a copyable `apm install digdir/security-review`. *(FR-016..FR-018, SC-005)*
- Visit `/artifacts/does.not-exist` → **Expect** a not-found state (not a broken page). *(FR-019)*

## Content-boundary check (SC-006)

```bash
# Inspect stored records — only metadata + README snapshot, no artifact bodies
docker exec -e PGPASSWORD=kihub kihub-postgres psql -h 127.0.0.1 -U kihub -d kihub -c '\d artifacts'
```

## Done / acceptance

Phase 2 is complete when Scenarios A–C pass locally and all automated tests are green. Azure
deployment, automated indexing, governance workflows, and semantic search remain out of scope.
