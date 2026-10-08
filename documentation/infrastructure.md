# KI Hub production infrastructure (runbook)

Provisioned 2026-08-04 (deployment-plan.md Phase C). Interim production in our own
subscription, shaped for a later port to the dis-core golden path (see deployment-plan.md
"Later"). The OLD Astro site's Static Web App lives in `rg-kihub-swa` — frozen, **never touch**.

## URLs

| What | URL |
|---|---|
| Production portal | https://kihub.digdir.no (custom domain, see below) |
| Default Container Apps address | https://kihub-web.happypond-fe66d7a5.norwayeast.azurecontainerapps.io (still resolves; sign-in redirects to the custom domain because `AUTH_URL` is fixed) |
| CMS (Contributor+) | same origin, `/cms` |
| CI pipeline | `.github/workflows/deploy-production.yml` (push to `main`) |
| Container image | `ghcr.io/altinn/kihub-web` (public; tags: `latest` + every commit sha) |

## Custom domain (2026-10-08)

`kihub.digdir.no` is a subdomain of a zone Digdir Drift (drift@digdir.no) controls; no external order
process. Drift created two records:

| Type | Name | Value |
|---|---|---|
| CNAME | `kihub.digdir.no` | `kihub-web.happypond-fe66d7a5.norwayeast.azurecontainerapps.io` |
| TXT | `asuid.kihub.digdir.no` | environment `customDomainVerificationId` (`az containerapp env show -n kihub-env -g rg-kihub-app --query properties.customDomainConfiguration.customDomainVerificationId`) |

**Both must stay in place**: the TXT proves ownership, the CNAME is what the free managed certificate
renews against. `digdir.no` has CAA records (digicert.com is allowed, which Azure's managed certs need).
Environment static IP is `131.163.17.109`, but use the CNAME, not an A record: the IP can change if the
environment is recreated.

Azure side (done via CLI): `az containerapp hostname add` then `hostname bind --validation-method CNAME`,
creating managed cert `mc-kihub-env-kihub-digdir-no-7327`. App settings changed to match:
`AUTH_URL=https://kihub.digdir.no`, `MEDIA_PUBLIC_HOSTNAME=kihub.digdir.no`. Entra app registration
(`b4fce259-…`, digdir tenant, portal only) has redirect URI
`https://kihub.digdir.no/api/auth/callback/microsoft-entra-id`. Order matters when changing a domain:
bind first, add the Entra redirect URI second, change `AUTH_URL` last, or sign-in breaks. CI only swaps
`--image`, so none of this is overwritten by a deploy.

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
  `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` / `AZURE_SUBSCRIPTION_ID`. Contributor on
  `rg-kihub-app` granted by a subscription admin 2026-09-09 — the CI `deploy` job is green
  and every push to `main` deploys automatically.
- **Users → app**: Auth.js + Entra, employees-only gate (`tid` must equal `ORG_TENANT_ID` =
  digdir home tenant `008e560f-08af-4cec-a056-b35447503991`, guests rejected). App
  registration **KI Hub** in the digdir tenant (created by digdir IT 2026-09-09): client ID
  `b4fce259-88ca-4615-99ed-40055e4f23f1`, single tenant, Web redirect URI
  `https://<fqdn>/api/auth/callback/microsoft-entra-id`, admin consent, Adi is Owner
  (self-serve secret rotation + redirect-URI edits). Wired as env vars
  `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET=secretref:entra-client-secret`,
  and `AUTH_URL=https://<fqdn>` (required — without it Auth.js builds redirects from the
  container-internal `0.0.0.0:3000`).
- **Client-secret rotation** (current secret created 2026-09-09, 12-month expiry — rotate
  before ~2027-09 or sign-in stops for everyone): Entra portal in the **digdir** tenant →
  App registrations → KI Hub → Certificates & secrets → new client secret → copy the
  **Value** (not the Secret ID), then:

      az containerapp secret set -g rg-kihub-app -n kihub-web \
        --secrets entra-client-secret='<value>'
      az containerapp revision restart -g rg-kihub-app -n kihub-web \
        --revision $(az containerapp show -g rg-kihub-app -n kihub-web \
          --query properties.latestReadyRevisionName -o tsv)

  Secret changes only take effect on a new revision/restart. A freshly created secret can
  take a few minutes to propagate on Microsoft's side — a transient
  `OAuthCallbackError: invalid_client` right after rotation is expected; retry, don't debug.
- **Users → CMS roles**: first sign-in creates the Payload user with role `reader`; `/cms`
  refuses readers. The FIRST admin is bootstrapped by SQL (Admin DB access below):
  `update users set role='admin' where email='<email>';` — after that, admins manage all
  roles in `/cms` → Users.

## Runtime configuration

The full env contract is `documentation/runtime-config.md`. Secrets on the container app:
`payload-secret`, `auth-secret` (generated at provisioning, only stored in ACA),
`entra-client-secret`, `azure-storage-connection-string`. `DATABASE_URI` is passwordless:
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

## CMS back-office (`/cms`)

The Payload admin's client components come from the COMMITTED
`apps/web/src/app/(payload)/cms/importMap.js`. It must be generated with every
conditionally-registered plugin ACTIVE, or `/cms` renders a blank page in the environments
that enable them (server log: `getFromImportMap: PayloadComponent not found`). Local dev runs
`MEDIA_STORAGE_MODE=disk`, so regenerate with azure mode forced — dummy credentials are fine,
generation never connects:

    MEDIA_STORAGE_MODE=azure \
    AZURE_STORAGE_CONNECTION_STRING='DefaultEndpointsProtocol=https;AccountName=dummy;AccountKey=ZHVtbXlrZXlkdW1teWtleQ==;EndpointSuffix=core.windows.net' \
    AZURE_STORAGE_CONTAINER_NAME=kihub-media \
    AZURE_STORAGE_ACCOUNT_BASEURL=https://dummy.blob.core.windows.net/kihub-media \
    pnpm --filter web generate:importmap

Extra entries are inert in disk mode, so the committed map is a safe superset. Anonymous
`/cms` redirects (client-side) to a bare Payload login page — the CMS reuses the portal
session, so the entry path is: sign in on the portal front page, then open `/cms`.

## Content

Schema comes from committed migrations at boot; globals (`site-chrome`, `frontpage`) render
from code-seeded defaults until editors change them in `/cms`. Local demo `fp-seed-*` data is
never copied to production.

## Cost guardrail

~€15–25/mo: PG B1ms + 32 GiB (~€15–20) + ACA consumption at scale-to-zero (~€0–5).
