import { createHash } from 'node:crypto';
import { parseDocument } from 'yaml';
import { comparePaths } from './digest';

export const DISCOVERY_CONFIG_PATH = 'kihub.yaml';
export const DEFAULT_ARTIFACT_ROOTS = ['.'] as const;
export const MAX_ARTIFACT_ROOTS = 32;

export interface ResolvedDiscoveryConfig {
  schemaVersion: 1;
  artifactRoots: string[];
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

function digestConfig(artifactRoots: readonly string[]): string {
  const canonical = JSON.stringify({ schemaVersion: 1, discovery: { artifactRoots } });
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
  assertOnlyKeys(parsed.discovery, ['artifactRoots'], `${DISCOVERY_CONFIG_PATH}.discovery`);

  const rawRoots = parsed.discovery.artifactRoots;
  if (!Array.isArray(rawRoots) || rawRoots.length < 1 || rawRoots.length > MAX_ARTIFACT_ROOTS) {
    throw new DiscoveryConfigError(
      `${DISCOVERY_CONFIG_PATH}: discovery.artifactRoots must contain 1-${MAX_ARTIFACT_ROOTS} roots`,
    );
  }
  const artifactRoots = rawRoots.map(normalizeArtifactRoot).sort(comparePaths);
  if (new Set(artifactRoots).size !== artifactRoots.length) {
    throw new DiscoveryConfigError(`${DISCOVERY_CONFIG_PATH}: discovery.artifactRoots contains duplicates`);
  }

  return {
    schemaVersion: 1,
    artifactRoots,
    configPath: DISCOVERY_CONFIG_PATH,
    configDigest: digestConfig(artifactRoots),
  };
}
