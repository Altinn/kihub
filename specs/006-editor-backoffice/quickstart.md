# Quickstart: Editor Back-Office (validation guide)

Proves Phase 6 end-to-end: the Payload admin is mounted at `/cms`, gated to Contributor+, exposes the
existing collections with the correct read-only/editable split, and the employee app is unaffected.
Assumes Phases 1-5 running locally (`AUTH_MODE=mock`) with a seeded catalog.

## Prerequisites

- `apps/web` dev server running against local Postgres (Phases 1-5 setup).
- Import map generated: `pnpm --filter web generate:importmap`.
- **No new datastore, env, or external service** — reuses the existing database + auth (FR-013, SC-006).

## Scenario 1 — Authorized entry & editing (US1, FR-001/002/004)

1. Sign in via `/signin` as **Aria Admin** (or any Contributor+ persona), then open `http://localhost:3000/cms`.
2. **Expect**: the Payload admin loads and lists the existing collections; the seeded artifacts,
   governance records, reviews, sources, and runs are visible (no migration).
3. Open a **`catalog-entries`** (governance) record, change a field (e.g. risk level or notes), Save.
4. **Expect**: the change persists and is reflected in the employee app's artifact detail page.

## Scenario 2 — Role gate (US2, FR-005/007, SC-002)

1. Sign in as **Ada Employee (Reader)** and navigate to `/cms`.
2. **Expect**: refused (no back-office access) — not a partial admin.
3. In a signed-out session, request `/cms` directly.
4. **Expect**: redirected to sign-in; no data exposed.

## Scenario 3 — Read-only Git-derived collections (FR-006a, Principle I, SC-005)

1. As **Admin** in `/cms`, open the **`artifacts`** collection and a record.
2. **Expect**: it is read-only — no editable technical-metadata fields / no working save (create/
   update/delete are not permitted). Same for **`discovery-runs`** and **`audit-log`**.
3. **Expect**: `catalog-entries`, `reviews`, and `discovery-sources` remain editable per your role.
4. Open a `discovery-sources` record → the webhook secret / token material is not shown.

## Scenario 4 — Two surfaces coexist (US3, FR-009/010, SC-003/004)

1. With `/cms` mounted, visit the employee app: `/` (catalog + search), an artifact detail page,
   `/admin/roles`, and `/admin/discovery`.
2. **Expect**: all work exactly as before — no route shadowed, no regression.
3. Confirm `/api/auth/*` and `/api/discovery/*` still respond (Payload API is at `/payload-api`).
4. In one signed-in session, move between the employee app and `/cms`.
5. **Expect**: the same identity/role applies on both (one session/role model).

## Automated checks

- Unit: `pnpm --filter web test` — `admin-access.test.ts`: `access.admin` predicate allows
  Contributor+ and denies Reader/anonymous.
- Integration: `admin-readonly.test.ts` — writes to `artifacts`/`discovery-runs`/`audit-log` rejected
  (read-only), permitted writes to `catalog-entries`/`reviews`/`discovery-sources` succeed. Existing
  `governance-access`, `discovery-access`, `route-protection`, and the Phase 5 `search` suites remain
  green (no regression).

## Boundary & infra (Principles I/VIII, SC-005/SC-006)

- The back-office manages metadata/governance/native content only — no AI-artifact bodies stored.
- No new datastore or external service; the admin is Payload's own UI (exempt from Designsystemet)
  embedded in the existing app.
