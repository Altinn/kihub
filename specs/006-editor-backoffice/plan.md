# Implementation Plan: Phase 6 — Editor Back-Office

**Branch**: `feat/new-architecture` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-editor-backoffice/spec.md`

## Summary

Stand up the second surface required by Constitution Principle VIII: mount the Payload CMS admin as
the editor back-office. The heavy lifting is already done — Phase 1 built a custom Payload auth
strategy (`auth/payload-strategy.ts`) that bridges the Auth.js/Entra session into Payload (it already
recognizes the same user for admin/REST requests), and every collection already carries role-based
`access` rules. So this phase is mostly **routing + configuration + one access gate**: scaffold the
Payload `(payload)` route group (admin UI + Payload API), move the admin base path to **`/cms`** and
the Payload API base to a non-`/api` path so neither collides with the employee app's existing
routes (`/`, `/artifacts/*`, `/admin/roles`, `/admin/discovery`, `/signin`, `/api/auth`,
`/api/discovery`), and add an `admin` access function to the Users collection so only **Contributor+**
may enter (Reader/unauthenticated refused). Git-derived/system collections (`artifacts`,
`discovery-runs`, `audit-log`) are already read-only via their existing `access` rules, so Payload
renders them read-only for free (Principle I preserved); `catalog-entries`, `reviews`,
`discovery-sources`, and `users` (role Admin-only) stay editable per existing rules. No new
collection, field, datastore, or external service; the employee app is untouched.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ (unchanged).

**Primary Dependencies**:
- Next.js 16 (App Router) + Payload CMS 3.85 — already present; `next.config.mjs` already wraps with
  `withPayload`.
- `@payloadcms/next` — exports `./withPayload`, `./layouts`, `./views`, `./routes`, used to scaffold
  the `(payload)` route group (admin catch-all page + Payload REST/GraphQL route handlers).
- Existing `auth/payload-strategy.ts` (Auth.js→Payload bridge) and `@kihub/governance-core`
  (role/permission model) — reused unchanged.
- No new dependency.

**Storage**: PostgreSQL (unchanged). **No new collection or field.** The back-office is a new *view/
authoring surface* over the existing collections.

**Testing**: Vitest. Unit: the Users `access.admin` gate (Contributor+ allowed, Reader/anonymous
denied). Integration (Payload): confirm the read-only matrix holds via existing collection `access`
(artifacts/discovery-runs/audit-log reject writes even for an Admin; catalog-entries/reviews/
discovery-sources accept per role) — largely covered by existing `governance-access` / `discovery-access`
tests, extended where needed. Route/coexistence verified via quickstart (admin at `/cms`, employee
routes unaffected). Payload admin is a React SPA — its UI is validated in quickstart, not unit-tested.

**Target Platform**: Local dev (`AUTH_MODE=mock` — mock personas issue an Auth.js JWT, which the
Payload strategy reads via `getToken`, so the back-office works in mock mode too) and Azure (Entra).

**Project Type**: Web app monorepo — `apps/web` only. `packages/*` unchanged.

**Performance Goals**: None specific — the admin is Payload's own UI. No throughput target.

**Constraints**:
- Admin base path MUST NOT collide with any employee-app route — mount at `/cms`; Payload API at a
  non-`/api` base (e.g. `/payload-api`) so it can't clash with `/api/auth` or `/api/discovery`
  (FR-009, research §1/§2).
- Entry restricted to Contributor+ via `Users.access.admin`, enforced server-side; Reader/anonymous
  refused (FR-005/FR-007, research §3).
- Git-derived/system collections read-only in admin — satisfied by existing `access` rules; verified,
  not reimplemented (FR-006a, research §4, Principle I).
- Reuse the existing Auth.js→Payload session bridge; no second login, one session/role model
  (FR-003/FR-010).
- Back-office is EXEMPT from Designsystemet (Principle VIII, FR-011) — it is Payload's own admin UI.
- No new datastore/service; employee app behavior unchanged (FR-013).
- No News/Events collections and no admin customization this phase (FR-014).

**Scale/Scope**: Small internal editorial audience. One config change (`routes` + `admin`), one
`(payload)` route group (boilerplate re-exports), one `Users.access.admin` function, an import-map
generation step. No schema change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Constraint | Phase 6 compliance | Status |
|------------------------|--------------------|--------|
| I. Git is source of truth (AI artifacts) | Git-derived collections (`artifacts`, `discovery-runs`, `audit-log`) are read-only in the admin via existing access rules — no hand-edit path, so indexed metadata cannot drift from Git. No artifact bodies are stored. | ✅ PASS |
| II. Payload owns context & native content | The admin manages enterprise metadata + governance records (and, later, native News/Events). No boundary change. | ✅ PASS |
| III. Every AI asset is an Artifact | No change to the artifact model; no new AI asset handling. | ✅ PASS |
| IV. Stable artifact identity | Untouched — the admin surfaces existing records keyed as-is. | ✅ PASS |
| V. Git-centric, APM-compatible distribution | Untouched. | ✅ PASS |
| VI. Governance is the core value (Registry) | Governance/review actions now have a proper home (the admin), gated by the existing role model, enforced server-side. Reinforces governance. | ✅ PASS |
| VII. Start simple, design for growth | Simplest correct mount: reuse the existing auth bridge + existing access rules; only add routing/config + one gate. News/Events + admin polish deferred. | ✅ PASS |
| VIII. Two surfaces | This phase realises it — the editor back-office is the second surface, sharing one auth/role/data layer with the employee app. | ✅ PASS |
| Design System (employee app only) | Back-office is Payload's own admin UI — explicitly EXEMPT per Principle VIII; the employee app is unchanged and stays Designsystemet. | ✅ PASS |
| Auth (employees only, roles) | Reuses Entra + the five-role model; admin entry gated to Contributor+ server-side. | ✅ PASS |
| Testing gate | Access-gate unit test + read-only-matrix integration coverage; UI via quickstart. | ✅ PASS |
| Contract-first | The mount (route group + `routes` config) and the access matrix are documented in `contracts/`. No collection-shape change. | ✅ PASS |

**Result**: No violations. Complexity Tracking intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/006-editor-backoffice/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (no schema change — access matrix only)
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── admin-mount.md            # (payload) route group + routes.admin=/cms + routes.api base + config
│   └── admin-access.md           # Users.access.admin (Contributor+) + per-collection read-only/edit matrix
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/
  web/
    src/
      payload.config.ts             # CHANGED: routes:{ admin:'/cms', api:'/payload-api' }; admin.user stays Users
      collections/
        Users.ts                    # CHANGED: add access.admin = Contributor+ (server-side admin-panel gate)
        Artifact.ts                 # unchanged (already create/update/delete=false → read-only in admin)
        DiscoveryRun.ts / AuditLog.ts  # unchanged (already append-only/read-only)
        CatalogEntry.ts / Review.ts / DiscoverySource.ts  # unchanged (editable per existing role rules)
      app/
        (payload)/                  # NEW: Payload admin + API route group (boilerplate from @payloadcms/next)
          layout.tsx                #   RootLayout from @payloadcms/next/layouts + importMap + config
          cms/[[...segments]]/
            page.tsx                #   RootPage from @payloadcms/next/views (admin UI at /cms)
            not-found.tsx
          payload-api/[...slug]/route.ts        # Payload REST handlers (non-/api base)
          payload-api/graphql/route.ts          # GraphQL handler
          payload-api/graphql-playground/route.ts
          custom.scss               #   (optional) admin styling hook
          importMap.js              #   generated via `pnpm --filter web generate:importmap`
        (app)/                      # unchanged — employee app (catalog, search, /admin/roles, /admin/discovery)
    tests/
      unit/
        admin-access.test.ts        # NEW: Users.access.admin → Contributor+ allowed, Reader/anon denied
      integration/
        admin-readonly.test.ts      # NEW/extend: artifacts/discovery-runs/audit-log reject writes; editable ones accept per role
```

**Structure Decision**: Keep the two surfaces as two route groups in the one `apps/web` app:
`(app)` (employee, Designsystemet, unchanged) and a new `(payload)` (admin, Payload's own UI). The
admin is mounted at `/cms` and its API at `/payload-api` via `config.routes`, so nothing collides
with the existing `(app)` routes or the existing `/api/auth` + `/api/discovery` handlers. The
Auth.js→Payload bridge (`auth/payload-strategy.ts`) and every collection's `access` rules are reused
**unchanged** — the only code additions are the boilerplate route-group files, the `routes` config,
and one `Users.access.admin` gate. This is why the phase is small: Phase 1 already made Payload
recognize the Entra session, and Phases 2-4 already encoded the per-collection access rules the admin
enforces.

## Complexity Tracking

> No constitution violations — section intentionally empty.
