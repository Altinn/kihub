import { azureStorage } from '@payloadcms/storage-azure';
import type { Plugin } from 'payload';

/**
 * Media storage seam (014, contracts/media-storage.md §B).
 *
 * Two modes, selected by MEDIA_STORAGE_MODE — deliberately the same shape as the DB_AUTH_MODE seam
 * in `lib/db-auth.ts`, so it reads as house style rather than a new idea:
 * - "disk" (default): no plugin at all — Payload's built-in filesystem storage handles uploads.
 *   Correct for local development and the test suite; requires no Azure variable.
 * - "azure": uploads go to Azure Blob Storage via `@payloadcms/storage-azure`.
 *
 * WHY the mode is explicit rather than inferred from "is a connection string present": FR-024 makes
 * durability a requirement, and a deployed environment that silently fell back to the container
 * filesystem would lose every image on restart while looking healthy. An explicit mode makes the
 * ephemeral configuration a deliberate, visible choice (contracts/media-storage.md §C).
 */

export type MediaStorageMode = 'disk' | 'azure';

/** Env shape this seam reads — loose so tests can pass plain objects. */
export type MediaEnv = Record<string, string | undefined>;

export function resolveMediaStorageMode(env: MediaEnv = process.env): MediaStorageMode {
  const mode = env.MEDIA_STORAGE_MODE ?? 'disk';
  if (mode !== 'disk' && mode !== 'azure') {
    // FR-025: an unrecognised value throws instead of quietly falling back to `disk`, which would
    // turn a typo into silent data loss in a deployed environment.
    throw new Error(`MEDIA_STORAGE_MODE must be "disk" or "azure", got "${mode}"`);
  }
  return mode;
}

/**
 * The Azure settings, validated. Exported for the unit test.
 *
 * All three are REQUIRED: `@payloadcms/storage-azure` declares `baseURL: string` as mandatory in
 * `AzureStorageOptions` (Payload's docs table reads as though it were optional — it is not).
 */
export interface AzureMediaConfig {
  connectionString: string;
  containerName: string;
  baseURL: string;
}

export function resolveAzureMediaConfig(env: MediaEnv = process.env): AzureMediaConfig {
  const connectionString = env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  const containerName = env.AZURE_STORAGE_CONTAINER_NAME?.trim();
  const baseURL = env.AZURE_STORAGE_ACCOUNT_BASEURL?.trim();

  // FR-025 — fail loudly, naming every missing variable. In production `src/instrumentation.ts`
  // initialises Payload at container boot, so this throw crash-loops the container with a clear
  // message instead of serving pages whose images are all broken.
  const missing = [
    connectionString ? null : 'AZURE_STORAGE_CONNECTION_STRING',
    containerName ? null : 'AZURE_STORAGE_CONTAINER_NAME',
    baseURL ? null : 'AZURE_STORAGE_ACCOUNT_BASEURL',
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(
      `MEDIA_STORAGE_MODE=azure requires ${missing.join(', ')} to be set (see contracts/media-storage.md §B1).`,
    );
  }

  return {
    connectionString: connectionString as string,
    containerName: containerName as string,
    baseURL: baseURL as string,
  };
}

/**
 * The plugins the Payload config should register for media storage. Empty in `disk` mode — the
 * absence of a plugin IS the disk configuration.
 *
 * `allowContainerCreate` is deliberately not exposed and stays false: the container is provisioned by
 * the platform team, and the app should not hold rights it never needs.
 */
export function buildMediaStoragePlugins(env: MediaEnv = process.env): Plugin[] {
  if (resolveMediaStorageMode(env) === 'disk') return [];

  const { connectionString, containerName, baseURL } = resolveAzureMediaConfig(env);

  // Statically imported rather than lazily required: this module is server-only config code, the
  // dependency is installed in every environment anyway, and `plugins` is built synchronously — a
  // lazy import would force top-level await into payload.config.ts for no real benefit.
  return [
    azureStorage({
      collections: { media: true },
      connectionString,
      containerName,
      baseURL,
      allowContainerCreate: false,
    }),
  ];
}
