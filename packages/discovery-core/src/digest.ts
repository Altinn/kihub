import { createHash } from 'node:crypto';

export interface ArtifactDigestEntry {
  /** POSIX path relative to the artifact directory. */
  path: string;
  /** Git object id for the blob bytes. */
  blobOid: string;
}

/** The Git blob object id for raw file/symlink bytes. */
export function gitBlobOid(content: string | Uint8Array): string {
  const bytes = typeof content === 'string' ? Buffer.from(content) : Buffer.from(content);
  const header = Buffer.from(`blob ${bytes.byteLength}\0`);
  return createHash('sha1').update(header).update(bytes).digest('hex');
}

function validateRelativePath(value: string): string {
  if (
    value.length === 0 ||
    value.startsWith('/') ||
    value.includes('\\') ||
    value.includes('\0') ||
    value.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error(`Invalid artifact digest path ${JSON.stringify(value)}`);
  }
  return value;
}

/** Aggregate sorted relative path + Git blob oid records into the portable artifact digest. */
export function artifactDirectoryDigest(entries: readonly ArtifactDigestEntry[]): string {
  const normalized = entries
    .map((entry) => ({ path: validateRelativePath(entry.path), blobOid: entry.blobOid.toLowerCase() }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const seen = new Set<string>();
  const hash = createHash('sha256');
  for (const entry of normalized) {
    if (seen.has(entry.path)) throw new Error(`Duplicate artifact digest path ${entry.path}`);
    if (!/^[a-f0-9]{40}$/.test(entry.blobOid)) throw new Error(`Invalid Git blob oid for ${entry.path}`);
    seen.add(entry.path);
    hash.update(`${entry.path}\0${entry.blobOid}\n`);
  }
  return `sha256:${hash.digest('hex')}`;
}

/** Fallback for simple readers: digest the artifact files the scanner already fetched. */
export function digestKnownFiles(files: Readonly<Record<string, string | undefined>>): string {
  const entries = Object.entries(files)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([path, contents]) => ({ path, blobOid: gitBlobOid(contents) }));
  return artifactDirectoryDigest(entries);
}
