# Infrastructure

This document describes the current KI Hub hosting setup, deployment flow, and
operational checks.

## Overview

KI Hub is hosted on Azure Static Web Apps using the Free plan. The site is a
static Astro build from `website/`, with no database, server runtime, Azure
Functions API, CDN, Front Door, or App Service.

The repository still keeps the existing GitHub Pages deployment as a fallback
until a future custom-domain cutover is completed.

## Azure Resources

| Purpose | Azure resource | Notes |
| --- | --- | --- |
| Resource group | `rg-kihub-swa` | Holds the Azure Static Web App resources. |
| Static Web App | `swa-kihub` | Free SKU, located in West Europe. |
| Production environment | `default` | Deploys from `main`. |
| Staging environment | `staging` | Deploys from the `staging` branch as a branch preview environment. |

Current public URLs:

| Environment | URL |
| --- | --- |
| Production | `https://zealous-glacier-0efb99503.7.azurestaticapps.net/` |
| Staging | `https://zealous-glacier-0efb99503-staging.westeurope.7.azurestaticapps.net/` |

Staging is intentionally public. Do not publish sensitive content to the
staging branch.

## GitHub Configuration

Azure deployment is handled by
`.github/workflows/deploy-azure-static-web-app.yml`.

The workflow:

- Runs on pushes to `main` and `staging`.
- Can also be started manually with `workflow_dispatch`.
- Installs root and website dependencies with `npm ci`.
- Generates website data with `npm run website:data`.
- Builds Astro from `website/`.
- Deploys the already-built `website/dist` directory to Azure Static Web Apps
  with `skip_app_build: true`.

GitHub Actions uses these repository settings:

| Type | Name | Purpose |
| --- | --- | --- |
| Secret | `AZURE_STATIC_WEB_APPS_API_TOKEN_KIHUB` | Azure Static Web Apps deployment token. Do not print or commit this value. |
| Variable | `KIHUB_AZURE_PROD_URL` | Build-time site URL for production metadata. |
| Variable | `KIHUB_AZURE_STAGING_URL` | Build-time site URL for staging metadata. |

The workflow sets:

- `SITE_URL` from the production or staging GitHub variable, depending on the
  branch.
- `BASE_PATH=/` for Azure root hosting.

The existing GitHub Pages workflow remains in
`.github/workflows/deploy-website.yml`. It uses the default Astro config values
and still builds for the `/kihub/` base path.

## Application Configuration

`website/astro.config.mjs` reads:

- `SITE_URL`, defaulting to `https://altinn.github.io/kihub/`
- `BASE_PATH`, defaulting to `/kihub/`

This keeps GitHub Pages working while allowing Azure builds to use root-relative
paths and Azure hostnames.

`website/src/pages/llms.txt.ts` also reads `SITE_URL` so the generated
`/llms.txt` file points at the correct environment URL.

## Important Deployment Note

The Azure Static Web Apps deploy action must support branch environments.

Use the pinned action commit currently in the workflow:

```yaml
uses: Azure/static-web-apps-deploy@4d27395796ac319302594769cfe812bd207490b1
```

and keep:

```yaml
production_branch: main
```

Do not pin back to `1a947af9992250f3bc2e68ad0754c0b0c11566c9`. That commit
does not accept `production_branch`, and staging deployments can overwrite the
default production environment when that input is missing.

## Common Commands

Inspect the selected Azure account:

```bash
az account show --output table
```

List the resource group:

```bash
az group show --name rg-kihub-swa --output table
```

Show the Static Web App:

```bash
az staticwebapp show \
  --name swa-kihub \
  --resource-group rg-kihub-swa \
  --output table
```

List Static Web App environments:

```bash
az staticwebapp environment list \
  --name swa-kihub \
  --resource-group rg-kihub-swa \
  --output table
```

The expected environment state is:

| Environment | Source branch | Status |
| --- | --- | --- |
| `default` | `main` | `Ready` |
| `staging` | `staging` | `Ready` |

Update the GitHub deployment token if Azure rotates it:

```bash
az staticwebapp secrets list \
  --name swa-kihub \
  --resource-group rg-kihub-swa \
  --query "properties.apiKey" \
  -o tsv \
  | gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN_KIHUB --repo Altinn/kihub
```

Update environment URL variables:

```bash
gh variable set KIHUB_AZURE_PROD_URL \
  --repo Altinn/kihub \
  --body "https://zealous-glacier-0efb99503.7.azurestaticapps.net/"

gh variable set KIHUB_AZURE_STAGING_URL \
  --repo Altinn/kihub \
  --body "https://zealous-glacier-0efb99503-staging.westeurope.7.azurestaticapps.net/"
```

## Verification

Local validation:

```bash
npm run plugin:validate
npm run skill:validate
npm run website:data
SITE_URL=https://example.com/ BASE_PATH=/ npm run --prefix website build
npm run --prefix website build
```

Smoke-test Azure URLs:

```bash
for base in \
  "https://zealous-glacier-0efb99503.7.azurestaticapps.net" \
  "https://zealous-glacier-0efb99503-staging.westeurope.7.azurestaticapps.net"
do
  echo "$base"
  for path in / /agents/ /skills/ /plugins/ /llms.txt /sitemap-index.xml /data/search-index.json
  do
    code=$(/usr/bin/curl -L -s -o /dev/null -w "%{http_code}" "$base$path")
    printf "  %s %s\n" "$code" "$path"
  done
done
```

Check generated metadata:

```bash
/usr/bin/curl -L -s https://zealous-glacier-0efb99503.7.azurestaticapps.net/llms.txt \
  | rg "Website"

/usr/bin/curl -L -s https://zealous-glacier-0efb99503.7.azurestaticapps.net/sitemap-index.xml
```

The production metadata must use the production Azure hostname. The staging
metadata must use the staging Azure hostname.

Check that Azure pages are not using the old GitHub Pages base path:

```bash
/usr/bin/curl -L -s https://zealous-glacier-0efb99503.7.azurestaticapps.net/ \
  | rg "/kihub/" || true
```

No output is expected.

## Troubleshooting

If the production environment shows `SourceBranch` as `staging`, run the `main`
workflow again after confirming that the workflow still has:

```yaml
production_branch: main
```

If `llms.txt` or `sitemap-index.xml` has the wrong host:

1. Check `KIHUB_AZURE_PROD_URL` and `KIHUB_AZURE_STAGING_URL`.
2. Rerun the workflow for the affected branch.
3. Recheck the live metadata.

If Azure CLI login is blocked, the cause is usually Microsoft Entra
Conditional Access. Use a compliant managed device or ask the Azure/Entra admin
to allow CLI access for the account/device.

## Future Cutover

Before moving a custom domain:

1. Keep GitHub Pages active as a fallback.
2. Verify production and staging Azure URLs.
3. Add the custom domain to Azure Static Web Apps.
4. Update DNS as instructed by Azure.
5. Update `KIHUB_AZURE_PROD_URL` to the custom domain.
6. Rerun the production workflow so metadata uses the custom domain.
7. Disable or remove the GitHub Pages workflow only after the Azure custom
   domain is verified.
