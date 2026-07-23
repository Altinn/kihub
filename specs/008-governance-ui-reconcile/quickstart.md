# Quickstart: Governance-UI Reconcile (validation guide)

Proves the reconcile end-to-end: the employee artifact detail page shows governance state read-only
for **every** role, `/cms` remains the fully working (and only) action surface, and the automated
suite is untouched and green. Assumes local Postgres (docker `kihub-postgres` on 55432) and
`AUTH_MODE=mock` with the `/signin` personas.

## Prerequisites

- `apps/web` dev server running. If the catalog is empty (the integration suite wipes artifacts),
  re-seed first: `pnpm --filter web index`.
- No new env, datastore, dependency, or migration — this feature only removes code.

## Scenario 1 — Read-only for every role (US1, FR-001/002/003, SC-001)

1. Sign in via `/signin` as **Ada Employee (Reader)**; open an artifact's detail page.
2. **Expect**: a Governance section showing lifecycle state, review status, approval state, business/
   technical owner, risk level, the reviews list, and the audit history — with **no** form fields,
   no Save/Submit/Move/Approve/Reject buttons, and no review form. No internal notes, no featured flag.
3. Repeat as **Cara Contributor**, **Rita Reviewer**, **Aksel Approver**, and **Aria Admin**.
4. **Expect**: byte-identical governance panel for all five — role no longer changes the employee view.

## Scenario 2 — Actions still work in the back-office (US2, FR-005, SC-002)

1. As **Aria Admin**, open `http://localhost:3000/cms` → **Catalog Entries** → the entry for a
   seeded artifact (create it there if none exists).
2. Edit business owner / risk level; save. Perform a **valid** lifecycle transition (e.g. Draft →
   Experimental); save. **Expect**: both succeed.
3. Attempt an **invalid** transition (e.g. Draft → Recommended). **Expect**: rejected by the
   transition-guard hook with a validation error (server-side FSM unchanged).
4. In **Reviews**, create a typed review for the same artifact (type, decision, expiry). **Expect**:
   saves successfully.
5. Back in the employee app, reload the artifact detail page. **Expect**: the edited owner/risk, the
   new lifecycle state, and the new review all appear — read-only.
6. **Expect**: the audit history shows the transition/metadata actions (audit hooks unchanged).

## Scenario 3 — Never-governed artifact (edge case, FR-007)

1. As any persona, open the detail page of a freshly indexed artifact with no catalog entry.
2. **Expect**: the read-only panel renders computed defaults (initial lifecycle state, "—" owners,
   empty reviews/audit) — no error, and no governance record is created by viewing.

## Scenario 4 — No write path left (US3, FR-004, SC-005)

1. `grep -rn "governance-actions" apps/web/src` → **no matches**; `ReviewForm` → **no matches**;
   `updateGovernanceMetadata|submitForReview|transitionLifecycle|recordReview|decideApproval` in
   `apps/web/src` → **no matches**.
2. `packages/governance-core` and `apps/web/src/collections/` show **no diff** on this feature.

## Automated checks (US3, SC-004)

From `apps/web` (integration tests need the local Postgres):

```bash
set -a; . ./.env; set +a; NODE_OPTIONS=--no-deprecation npx vitest run
```

**Expect**: full suite green (82/82 across 20 files — unchanged; `governance-access` and
`review-approval-flow` pass as-is since they exercise the Payload local API, not the removed UI).

```bash
npx tsc --noEmit
```

```bash
pnpm -r lint
```

**Expect**: both clean — proves the deletion left no dangling imports/references.

## Boundary (Principles VI/VII/VIII)

- Employee app: governance **state** only, read-only, Designsystemet, identical across roles.
- Back-office: the sole surface for governance **actions**, unchanged from Phase 6.
- Server-side rules, guard, audit hooks, `@kihub/governance-core`: untouched.
