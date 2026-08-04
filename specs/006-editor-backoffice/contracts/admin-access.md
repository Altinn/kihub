# Contract: Back-office access & read-only matrix

Who may enter the back-office and what each role may change — enforced server-side by Payload,
reusing the existing role model and per-collection `access` rules. Lives in
`apps/web/src/collections/Users.ts` (one added function) + the existing collection access rules.

## Admin-panel entry gate (`Users.access.admin`)

```ts
// collections/Users.ts — access
admin: ({ req }) => Boolean(req.user) && (req.user.role as Role) !== 'reader',
```

- Payload calls `access.admin` on the `admin.user` collection to decide whether a signed-in user may
  load the back-office. Contributor/Reviewer/Approver/Admin → allowed; Reader → refused;
  unauthenticated → refused (redirected to sign-in) (FR-005/FR-007).
- Enforced server-side (not a UI hint). Reused `Role` from `@kihub/governance-core`.
- Mock mode: the mock persona issues an Auth.js JWT read by the existing Payload strategy, so the
  gate behaves identically locally.

## Per-collection action matrix (existing `access`, unchanged)

| Collection | Read | Create/Update/Delete | Source of rule |
|------------|------|----------------------|----------------|
| `artifacts` | authed | **none** (read-only) | Phase 2 `access` (`false`) |
| `discovery-runs` | Admin | **none** (append-only) | Phase 4 `access` |
| `audit-log` | authed | **none** (immutable) | Phase 3 `access` |
| `catalog-entries` | authed | Contributor+ (lifecycle via transition matrix) | Phase 3 |
| `reviews` | authed | Reviewer+ | Phase 3 |
| `discovery-sources` | Admin | Admin (secrets hidden) | Phase 4 |
| `users` | per rule | self (non-role); role → Admin only | Phase 3 |

## Invariants

- **Server-side enforcement**: bypassing an admin UI control cannot perform an unpermitted action —
  the same `access` functions guard the REST/GraphQL API the admin uses (FR-007).
- **Principle I**: no hand-edit path for Git-derived/system collections; indexed metadata cannot
  drift from Git (FR-006a).
- **One authorization source**: both surfaces use the same `Role` + `access` rules; no parallel model
  (FR-010).
- **Secrets**: `discovery-sources` secret/token material stays excluded from read responses in the
  admin too (Phase 4 rules).

## Tests

- `tests/unit/admin-access.test.ts`: the `access.admin` predicate → `contributor|reviewer|approver|
  admin` ⇒ true; `reader` ⇒ false; no user ⇒ false.
- `tests/integration/admin-readonly.test.ts` (new or extending `governance-access`/`discovery-access`):
  with an Admin `req.user`, a write to `artifacts`/`discovery-runs`/`audit-log` is rejected, while a
  permitted write to `catalog-entries`/`reviews`/`discovery-sources` succeeds — proving the read-only
  matrix holds via `access`.

## Observable outcomes (map to FR-005..FR-008, FR-010, FR-012)

| Situation | Expected |
|-----------|----------|
| Reader / anonymous opens `/cms` | Refused / redirected to sign-in (FR-005) |
| Contributor+ opens `/cms` | Enters; sees collections scoped to role (FR-006) |
| Any role attempts a write it can't do (UI bypassed) | Refused server-side (FR-007) |
| Editing `artifacts` in admin | Not offered / rejected — read-only (FR-006a) |
| Editing `catalog-entries`/`reviews` per role | Allowed and persisted (FR-004) |
| Governance edit in admin | Attributed to the acting user (existing audit hooks) (FR-008) |
