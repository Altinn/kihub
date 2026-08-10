# Contract: Media uploads and storage target selection

**Feature**: `014-learning-pages` | Owns: FR-020 to FR-025

The first managed-upload capability in KI Hub. Constitution v3.1.0 (Principle II) makes uploaded media
for native content Payload-owned data; the Technology & Architecture Constraints already name Azure
Blob Storage as the platform's object store, so no new constraint is introduced.

---

## §A The `media` collection

| Setting | Value | Requirement |
|---|---|---|
| `upload.mimeTypes` | `['image/png','image/jpeg','image/webp','image/avif']` | FR-022 |
| Max file size | 5 MB, refused with a Norwegian message | FR-022 |
| `upload.imageSizes` | exactly two — `content` (760 w, the reading column) and `content2x` (1520 w, retina). `admin.upload.adminThumbnail` reuses `content` rather than generating a third derivative | FR-023 |
| `upload.focalPoint` / `crop` | `false` — no requirement behind them | Principle VII |
| `alt` | required `text` field — the collection's **only** field (no caption; see data-model.md) | FR-021 |
| `access.read` | everyone (a published page's image must be fetchable) | FR-020 |
| `access.create/update/delete` | Contributor+ (`isEditor`, the News posture) | FR-031 |

**SVG is refused**, by omission from `mimeTypes`: an SVG is a script-capable document served from the
portal's own origin (FR-022, spec Assumption 6). `sharp` is already a dependency, so `imageSizes`
needs no new package.

Deleting a media document that a page still references must not break the page — the upload converter
renders nothing for a missing asset (learning-editor.md §B1.5).

---

## §B Storage target selection

`payload.config.ts` currently has **no `plugins` array**; this feature adds one.

```
MEDIA_STORAGE_MODE=disk    (default)  → no plugin registered; Payload's built-in filesystem storage
MEDIA_STORAGE_MODE=azure              → azureStorage({ collections: { media: true }, ... })
```

This mirrors the existing env-selected patterns exactly — `DB_AUTH_MODE=password|entra`
(`lib/db-auth.ts`) and `AUTH_MODE=mock|entra` — so it reads as house style, and the selector lives in
its own small module (`lib/media-storage.ts`) for the same reason `buildPoolConfig` does: it is the
unit test's seam.

### Dependency

`@payloadcms/storage-azure@3.85.2` — an **exact** pin, not a range and not `latest`. Verified:
`npm view @payloadcms/storage-azure@3.85.2` reports `peerDependencies: { payload: "3.85.2" }`, matching
this repo's pinned Payload. (Current latest is 3.87.1 and would violate the peer range.) It pulls
`@azure/storage-blob` and `@payloadcms/plugin-cloud-storage@3.85.2` transitively. Bumping Payload later
means bumping this in lockstep.

### Environment variables

Added to `.env.example` with the same commenting style as the existing blocks:

| Variable | Mode | Meaning |
|---|---|---|
| `MEDIA_STORAGE_MODE` | both | `disk` (default, local dev) or `azure` |
| `AZURE_STORAGE_CONNECTION_STRING` | azure | **required**; the container's connection string |
| `AZURE_STORAGE_CONTAINER_NAME` | azure | **required**; the blob container |
| `AZURE_STORAGE_ACCOUNT_BASEURL` | azure | **required**; public base URL for served blobs |

**Correction found during implementation**: `AZURE_STORAGE_ACCOUNT_BASEURL` is **required**, not
optional. Payload's documentation table reads as though it were optional, but
`@payloadcms/storage-azure@3.85.2` declares `baseURL: string` (non-optional) in `AzureStorageOptions`
— omitting it is a type error, caught by `next build`'s type check rather than by tests. All three
variables are therefore validated together, and the platform team must supply the base URL alongside
the connection string and container name.

`allowContainerCreate` is **not** exposed and stays `false`: the container is provisioned by the
platform team, and the app should not hold container-creation rights it never needs.

### §B1 Loud failure (FR-025)

| # | Guarantee |
|---|---|
| B1.1 | `MEDIA_STORAGE_MODE=azure` with a missing or blank `AZURE_STORAGE_CONNECTION_STRING` or `AZURE_STORAGE_CONTAINER_NAME` **throws** during config resolution, with a message naming the missing variable |
| B1.2 | An unrecognised `MEDIA_STORAGE_MODE` value throws rather than silently falling back to `disk` |
| B1.3 | In production the throw happens **at boot**: `src/instrumentation.ts` initialises Payload at container start, so the container crash-loops visibly instead of serving broken images later |
| B1.4 | `disk` mode never requires an Azure variable — local development and the test suite run with none set |

B1.3 needs no new machinery: `instrumentation.ts` already exists to make migration failures crash the
boot loudly ("A migration failure crashes the boot loudly rather than serving a broken app"), and a
config-resolution throw rides the same path.

---

## §C Durability — PROVISIONED (2026-08-10)

FR-024 requires uploads to survive restarts and redeployments. The Azure Container Apps filesystem is
ephemeral, so `disk` mode **is not durable in a deployed environment** — that is the entire reason the
mode exists as a switch.

**This is no longer blocked, and it never needed the platform team.** The account holder turned out to
have **Contributor at both subscription and resource-group scope** on `Altinn-KITT-TestDev`, which
covers everything required here (create storage, create containers, read account keys). The only thing
Contributor cannot do is create role assignments — irrelevant, because this adapter authenticates with
a connection string rather than a managed identity.

### What exists

| Resource | Value |
|---|---|
| Subscription | `Altinn-KITT-TestDev` (`a21239a6-…`) |
| Resource group | `rg-kihub-app` — the same group as `kihub-web`, `kihub-env`, `kihub-pg` |
| Storage account | `stkihubmedia`, `norwayeast`, `Standard_LRS`, `StorageV2` |
| Container | `kihub-media`, **private** (`publicAccess: null`) |
| Account settings | `allowBlobPublicAccess: false`, `minimumTlsVersion: TLS1_2`, `httpsOnly: true` |
| `AZURE_STORAGE_ACCOUNT_BASEURL` | `https://stkihubmedia.blob.core.windows.net/kihub-media` |

`Microsoft.Storage` had to be registered on the subscription first — until then even
`az storage account check-name` fails with a misleading `SubscriptionNotFound`.

### Wiring on `kihub-web`

`MEDIA_STORAGE_MODE=azure`, `AZURE_STORAGE_CONTAINER_NAME`, `AZURE_STORAGE_ACCOUNT_BASEURL` are plain
env vars; the connection string is a container-app **secret** (`azure-storage-connection-string`,
referenced as `secretref:`), never plain configuration. Setting them created revision
`kihub-web--0000002`, which came up `Healthy`.

### Verified, not assumed

A write → list → read → delete round-trip against `kihub-media` using the exact connection string the
app holds: upload returned an etag, the downloaded bytes matched, and the container was left empty.
An **anonymous** `GET` of the blob URL returned **409 PublicAccessNotPermitted** — confirming the
container is genuinely private and that files are only reachable through Payload's authenticated route.

### One caveat that remains

The 014 code is **not deployed yet** (deployment is blocked on the two outstanding identity items:
the digdir sign-in app registration and the deploy-SP role grant). `kihub-web` currently runs a
pre-014 image, which ignores these variables. The moment 014 deploys, uploads go straight to blob
storage — there is no `disk` period to migrate away from, so nothing will need re-uploading.
