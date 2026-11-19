import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { BlobServiceClient } from '@azure/storage-blob';
import { DECK_ENTRY, buildDeckSrc, parseDeckHash } from './guideline-deck-view';
import { type MediaEnv, resolveMediaStorageMode } from './media-storage';

// The browser-safe pieces live in `guideline-deck-view.ts` (the client component imports them from
// there); re-exported so server code and tests keep one import path.
export { DECK_ENTRY, buildDeckSrc, parseDeckHash };

/**
 * 029 — «Retningslinje for agentisk KI i Digdir»: the INTERN slide deck delivered with issue #183.
 *
 * The deck is a static, self-contained bundle with its own player, shown unchanged. The repository and
 * the production container image are PUBLIC, so its files are never committed or baked into the image:
 * they live in a private blob container (azure mode) or a gitignored folder (disk mode, local dev), and
 * are streamed to signed-in employees by `app/(app)/retningslinje/deck/[...path]/route.ts`.
 *
 * Everything here is either pure (flag, path rules, hash grammar) or sits behind the small `DeckStore`
 * seam, which is selected by the existing `MEDIA_STORAGE_MODE` — the same shape as `lib/media-storage.ts`.
 * Contracts: specs/029-agentic-guideline-deck/contracts/deck-route.md.
 */

/** Blob prefix and entry key inside the private store. */
const BLOB_PREFIX = 'retningslinje/';
const ENTRY_KEY = 'index.html';

/**
 * Release switch (FR-016): only the exact value "true" turns the feature on. Read per request, and not
 * a `NEXT_PUBLIC_*` variable, so it is never inlined at build time.
 */
export function isGuidelineDeckEnabled(env: MediaEnv = process.env): boolean {
  return env.GUIDELINE_DECK_ENABLED === 'true';
}

/**
 * Files the route may ever serve, by extension. `md` (the bundle's README) and `map` are deliberately
 * absent: only what the player needs leaves the server.
 */
export const DECK_CONTENT_TYPES: Readonly<Record<string, string>> = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  woff2: 'font/woff2',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  json: 'application/json',
};

const MAX_SEGMENTS = 4;
/** Starts alphanumeric, so `.`, `..` and dotfiles fail; no separators, `%`, spaces or NUL. */
const SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export type DeckPath = { ok: true; key: string; contentType: string } | { ok: false };

/**
 * Decide whether the requested path is a deck file the route may serve (FR-006).
 *
 * `segments` are taken as Next provides them (`params.path`, already URL-decoded). They are NOT decoded
 * again: `%` is outside the allowed character set, so no segment can smuggle an encoded separator or
 * `..` past this check, however many layers of encoding a client stacks.
 */
export function resolveDeckPath(segments: readonly string[]): DeckPath {
  if (segments.length < 1 || segments.length > MAX_SEGMENTS) return { ok: false };
  if (!segments.every((segment) => SEGMENT_PATTERN.test(segment))) return { ok: false };

  const last = segments[segments.length - 1] ?? '';
  const dot = last.lastIndexOf('.');
  if (dot < 1) return { ok: false };
  const contentType = DECK_CONTENT_TYPES[last.slice(dot + 1).toLowerCase()];
  if (!contentType) return { ok: false };

  return { ok: true, key: segments.join('/'), contentType };
}

export interface DeckFile {
  body: ReadableStream<Uint8Array>;
  size?: number;
}

export interface DeckStore {
  read(key: string): Promise<DeckFile | null>;
  /** Cheap presence check, used by the page to choose the deck frame or the «ikke tilgjengelig» note. */
  exists(key: string): Promise<boolean>;
}

/** Local folder store (dev and tests). Refuses any key that resolves outside `root`. */
export function diskDeckStore(root: string): DeckStore {
  const resolvedRoot = path.resolve(root);

  function locate(key: string): string | null {
    const target = path.resolve(resolvedRoot, ...key.split('/'));
    return target.startsWith(resolvedRoot + path.sep) ? target : null;
  }

  async function fileSize(target: string): Promise<number | null> {
    try {
      const info = await stat(target);
      return info.isFile() ? info.size : null;
    } catch {
      return null;
    }
  }

  return {
    async read(key) {
      const target = locate(key);
      if (!target) return null;
      const size = await fileSize(target);
      if (size === null) return null;
      return {
        body: Readable.toWeb(createReadStream(target)) as ReadableStream<Uint8Array>,
        size,
      };
    },
    async exists(key) {
      const target = locate(key);
      return target ? (await fileSize(target)) !== null : false;
    },
  };
}

export interface AzureDeckConfig {
  connectionString: string;
  containerName: string;
}

/**
 * Azure settings, validated like `resolveAzureMediaConfig`: every missing variable is named at once.
 * The container is provisioned out of band and must be PRIVATE; the app never creates it.
 */
export function resolveAzureDeckConfig(env: MediaEnv = process.env): AzureDeckConfig {
  const connectionString = env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  const containerName = env.GUIDELINE_DECK_CONTAINER?.trim();

  const missing = [
    connectionString ? null : 'AZURE_STORAGE_CONNECTION_STRING',
    containerName ? null : 'GUIDELINE_DECK_CONTAINER',
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(
      `The guideline deck in MEDIA_STORAGE_MODE=azure requires ${missing.join(', ')} to be set.`,
    );
  }
  return { connectionString: connectionString as string, containerName: containerName as string };
}

function isBlobNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as { statusCode?: number }).statusCode === 404
  );
}

/** Private blob container store (deployed environments). Read-only: the app never writes the deck. */
export function azureDeckStore(config: AzureDeckConfig): DeckStore {
  const container = BlobServiceClient.fromConnectionString(
    config.connectionString,
  ).getContainerClient(config.containerName);
  const blobFor = (key: string) => container.getBlobClient(`${BLOB_PREFIX}${key}`);

  return {
    async read(key) {
      try {
        const response = await blobFor(key).download();
        if (!response.readableStreamBody) return null;
        return {
          body: Readable.toWeb(response.readableStreamBody as Readable) as ReadableStream<Uint8Array>,
          size: response.contentLength,
        };
      } catch (error) {
        if (isBlobNotFound(error)) return null;
        throw error;
      }
    },
    async exists(key) {
      return blobFor(key).exists();
    },
  };
}

/** The store for the current environment, following `MEDIA_STORAGE_MODE` (loud on misconfiguration). */
export function getDeckStore(env: MediaEnv = process.env): DeckStore {
  if (resolveMediaStorageMode(env) === 'azure') {
    return azureDeckStore(resolveAzureDeckConfig(env));
  }
  const root = env.GUIDELINE_DECK_DIR?.trim() || path.join(process.cwd(), 'protected-static', 'retningslinje');
  return diskDeckStore(root);
}

/** Presence of the entry file, for the page's fallback (FR-012). */
export async function deckIsAvailable(store: DeckStore = getDeckStore()): Promise<boolean> {
  try {
    return await store.exists(ENTRY_KEY);
  } catch {
    return false;
  }
}
