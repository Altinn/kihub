# KI Hub production deployment plan (Phases A–C)

**Status**: agreed 2026-08-04, not yet executed. Run one phase per session, in order.
**Owner**: Adi (adi.dahl@digdir.no) — repo admin on `Altinn/kihub`, Azure subscription
`Altinn-KITT-TestDev` (`a21239a6-9327-4f19-8829-f50b76429206`, tenant ai-dev.no).

## Decisions already made (do not re-litigate in the phase sessions)

- **No staging.** Development and testing are local; CI tests are the only gate; push to `main`
  deploys production. Small internal app — acceptable blast radius.
- **The old Astro site stays deployed and frozen.** `swa-kihub` (Azure Static Web App, Free, in
  `rg-kihub-swa`) keeps serving its last build. We delete its code and workflows from the repo but
  NEVER touch the Azure resource. Consequence (accepted): the old site can't be updated again
  without restoring code from git history.
- **Container image**: `ghcr.io/altinn/kihub-web`, **public** (explicit decision — repo is public
  anyway). Built by GitHub Actions with `permissions: packages: write`. The Altinn org publishes
  ~30 ghcr packages already; if the very first push is refused by an org restriction, ask an org
  admin to allow package creation for `Altinn/kihub` — that's the only external dependency.
- **Interim production runs in our own subscription** (platform team has no capacity), but shaped
  for a later port to the dis-core golden path (AKS namespace `product-kihub`, Flux/GitOps,
  self-service operators, APIM). Portability requirements: one container image on ghcr, strict
  env-var config contract, committed DB migrations, Entra everywhere (login, DB auth via token,
  managed identity). What we deliberately do NOT build interim: Flux manifests, APIM, Key Vault
  operators, Blob (the app needs no Blob today — news images are URL strings).
- **Hosting**: Azure Container Apps (consumption) + Azure PostgreSQL Flexible Server (burstable
  B1ms) with **Entra (passwordless) DB auth** — matches the platform's golden path ("the one
  design point worth confirming"; node-postgres supports an async `password` callback, so the app
  fetches an Entra token per connection via `DefaultAzureCredential`). Local dev keeps
  password-auth docker-compose Postgres.
- **In-app OIDC stays** (Auth.js + Entra + employee gate + 5 roles from groups); fine behind APIM
  later.

Constitution: `.specify/memory/constitution.md` v3.0.0 (deployment target it prescribes: Container
Apps / App Service → Next.js + Payload → Azure PostgreSQL). CLAUDE.md points at the active spec.

---

## Phase A — Repo consolidation (merge to main, drop old code, freeze SWA)

Pure git/repo work. No Azure, no new code.

**Prompt to start the session:**

> Execute Phase A of documentation/deployment-plan.md (read it first): consolidate the repo so
> `main` becomes the new-architecture app.
>
> 1. Inventory `origin/main`'s top level first. It contains the OLD repo: the Astro site
>    (`website/`), plus `cookbook/`, `workflows/`, `docs/`, agentic-workflow files and many
>    workflows under `.github/workflows/`. Present me the inventory grouped as
>    KEEP / DROP / UNSURE before touching anything — I will confirm what beyond the Astro site
>    gets dropped. Default assumptions: DROP `website/`, `.github/workflows/deploy-azure-static-web-app.yml`,
>    `.github/workflows/deploy-website.yml` and anything that exists solely to build/validate the
>    old site; UNSURE for cookbook/workflows/learning-hub content.
> 2. Merge `feat/new-architecture` into `main` taking the new architecture wholesale (histories
>    may have diverged badly; prefer a merge that keeps both histories but resolves content in
>    favor of the branch, e.g. `git merge -X theirs` or checkout-from-branch + commit, whichever
>    yields a reviewable result). The confirmed DROP list is deleted in the same or a follow-up
>    commit.
> 3. Do NOT touch anything in Azure. The Static Web App `swa-kihub` in `rg-kihub-swa` must keep
>    serving the old site (deleting its workflow freezes it — that is intended).
> 4. Verify afterwards: `pnpm install && pnpm --filter web test && pnpm --filter web lint` green
>    on `main` (local Postgres via colima + `docker compose -f apps/web/docker-compose.yml up -d`);
>    CLAUDE.md SPECKIT block still correct; no workflow on `main` references the deleted paths.
> 5. Push `main` only after I confirm the inventory decisions and the merge result.

**Acceptance**: `main` == new architecture + agreed keepers; suite green on `main`; old site still
up at its azurestaticapps.net URL; no CI failures on push.

---

## Phase B — Productionize the app (image, migrations, passwordless DB, CI)

Code + CI work, still no Azure resources. Can be run as a Spec Kit feature (`/speckit-specify`)
or directly — author's choice; it touches runtime behavior, so tests are mandatory either way.

**Prompt to start the session:**

> Execute Phase B of documentation/deployment-plan.md (read it first): make the app deployable as
> a container with proper migrations and CI. Repo `Altinn/kihub`, app in `apps/web` (Next.js 16 +
> Payload 3.85 + pnpm workspace).
>
> 1. **Dockerfile** at `apps/web/Dockerfile`: multi-stage, pnpm workspace-aware (the app depends
>    on `packages/*`), Next.js `output: 'standalone'`, includes `sharp`, runs as non-root, and the
>    entrypoint runs `payload migrate` before `node server.js`. Add `.dockerignore`.
> 2. **Baseline DB migration**: the repo currently uses Payload dev push-mode with ZERO committed
>    migrations. Create the baseline (`pnpm --filter web migrate:create`) so `payload migrate`
>    reproduces the full schema on an empty database. Verify by wiping a scratch DB and running
>    migrate + the integration suite against it. Document the new rule: every future schema change
>    ships a migration (dev push stays for local only).
> 3. **Passwordless Postgres seam**: new `apps/web/src/lib/db-auth.ts` (or similar) so the pg pool
>    config in `payload.config.ts` supports two modes via env: `DB_AUTH_MODE=password` (default,
>    local docker) and `DB_AUTH_MODE=entra` — the pool's `password` becomes an async callback that
>    fetches a token for `https://ossrdbms-aad.database.windows.net/.default` via
>    `DefaultAzureCredential` (`@azure/identity` — the one new dependency, justify in commit).
>    Unit-test the mode selection; token path is exercised for real in Phase C.
> 4. **Env contract**: document every runtime env var in one place (README or
>    `documentation/runtime-config.md`): `DATABASE_URI`/`DB_AUTH_MODE`, `PAYLOAD_SECRET`,
>    `AUTH_MODE` + Entra vars (see `apps/web/.env.example`), `NEXT_PUBLIC_*` if any. Production
>    uses `AUTH_MODE` = the real Entra mode (mock is dev-only).
> 5. **CI workflow** `.github/workflows/deploy-production.yml`: on push to `main` +
>    `workflow_dispatch`; job 1 runs lint + the full test suite with a `postgres:16` service
>    container (`PAYLOAD_SECRET`/`DATABASE_URI` pointed at it); job 2 (needs job 1) builds and
>    pushes `ghcr.io/altinn/kihub-web:{sha,latest}` with `permissions: packages: write`; make the
>    ghcr package PUBLIC on first publish (explicit decision). Deploy step: leave a clearly marked
>    placeholder job — Phase C fills in the `az containerapp update` call. First run doubles as
>    the empirical test that org policy allows package creation for this repo.
> 6. Everything verified locally: `docker build` succeeds, container boots against the local
>    docker-compose Postgres (password mode), migrate runs, suite + lint green. Commit in
>    reviewable chunks.

**Acceptance**: image builds + runs locally end to end; baseline migration proven on an empty DB;
CI green on GitHub including a successful public ghcr push; deploy job stubbed.

---

## Phase C — Provision production (Azure) and wire the deploy

Azure work via `az` CLI (already logged in). Needs Adi present for the Entra app-registration
consent step.

**Prompt to start the session:**

> Execute Phase C of documentation/deployment-plan.md (read it first): provision KI Hub
> production in subscription `Altinn-KITT-TestDev` and complete the CI deploy job from Phase B.
> Confirm each `az` step with me before running anything that creates/changes resources; never
> touch `rg-kihub-swa`.
>
> 1. Register providers `Microsoft.App`, `Microsoft.OperationalInsights`,
>    `Microsoft.DBforPostgreSQL`. Region: prefer `norwayeast` (fall back to `westeurope` if a SKU
>    is unavailable). Resource group: `rg-kihub-app`.
> 2. **PostgreSQL Flexible Server** (`kihub-pg` or similar): Burstable B1ms, 32 GB, PG 16,
>    **Entra auth enabled** (Microsoft Entra admin set), public network access restricted to
>    Azure services + our egress, database `kihub`.
> 3. **Container Apps environment + app** (`kihub-web`): consumption plan, min 0–1 replicas,
>    ingress external on 3000, image `ghcr.io/altinn/kihub-web:latest` (public — no registry
>    credentials needed), **system-assigned managed identity**; grant that identity a Postgres
>    Entra role in the DB (`pgaadauth_create_principal`) so `DB_AUTH_MODE=entra` works; secrets:
>    `PAYLOAD_SECRET` (generate), Entra client secret; env: `DATABASE_URI` (no password),
>    `DB_AUTH_MODE=entra`, `AUTH_MODE` + Entra vars, `NEXT_PUBLIC_SERVER_URL`/base URL.
> 4. **Entra app registration** for sign-in (this is the step Adi must approve/consent):
>    redirect URI `https://<app-fqdn>/api/auth/callback/microsoft-entra-id` (verify exact path
>    from the Auth.js config in `src/auth/`), group claims for the role mapping, employees-only
>    tenant. Wire client id/secret into the Container App.
> 5. Fill in the Phase B deploy job: `az containerapp update --image ghcr.io/altinn/kihub-web:<sha>`
>    using OIDC federated credentials for GitHub Actions (`azure/login` with a federated identity
>    on a deployment service principal or the app's identity — no publish-profile secrets).
> 6. Migrate content: the entrypoint's `payload migrate` creates the schema; then create the real
>    editors' first content or optionally seed globals defaults (they render from code defaults
>    anyway). Do NOT copy local demo `fp-seed-*` data to production.
> 7. Verify per `specs/011-frontpage-redesign/quickstart.md` scenarios 1/3/4/5 against the
>    production URL (sign in via real Entra), plus: draft content invisible, `/cms` reachable for
>    Contributor+, ICS downloads, mobile menu. Document the runbook (URLs, resource names, how to
>    roll back = redeploy previous image tag) in `documentation/infrastructure.md` (new file —
>    the old one described the SWA).
>
> Cost guardrail: this should land around the price of one burstable Postgres (~€15–25/mo) + ACA
> consumption (~€0–5/mo at internal traffic).

**Acceptance**: production URL serves the portal behind real Entra sign-in; push to `main` →
tests → image → automatic deploy; rollback documented; `rg-kihub-swa` untouched.

---

## Later (not scheduled): port to dis-core

When the platform team can onboard `product-kihub`: write the operator CRs (`DatabaseServer`,
`Database`, `Vault`, `ApplicationIdentity`, `Api`), Flux OCI syncroot, `pg_dump | pg_restore` the
content, point DNS/APIM, decommission `rg-kihub-app`. The image, env contract, migrations and
Entra auth carry over unchanged — that's what Phases B/C were shaped for.
