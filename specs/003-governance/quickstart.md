# Quickstart & Validation: Phase 3 — Governance

Run guide proving governance works end-to-end locally. Builds on Phase 1 (auth/roles) and Phase 2
(catalog). Paths relative to the `kihub` repo root.

## Prerequisites

- Phase 1 + Phase 2 running locally (Node 22+, pnpm, Docker Postgres, `apps/web/.env`,
  `AI_ARTIFACTS_PATH` set, at least one artifact indexed — see Phase 2 quickstart).
- Mock personas covering all five roles for local sign-in (`AUTH_MODE=mock`) — Phase 3 extends the
  Phase 1 persona set (`reader`/`contributor`/`reviewer`/`approver`/`admin`) so each role can be
  exercised without a live Entra tenant.

## Setup

```bash
pnpm install
docker compose -f apps/web/docker-compose.yml up -d
pnpm --filter web dev    # http://localhost:3000
```

## Scenario A — Role-gated actions (User Story 1)

- Sign in as each persona in turn and open an indexed artifact's detail page.
  - **Reader**: sees the lifecycle badge and governance metadata, but no action controls.
    *(FR-002 scenario 1)*
  - **Contributor**: can edit owners/risk/notes and submit for review; cannot record a review
    decision or approve. *(FR-002 scenario 2)*
  - **Reviewer**: can record a typed review; cannot approve/reject or archive.
    *(FR-002 scenario 3)*
  - **Approver**: can approve/reject and set Approved/Recommended, plus everything a Reviewer can.
    *(FR-002 scenario 4)*
  - **Admin**: every action, plus archive and role management. *(FR-002 scenario 5)*
- Attempt an action above role directly (e.g. `curl`/Payload Local API call as a Reader
  attempting `transitionLifecycle`) → **Expect**: refused server-side, not just hidden in the UI
  (FR-003, SC-002).
- Automated: `pnpm --filter @kihub/governance-core test` (permission-matrix unit tests) and a
  Payload integration test exercising `access` functions per role × action.

## Scenario B — Governance metadata & lifecycle (User Story 2)

- Open a freshly indexed artifact that has never been governed → **Expect**: a sensible default
  (lifecycle from the manifest, or Draft; no reviews) with no error (edge case, FR-005).
- As a Contributor, set business/technical owner, risk level, and internal notes → **Expect**: the
  values persist and are attributed to the actor with a timestamp (FR-006, FR-012).
- As a Contributor then Approver, walk a valid transition path: Draft→Experimental→In
  Review→Approved→Recommended → **Expect**: each transition succeeds, the catalog listing and
  detail page reflect the new lifecycle/recommended state immediately (FR-011, SC-005).
- Attempt an invalid transition (e.g. Draft→Recommended directly) or a valid one above the actor's
  role → **Expect**: refused with a clear reason, no state change recorded (FR-008, SC-004).
- Re-run the Phase 2 indexer (`pnpm --filter web index`) → **Expect**: the governance record for
  that artifact is unchanged (FR-010, SC-003) — verified by the reconcile integration test
  asserting `catalog-entries` untouched.

## Scenario C — Reviews & approval workflow (User Story 3)

- As a Contributor, submit an artifact for review → **Expect**: review status becomes "in review"
  (FR-013).
- As a Reviewer, record one typed review (e.g. `security`) with a decision, comments, required
  changes, risk level, and an expiry date → **Expect**: saved, attributed, visible in the
  artifact's review history (FR-014/FR-015).
- As an Approver, approve → **Expect**: approval state becomes approved and the
  Approved/Recommended lifecycle transition is now permitted (FR-016/FR-017); reject a different
  artifact → **Expect**: it does not become approved and the reason is recorded.
- Record a review with an `expiryDate` in the past → **Expect**: the artifact detail page flags
  that review as expired/needing renewal (FR-018, SC-008).
- As a Reader, attempt to record a review or approve → **Expect**: refused (FR-020).
- Automated: `pnpm --filter web test` (Payload integration: submit → review → approve/reject,
  audit-log entries created for each step).

## Role administration check (FR-004)

- As Admin, open `(app)/admin/roles`, change another user's role, then have that user (already
  signed in) attempt an action newly permitted by the change → **Expect**: it succeeds immediately,
  no re-login required (research.md §2).

## Audit trail check (FR-012, FR-019, SC-006)

```bash
docker exec -e PGPASSWORD=kihub kihub-postgres psql -h 127.0.0.1 -U kihub -d kihub \
  -c "select action, actor_id, artifact_id, created_at from audit_log order by created_at desc limit 20;"
```

- **Expect**: one row per governance action performed above (metadata edit, transition, review,
  approval, role change), each with an actor and timestamp.

## Content-boundary check (Principle I & II)

```bash
docker exec -e PGPASSWORD=kihub kihub-postgres psql -h 127.0.0.1 -U kihub -d kihub -c '\d catalog_entries'
docker exec -e PGPASSWORD=kihub kihub-postgres psql -h 127.0.0.1 -U kihub -d kihub -c '\d reviews'
```

- **Expect**: only enterprise-context fields (owners, risk, lifecycle, review fields) — no
  artifact body/content field anywhere.
