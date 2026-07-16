# Phase 0 Research: Editor Back-Office

Resolves the Technical Context decisions for Phase 6. The phase is deliberately small: Phase 1
already bridges the Auth.js/Entra session into Payload, and Phases 2-4 already encode per-collection
`access` rules, so this is mostly routing + configuration + one access gate. Every choice favors the
simplest correct mount (Principle VII) that satisfies Principle VIII.

## §1 — Mounting the admin on a non-colliding path (`/cms`)

**Decision**: Scaffold the Payload `(payload)` Next.js route group and set the admin base path to
**`/cms`** via `config.routes.admin = '/cms'`. The admin catch-all page lives at
`app/(payload)/cms/[[...segments]]/page.tsx` (re-exporting `RootPage` from `@payloadcms/next/views`),
with `app/(payload)/layout.tsx` re-exporting `RootLayout` from `@payloadcms/next/layouts` and wiring
the generated `importMap`. The folder path under `(payload)` MUST match the configured `routes.admin`
value (`/cms`), per Payload's guidance that changing `admin.routes`/`routes.admin` requires renaming
the corresponding directories.

**Rationale**: The employee app already owns `/admin/roles` and `/admin/discovery` (custom
Designsystemet pages under `(app)`), so Payload's default `/admin` would collide. `/cms` is a clear,
collision-free base that reads as "the CMS/back-office". `@payloadcms/next` provides the layout/views,
so the route group is boilerplate re-exports, not custom UI (consistent with the Designsystemet
exemption — Principle VIII). Route groups (`()`) don't affect the URL, so `(app)` and `(payload)`
coexist cleanly.

**Alternatives considered**: Keep Payload admin at `/admin` and move the app's `/admin/roles` +
`/admin/discovery` elsewhere — rejected: changes existing employee-app routes (regression risk,
referenced by tests/docs) and the spec forbids changing the employee app. A separate app/deployment
for the admin — rejected: Payload admin is embedded in this Next app by design (`withPayload`), and a
split would break the shared session.

## §2 — Payload API base path (avoid `/api` collision)

**Decision**: Set `config.routes.api` to a non-`/api` base — **`/payload-api`** — with the Payload
REST/GraphQL handlers at `app/(payload)/payload-api/[...slug]/route.ts` and
`.../payload-api/graphql/route.ts`. This keeps Payload's API entirely clear of the employee app's
existing `/api/auth/[...nextauth]` and `/api/discovery/*` handlers.

**Rationale**: Payload's default API is an `/api` catch-all (`[...slug]`). The app already serves
`/api/auth` (Auth.js) and `/api/discovery` (webhook + scan). While Next.js segment precedence *might*
let a catch-all coexist with more-specific routes, two route trees both claiming `/api` is fragile and
risks build-time or runtime conflicts. Moving Payload's API to a distinct base removes the ambiguity
entirely for near-zero cost, and `config.routes.api` keeps the admin UI and API consistent with each
other. The Auth.js→Payload bridge does not depend on Payload's login endpoint (it reads the session
cookie directly), so relocating the Payload API has no auth impact.

**Alternatives considered**: Leave Payload API at `/api` and rely on Next precedence — rejected as
fragile. Move the app's `/api/*` routes instead — rejected: changes existing employee-app/API
surface.

## §3 — Admin-panel entry gate (Contributor+)

**Decision**: Add an `access.admin` function to the Users collection returning **Contributor and
above**: `({ req }) => Boolean(req.user) && (req.user.role as Role) !== 'reader'`. Payload calls this
to decide whether a signed-in user may load the admin panel; Reader and unauthenticated requests are
refused. This is enforced server-side by Payload, in addition to the per-collection `access` rules
that already gate every action.

**Rationale**: `CollectionConfig.access.admin` is Payload's built-in admin-panel gate — exactly the
right hook, no custom middleware. Contributor+ is required (clarification) because Reviewers and
Approvers must enter to perform governance actions and Contributors to edit metadata/submit; Reader is
the baseline browse-only employee and stays out. Reusing the existing `Role` model keeps one
authorization source. In mock mode the mock persona still issues an Auth.js JWT, which the Payload
strategy reads, so the gate behaves identically locally.

**Alternatives considered**: Admin-only entry (rejected — blocks Reviewer/Approver governance work in
the admin, contradicting the phase intent). A brand-new "editor" role (rejected — the five-role model
already covers it; a new role is deferred until News/Events authoring needs finer distinctions).
Gating only in the UI (rejected — must be server-side, FR-007).

## §4 — Read-only Git-derived collections (already satisfied)

**Decision**: Rely on the **existing** collection `access` rules to make Git-derived/system
collections read-only in the admin — no new code:
- `artifacts` — already `create/update/delete: () => false` (indexer writes via `overrideAccess`).
- `discovery-runs` — already `create` server-side only, `update/delete: false` (append-only).
- `audit-log` — already server-side `create` only, `update/delete: false` (immutable).
Editable per existing role rules: `catalog-entries`, `reviews`, `discovery-sources`, and `users`
(role change Admin-only). Payload's admin honors these `access` functions and renders disallowed
collections/actions as read-only automatically.

**Rationale**: The read-only requirement (FR-006a, Principle I) is already true by construction —
Payload's admin respects the same `access` the REST API does, so a hand-edit of indexed technical
metadata is simply not offered/allowed. This is verified by an integration test rather than
implemented anew. (Optionally, `admin.hidden`/read-view hints can polish the UX, but the security
guarantee comes from `access`.)

**Alternatives considered**: Re-implementing read-only via `admin.readOnly` field flags — unnecessary
and weaker than `access` (UI hint vs enforced). Hiding system collections entirely — rejected
(clarification chose read-only visibility, not hiding, so Admins retain audit/run insight).

## §5 — Import map & build wiring

**Decision**: Generate the admin import map with the existing `pnpm --filter web generate:importmap`
script (Payload emits `app/(payload)/…/importMap.js`), referenced by the `(payload)/layout.tsx`.
`next.config.mjs` already wraps `withPayload`, so no build-config change is needed beyond the route
group and `routes` config. Regenerate the import map whenever admin-registered components change.

**Rationale**: The import map is Payload's mechanism for the admin to load (custom) components; it is
required for the admin bundle to build. The script already exists in `package.json`; wiring it is a
one-time scaffold step.

**Alternatives considered**: Hand-maintaining the import map — rejected (generated artifact).

## Resolved unknowns

All Technical Context items are resolved; no `NEEDS CLARIFICATION` remain. Phase 6 adds: a `(payload)`
route group (boilerplate), `config.routes.admin='/cms'` + `config.routes.api='/payload-api'`, one
`Users.access.admin` gate, and an import-map generation step — reusing the Phase 1 Auth.js→Payload
bridge and the existing per-collection access rules unchanged. No schema change, no new datastore, no
new dependency; the employee app is untouched.
