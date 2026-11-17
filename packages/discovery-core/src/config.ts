import { createHash } from 'node:crypto';
import { ARTIFACT_TYPES } from '@kihub/artifact-schema';
import { parseDocument } from 'yaml';
import { comparePaths } from './digest';
import {
  dotNotAllowedMessage,
  duplicateDirMessage,
  emptyDirsMessage,
  emptyDiscoveryMessage,
  notAListMessage,
  notAMappingMessage,
  tooManyMessage,
  unknownTypeMessage,
  unsafeDirMessage,
} from './messages';
import { type ArtifactType, TYPE_FOR_DIR, type TypeDir } from './types';

export const DISCOVERY_CONFIG_PATH = 'kihub.yaml';
export const DEFAULT_ARTIFACT_ROOTS = ['.'] as const;
export const MAX_ARTIFACT_ROOTS = 32;
/** Maximum `artifactDirs` entries across all types (028). */
export const MAX_ARTIFACT_DIRS = 32;

/** Per-type artifact directories (028). Types appear in `ARTIFACT_TYPES` order, entries sorted. */
export type ArtifactDirsMap = Partial<Record<ArtifactType, string[]>>;

export interface ResolvedDiscoveryConfig {
  schemaVersion: 1;
  /** Roots of the `<type-dir>/<slug>` layout; `[]` only when `artifactDirs` is given instead. */
  artifactRoots: string[];
  /** Present ONLY when the file uses `artifactDirs`; roots-only configs stay exactly as in 026. */
  artifactDirs?: ArtifactDirsMap;
  configPath: typeof DISCOVERY_CONFIG_PATH | null;
  configDigest: string | null;
}

export class DiscoveryConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiscoveryConfigError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertOnlyKeys(value: Record<string, unknown>, allowed: readonly string[], at: string) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw new DiscoveryConfigError(`${at}: unknown ${unknown.length === 1 ? 'key' : 'keys'} ${unknown.join(', ')}`);
  }
}

/** Normalize and validate one repository-relative artifact root. */
export function normalizeArtifactRoot(value: unknown): string {
  if (typeof value !== 'string') throw new DiscoveryConfigError('discovery.artifactRoots: every root must be a string');
  if (value === '.') return value;
  if (value.length === 0 || value.trim() !== value) {
    throw new DiscoveryConfigError(`discovery.artifactRoots: invalid root ${JSON.stringify(value)}`);
  }
  if (
    value.startsWith('/') ||
    value.endsWith('/') ||
    value.includes('\\') ||
    value.includes('//') ||
    value.includes('\0') ||
    value.includes(':') ||
    !/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(value)
  ) {
    throw new DiscoveryConfigError(`discovery.artifactRoots: unsafe root ${JSON.stringify(value)}`);
  }
  const segments = value.split('/');
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new DiscoveryConfigError(`discovery.artifactRoots: unsafe segment in ${JSON.stringify(value)}`);
  }
  return segments.join('/');
}

/** Canonical `owner/repo` form used for source-repository comparisons. */
export function normalizeRepository(value: string): string {
  const trimmed = value.trim().replace(/\.git$/i, '');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) {
    throw new DiscoveryConfigError(`repository: expected "owner/repo", got ${JSON.stringify(value)}`);
  }
  return trimmed.toLowerCase();
}

/** One directory entry of `artifactDirs`: the 026 root grammar, minus the repository root. */
function normalizeArtifactDir(value: unknown, type: string): string {
  if (value === '.') throw new DiscoveryConfigError(dotNotAllowedMessage(type));
  try {
    return normalizeArtifactRoot(value);
  } catch {
    throw new DiscoveryConfigError(unsafeDirMessage(type, value));
  }
}

const ARTIFACT_TYPE_SET = new Set<string>(ARTIFACT_TYPES);

function parseArtifactDirs(value: unknown): ArtifactDirsMap {
  if (!isRecord(value)) throw new DiscoveryConfigError(notAMappingMessage());
  for (const key of Object.keys(value)) {
    if (ARTIFACT_TYPE_SET.has(key)) continue;
    // `skills:` is the root-layout directory name; steer the author to the type name.
    throw new DiscoveryConfigError(unknownTypeMessage(key, TYPE_FOR_DIR[key as TypeDir]));
  }
  const result: ArtifactDirsMap = {};
  let total = 0;
  // Fixed ARTIFACT_TYPES order, so the resolved object (and its digest) never depends on file order.
  for (const type of ARTIFACT_TYPES) {
    if (!(type in value)) continue;
    const list = value[type];
    if (!Array.isArray(list) || list.length === 0) throw new DiscoveryConfigError(notAListMessage(type));
    const dirs = list.map((entry) => normalizeArtifactDir(entry, type)).sort(comparePaths);
    const duplicate = dirs.find((dir, i) => i > 0 && dirs[i - 1] === dir);
    if (duplicate !== undefined) throw new DiscoveryConfigError(duplicateDirMessage(type, duplicate));
    total += dirs.length;
    result[type] = dirs;
  }
  if (total === 0) throw new DiscoveryConfigError(emptyDirsMessage());
  if (total > MAX_ARTIFACT_DIRS) throw new DiscoveryConfigError(tooManyMessage(MAX_ARTIFACT_DIRS));
  return result;
}

/**
 * Canonical form hashed into `configDigest`. Roots-only output is byte-identical to 026's, so a
 * deploy never makes an existing source look reconfigured; `artifactDirs` is appended only when used.
 */
function digestConfig(artifactRoots: readonly string[], artifactDirs?: ArtifactDirsMap): string {
  const discovery: { artifactRoots: readonly string[]; artifactDirs?: ArtifactDirsMap } = { artifactRoots };
  if (artifactDirs) discovery.artifactDirs = artifactDirs;
  const canonical = JSON.stringify({ schemaVersion: 1, discovery });
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

/** Parse strict repository-root `kihub.yaml`; undefined means the backward-compatible root default. */
export function resolveDiscoveryConfig(text: string | undefined): ResolvedDiscoveryConfig {
  if (text === undefined) {
    return {
      schemaVersion: 1,
      artifactRoots: [...DEFAULT_ARTIFACT_ROOTS],
      configPath: null,
      configDigest: null,
    };
  }

  let parsed: unknown;
  try {
    const document = parseDocument(text, { strict: true, uniqueKeys: true });
    if (document.errors.length > 0) throw document.errors[0];
    if (document.warnings.length > 0) throw document.warnings[0];
    // A zero alias budget makes aliases/merge keys an explicit v1 error.
    parsed = document.toJS({ maxAliasCount: 0 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new DiscoveryConfigError(`${DISCOVERY_CONFIG_PATH}: invalid YAML: ${reason}`);
  }

  if (!isRecord(parsed)) throw new DiscoveryConfigError(`${DISCOVERY_CONFIG_PATH}: root must be a mapping`);
  assertOnlyKeys(parsed, ['schemaVersion', 'discovery'], DISCOVERY_CONFIG_PATH);
  if (parsed.schemaVersion !== 1) {
    throw new DiscoveryConfigError(`${DISCOVERY_CONFIG_PATH}: schemaVersion must be the number 1`);
  }
  if (!isRecord(parsed.discovery)) {
    throw new DiscoveryConfigError(`${DISCOVERY_CONFIG_PATH}: discovery must be a mapping`);
  }
  assertOnlyKeys(
    parsed.discovery,
    ['artifactRoots', 'artifactDirs'],
    `${DISCOVERY_CONFIG_PATH}.discovery`,
  );

  const hasRoots = 'artifactRoots' in parsed.discovery;
  const hasDirs = 'artifactDirs' in parsed.discovery;
  if (!hasRoots && !hasDirs) throw new DiscoveryConfigError(emptyDiscoveryMessage());

  let artifactRoots: string[] = [];
  if (hasRoots) {
    const rawRoots = parsed.discovery.artifactRoots;
    if (!Array.isArray(rawRoots) || rawRoots.length < 1 || rawRoots.length > MAX_ARTIFACT_ROOTS) {
      throw new DiscoveryConfigError(
        `${DISCOVERY_CONFIG_PATH}: discovery.artifactRoots must contain 1-${MAX_ARTIFACT_ROOTS} roots`,
      );
    }
    artifactRoots = rawRoots.map(normalizeArtifactRoot).sort(comparePaths);
    if (new Set(artifactRoots).size !== artifactRoots.length) {
      throw new DiscoveryConfigError(`${DISCOVERY_CONFIG_PATH}: discovery.artifactRoots contains duplicates`);
    }
  }
  const artifactDirs = hasDirs ? parseArtifactDirs(parsed.discovery.artifactDirs) : undefined;

  return {
    schemaVersion: 1,
    artifactRoots,
    ...(artifactDirs ? { artifactDirs } : {}),
    configPath: DISCOVERY_CONFIG_PATH,
    configDigest: digestConfig(artifactRoots, artifactDirs),
  };
}
