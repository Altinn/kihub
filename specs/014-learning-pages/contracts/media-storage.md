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
| `upload.imageSizes` | `content` (760 w) and `content2x` (1520 w) for the reading column, `thumb` (300 w) for the admin list | FR-023 |
| `upload.focalPoint` / `crop` | `false` — no requirement behind them | Principle VII |
| `alt` | required `text` field | FR-021 |
| `caption` | optional `text` field | FR-019 |
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
| `AZURE_STORAGE_CONNECTION_STRING` | azure | required; the container's connection string |
| `AZURE_STORAGE_CONTAINER_NAME` | azure | required; the blob container |
| `AZURE_STORAGE_ACCOUNT_BASEURL` | azure | optional; public base URL for served blobs |

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

## §C Durability and the external dependency

FR-024 requires uploads to survive restarts and redeployments. The Azure Container Apps filesystem is
ephemeral, so `disk` mode **is not durable in a deployed environment** — that is the entire reason the
mode exists as a switch.

**Current state**: the blob container and its credentials are pending with the platform team, tracked
in [spec.md → Dependencies](../spec.md#dependencies) alongside the outstanding sign-in registration and
deploy-SP role grant.

**Consequences, stated plainly:**

- Local development is fully unblocked: `disk` mode exercises every requirement except FR-024, and the
  entire feature can be built, tested and demonstrated.
- The deployed environment runs `disk` until the container exists. Images uploaded there before the
  switch **must be treated as ephemeral** — they will disappear on the next restart. Per B1.1 this is a
  deliberate configuration state, not a silent failure.
- Flipping to durable storage is one environment change plus a restart: set `MEDIA_STORAGE_MODE=azure`
  and the two required variables. No code change, no migration, no content change.
- Files uploaded during the `disk` period are not migrated automatically; editors re-upload them. With
  no real content authored yet, this is acceptable — and it is the reason to set the variables **before**
  editors start filling the library.
