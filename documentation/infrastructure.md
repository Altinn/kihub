# KI Hub production infrastructure (runbook)

Provisioned 2026-08-04 (deployment-plan.md Phase C). Interim production in our own
subscription, shaped for a later port to the dis-core golden path (see deployment-plan.md
"Later"). The OLD Astro site's Static Web App lives in `rg-kihub-swa` — frozen, **never touch**.

## URLs

| What | URL |
|---|---|
| Production portal | https://kihub-web.happypond-fe66d7a5.norwayeast.azurecontainerapps.io |
| CMS (Contributor+) | same origin, `/cms` |
| CI pipeline | `.github/workflows/deploy-production.yml` (push to `main`) |
| Container image | `ghcr.io/altinn/kihub-web` (public; tags: `latest` + every commit sha) |

## Azure resources

Subscription `Altinn-KITT-TestDev` (`a21239a6-9327-4f19-8829-f50b76429206`, tenant ai-dev.no
`cd0026d8-283b-4a55-9bfa-d0ef4a8ba21c`), resource group **`rg-kihub-app`**, region **norwayeast**.

| Resource | Type | Notes |
|---|---|---|
| `kihub-pg` | PostgreSQL Flexible Server 16 | Burstable B1ms, 32 GiB, 7-day backups. **Entra-only auth** (`--password-auth Disabled`). Firewall: Azure services + named admin-IP rules (`allow-adi-egress`). Database: `kihub`. Entra admin: adi.dahl@digdir.no (object `272b7fb3-…`). |
| `kihub-env` | Container Apps environment | Consumption. Logs → `workspace-rgkihubappbm3Z`. |
| `kihub-web` | Container App | External ingress → 3000, scale 0–1 (cold start ~15–40 s after idle; `az containerapp update --min-replicas 1` to pin, ~€20/mo). System-assigned managed identity `708072f1-b45a-4f57-9d25-39e228a42deb` = PG role `kihub-web`. |
| `workspace-rgkihubappbm3Z` | Log Analytics | Auto-created by the env. |

## Identity & access

- **App → DB**: `DB_AUTH_MODE=entra`; the pool fetches a token per connection via the managed
  identity (`src/lib/db-auth.ts` — discrete pg fields, never `connectionString`, see commit
  `39a4244`). PG role created with
  `pgaadauth_create_principal_with_oid('kihub-web', '<principalId>', 'service', false, false)`
  and granted `ALL` on database `kihub` + schema `public`.
- **CI → Azure**: app registration `kihub-github-deploy` (ai-dev tenant, appId
  `6549db5c-cd0e-428d-ae4d-10c6c9d76b64`, SP object `19bcbcc2-190a-4256-a040-69558ce2e81d`),
  federated credential for `repo:Altinn/kihub:ref:refs/heads/main`; repo variables
  `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` / `AZURE_SUBSCRIPTION_ID`. **Pending**: Contributor on
  `rg-kihub-app` (needs a subscription admin — Contributor can't write role assignments):

      az role assignment create \
        --assignee-object-id 19bcbcc2-190a-4256-a040-69558ce2e81d \
        --assignee-principal-type ServicePrincipal --role Contributor \
        --scope /subscriptions/a21239a6-9327-4f19-8829-f50b76429206/resourceGroups/rg-kihub-app

  Until granted, the CI `deploy` job fails and deploys are manual (below).
- **Users → app**: Auth.js + Entra, employees-only gate (`tid` must equal `ORG_TENANT_ID` =
  digdir home tenant `008e560f-08af-4cec-a056-b35447503991`, guests rejected). **Pending**:
  app registration in the digdir tenant (requested from digdir IT — single tenant, Web
  redirect URI `https://<fqdn>/api/auth/callback/microsoft-entra-id`, admin consent, Adi as
  owner). When it lands, wire it:

      az containerapp secret set -g rg-kihub-app -n kihub-web \
        --secrets entra-client-secret=<secret>
      az containerapp update -g rg-kihub-app -n kihub-web \
        --set-env-vars AUTH_MICROSOFT_ENTRA_ID_ID=<client-id> \
          AUTH_MICROSOFT_ENTRA_ID_SECRET=secretref:entra-client-secret

## Runtime configuration

The full env contract is `documentation/runtime-config.md`. Secrets on the container app:
`payload-secret`, `auth-secret` (generated at provisioning, only stored in ACA), later
`entra-client-secret`. `DATABASE_URI` is passwordless:
`postgres://kihub-web@kihub-pg.postgres.database.azure.com:5432/kihub?sslmode=require`.

## Deploy, rollback, logs

- **Normal deploy**: push to `main` → tests on a migrated Postgres → image `ghcr.io/altinn/kihub-web:<sha>`
  → `az containerapp update` (CI). Migrations run at container boot; a failed migration fails
  the boot and the old revision keeps serving.
- **Manual deploy / rollback** (rollback = any previously green sha):

      az containerapp update -g rg-kihub-app -n kihub-web \
        --image ghcr.io/altinn/kihub-web:<sha>

- **Logs**:

      az containerapp logs show -g rg-kihub-app -n kihub-web --type console --tail 50

- **Admin DB access** (Entra admin, from an allowed IP; no psql needed locally):

      TOKEN=$(az account get-access-token --resource-type oss-rdbms --query accessToken -o tsv)
      docker run --rm -e PGPASSWORD="$TOKEN" postgres:16 \
        psql "host=kihub-pg.postgres.database.azure.com dbname=kihub \
              user=adi.dahl@digdir.no sslmode=require"

## Content

Schema comes from committed migrations at boot; globals (`site-chrome`, `frontpage`) render
from code-seeded defaults until editors change them in `/cms`. Local demo `fp-seed-*` data is
never copied to production.

## Cost guardrail

~€15–25/mo: PG B1ms + 32 GiB (~€15–20) + ACA consumption at scale-to-zero (~€0–5).
