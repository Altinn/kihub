# Phase 6 Data Model

Phase 6 adds **no new collection and no new field**. It mounts the Payload admin as a new *surface*
over the existing collections and adds one access gate. This document records the access/edit matrix
the back-office enforces (all via existing collection `access` rules, reused unchanged), plus the one
change to the Users collection.

## Change: `Users.access.admin` (admin-panel entry gate)

One added access function on the existing `users` collection — no field change:

| Access hook | Rule | Effect |
|-------------|------|--------|
| `access.admin` | `({ req }) => Boolean(req.user) && req.user.role !== 'reader'` | Only Contributor+ may load the back-office; Reader and unauthenticated are refused (FR-005). Enforced server-side by Payload. |

All other `users` access rules are unchanged (self-update; role change Admin-only via existing
`access.update` + `beforeChange` guard).

## Back-office collection matrix (existing `access`, reused unchanged)

| Collection | In back-office | Enforced by (existing rule) |
|------------|----------------|------------------------------|
| `artifacts` | **Read-only** (view) | `create/update/delete: () => false` (reconcile-owned; Principle I) |
| `discovery-runs` | **Read-only** (view, Admin) | append-only: server-side `create`, `update/delete: false` |
| `audit-log` | **Read-only** (view) | immutable: server-side `create`, `update/delete: false` |
| `catalog-entries` | **Editable** per role | Phase 3 rules (Contributor+ non-lifecycle; lifecycle via transition matrix) |
| `reviews` | **Editable** per role | Phase 3 rules (Reviewer+ create/update) |
| `discovery-sources` | **Editable** (Admin) | Phase 4 rules (Admin create/update/delete; secrets hidden) |
| `users` | **Editable** (self; role Admin-only) | Phase 3 rules (self non-role; role change Admin-only) |

**Key invariant (Principle I)**: Git-derived/system collections offer no hand-edit path in the admin
— Payload honors the same `access` functions the REST API uses, so indexed technical metadata cannot
drift from Git or be silently overwritten by the next reconcile. This is verified by an integration
test; it is not newly implemented.

**Secrets**: `discovery-sources.webhookSecret` and token material remain excluded from read
responses (Phase 4 `admin.hidden` + access), so they are not exposed in the admin either.

## Reused / unchanged entities

- **All seven collections** (`users`, `artifacts`, `catalog-entries`, `reviews`, `audit-log`,
  `discovery-sources`, `discovery-runs`) — shapes and access rules unchanged except the added
  `Users.access.admin`.
- **Auth.js → Payload bridge** (`auth/payload-strategy.ts`, Phase 1) — reused unchanged; it already
  authenticates admin/REST requests from the shared session.
- **Role model** (`@kihub/governance-core`) — reused unchanged; governs both surfaces.

## Configuration (not data)

- `config.routes.admin = '/cms'`, `config.routes.api = '/payload-api'` (research §1/§2) — routing
  configuration in `payload.config.ts`, not schema.
- No migration: no table/column changes.
