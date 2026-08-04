# Runtime configuration contract

Every environment variable the web app (`apps/web`) reads at runtime. This is the complete
contract the container image (`apps/web/Dockerfile`, published as `ghcr.io/altinn/kihub-web`)
is configured with — Azure Container Apps sets these; local dev uses `apps/web/.env`
(template: `apps/web/.env.example`).

## Database

| Variable | Required | Values / example | Notes |
|---|---|---|---|
| `DATABASE_URI` | yes | `postgres://kihub:kihub@localhost:55432/kihub` | node-postgres connection string. In `entra` mode: **no password**, and keep `sslmode=require` (Azure PG requires TLS), e.g. `postgres://<identity-name>@<server>.postgres.database.azure.com:5432/kihub?sslmode=require`. |
| `DB_AUTH_MODE` | no (default `password`) | `password` \| `entra` | `password`: credentials live in `DATABASE_URI` (local docker-compose). `entra`: the pool fetches a per-connection token for `https://ossrdbms-aad.database.windows.net/.default` via `DefaultAzureCredential` (managed identity on ACA). See `apps/web/src/lib/db-auth.ts`. |

## Payload

| Variable | Required | Notes |
|---|---|---|
| `PAYLOAD_SECRET` | yes | Payload's encryption/signing secret. Any long random string; production value is an ACA secret. |

## Auth (Auth.js v5 + Entra)

| Variable | Required | Values / example | Notes |
|---|---|---|---|
| `AUTH_SECRET` | yes | long random string | Session/JWT signing secret. |
| `AUTH_MODE` | yes in prod | `mock` \| `entra` | `mock` is dev-only — `src/auth/config.ts` **refuses `mock` when `NODE_ENV=production`**. Production: `entra`. |
| `ORG_TENANT_ID` | yes | tenant GUID | Employee gate rejects sign-ins from other tenants. |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | with `entra` | app registration client id | |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | with `entra` | client secret | ACA secret. |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | with `entra` | `https://login.microsoftonline.com/<tenant-id>/v2.0` | |
| `AUTH_TRUST_HOST` | yes in prod | `true` | Auth.js runs behind ACA's ingress proxy and must trust `x-forwarded-*` to build callback URLs. Read directly by Auth.js (not in app code). |

## Discovery (Phase 4 module)

| Variable | Required | Notes |
|---|---|---|
| `DISCOVERY_SCAN_KEY` | for scheduled scans | Shared secret the external scheduler sends as `X-Discovery-Scan-Key` to `POST /api/discovery/scan`. |
| `GITHUB_TOKEN_AI_ARTIFACTS` | per discovery source | Each `discovery-sources` record names the env var holding its GitHub token via `tokenEnvVar` — `GITHUB_TOKEN_AI_ARTIFACTS` is the conventional one. Tokens are never stored in the DB. |

Webhook HMAC secrets are per-source database fields (hidden, Admin-only), not env vars.

## Dev/tooling only (not set in the container)

| Variable | Used by |
|---|---|
| `AI_ARTIFACTS_PATH` | `pnpm --filter web index` — break-glass local indexer (Phase 2 fallback). |
| `DISCOVERY_SCAN_URL` | `pnpm --filter web discovery:scan` — helper script for triggering the scan endpoint; belongs to the scheduler's environment, not the app's. |

Set by the image itself: `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0`.
There are currently **no `NEXT_PUBLIC_*` variables** — nothing is baked in at build time, so
one image serves any environment.

## Database migrations (the rule since Phase B)

The repo previously ran on Payload dev push-mode with no committed migrations. Since the
baseline migration (`apps/web/src/migrations/20260804_085101_baseline.ts`):

- **Every schema change ships a migration** in the same PR:
  `pnpm --filter web migrate:create <name>` (requires the local DB up). Dev push-mode stays
  for local iteration only.
- Production runs migrations **automatically at container boot**: the committed migrations are
  bundled into the build via `prodMigrations` in `payload.config.ts`, and
  `src/instrumentation.ts` initializes Payload while the server starts (`NODE_ENV=production`
  only) — so pending migrations complete before traffic, and a failed migration fails the boot.
  The image contains no Payload CLI; `payload migrate` is for local/CI use
  (`pnpm --filter web migrate`).
- CI proves the path on every push: the workflow runs `migrate` against an empty Postgres
  service container before the test suite.
