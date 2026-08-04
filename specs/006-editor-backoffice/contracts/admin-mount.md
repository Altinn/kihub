# Contract: Mounting the Payload admin (route group + config)

How the back-office surface is mounted without colliding with the employee app. Lives in
`apps/web/src/payload.config.ts` and a new `app/(payload)/` route group. Uses `@payloadcms/next`
building blocks — no custom admin UI (Principle VIII exemption).

## `payload.config.ts` changes

```ts
export default buildConfig({
  admin: { user: Users.slug },          // unchanged: Users is the auth/admin collection
  routes: {
    admin: '/cms',                       // back-office base path (was default /admin — collides)
    api: '/payload-api',                 // Payload REST base (avoid the app's /api/auth, /api/discovery)
    // graphQL defaults under the api base
  },
  // collections, db, editor, secret … unchanged
});
```

- `admin.user` stays `Users.slug`; the Auth.js→Payload strategy on the Users collection is unchanged.
- Only `routes` is added. No collection-shape change.

## `(payload)` route group (boilerplate from `@payloadcms/next`)

The folder paths MUST match the configured routes:

```text
app/(payload)/
  layout.tsx                             # export { default } patterns → RootLayout (@payloadcms/next/layouts)
  cms/[[...segments]]/
    page.tsx                             # → RootPage (@payloadcms/next/views); admin UI at /cms
    not-found.tsx                        # → NotFoundPage
  payload-api/[...slug]/route.ts         # → REST handlers (@payloadcms/next/routes)
  payload-api/graphql/route.ts           # → GraphQL handler
  payload-api/graphql-playground/route.ts
  custom.scss                            # optional admin style hook
  importMap.js                           # generated
```

- These files are thin re-exports/wiring of `@payloadcms/next` exports (`./layouts`, `./views`,
  `./routes`) + the app's `@payload-config`. No bespoke React.
- Generate the import map: `pnpm --filter web generate:importmap` (writes `importMap.js`).
- Route groups `()` do not affect URLs, so `(payload)` and `(app)` coexist; the admin resolves at
  `/cms`, the Payload API at `/payload-api`.

## Non-collision guarantee (FR-009/FR-010)

Employee-app routes that MUST remain intact and unshadowed:

| Path | Owner | Status |
|------|-------|--------|
| `/`, `/artifacts/*` | `(app)` catalog + detail | unchanged |
| `/admin/roles`, `/admin/discovery` | `(app)` custom admin pages | unchanged (NOT under `/cms`) |
| `/signin` | `(auth)` | unchanged |
| `/api/auth/*`, `/api/discovery/*` | app API routes | unchanged (Payload API is at `/payload-api`) |
| `/cms`, `/cms/*` | `(payload)` admin UI | NEW |
| `/payload-api/*` | `(payload)` Payload REST/GraphQL | NEW |

## Observable outcomes

| Situation | Expected |
|-----------|----------|
| Visit `/cms` (authorized) | Payload admin loads (after sign-in) |
| Visit `/admin/roles`, `/admin/discovery`, `/`, `/artifacts/*` | Work exactly as before (no shadowing) |
| Any `/api/auth/*`, `/api/discovery/*` request | Handled by the app as before |
| Build | No route conflict; one Next app serves both surfaces |
