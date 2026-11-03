import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  statSync,
  type Stats,
} from 'node:fs';
import path from 'node:path';
import { type ArtifactManifest, validateAgentCard, validateManifest } from '@kihub/artifact-schema';
import {
  DISCOVERY_CONFIG_PATH,
  DiscoveryConfigError,
  normalizeRepository,
  resolveDiscoveryConfig,
  type ResolvedDiscoveryConfig,
} from './config';
import { artifactDirectoryDigest, digestKnownFiles, gitBlobOid } from './digest';

/** Type directories walked below every configured artifact root. */
export const TYPE_DIRS = [
  'skills',
  'prompts',
  'workflows',
  'mcp',
  'templates',
  'policies',
  'playbooks',
  'agents',
] as const;

type TypeDir = (typeof TYPE_DIRS)[number];
const TYPE_DIR_SET = new Set<string>(TYPE_DIRS);

export interface RawArtifact {
  /** Actual repository-relative folder, e.g. "src/skills/security-review". */
  path: string;
  /** Portable digest of the artifact directory's Git blobs. */
  contentDigest?: string;
  manifest?: ArtifactManifest;
  readme?: string;
  valid: boolean;
  errors?: string[];
  /** Parsed valid agent-card.json (015 US3) — set only for valid agents that ship one. */
  agentCard?: Record<string, unknown>;
  /** Card validation errors — the artifact itself stays valid (FR-012). */
  agentCardErrors?: string[];
}

export interface ScanOptions {
  /** Registered `owner/repo`; when present, manifests must name the same normalized repository. */
  expectedRepository?: string;
}

export interface DetailedScanResult {
  artifacts: RawArtifact[];
  config: ResolvedDiscoveryConfig;
}

/** A source of artifact bytes, independent of local checkout vs remote Git repository. */
export interface RepoReader {
  /** Actual repo-relative artifact directories beneath the supplied exact roots. */
  listArtifactDirs(artifactRoots?: readonly string[]): Promise<string[]>;
  /** File contents for a repo-relative path; undefined when absent. */
  readFile(relPath: string): Promise<string | undefined>;
  /** Optimized complete directory digest. Production local/GitHub readers implement this. */
  artifactDigest?(relPath: string): Promise<string>;
}

/** The type directory each artifact type must live under (015 manifest contract rule 4). */
const DIR_FOR_TYPE: Record<ArtifactManifest['type'], TypeDir> = {
  skill: 'skills',
  prompt: 'prompts',
  workflow: 'workflows',
  mcp: 'mcp',
  template: 'templates',
  policy: 'policies',
  playbook: 'playbooks',
  agent: 'agents',
};

interface ArtifactLocation {
  path: string;
  root: string;
  typeDir: TypeDir;
}

function repoJoin(...parts: string[]): string {
  return parts.filter((part) => part && part !== '.').join('/');
}

function locationFor(relPath: string, artifactRoots: readonly string[]): ArtifactLocation {
  if (relPath.startsWith('/') || relPath.includes('\\') || relPath.includes('\0')) {
    throw new DiscoveryConfigError(`Reader returned unsafe artifact directory ${JSON.stringify(relPath)}`);
  }
  for (const root of artifactRoots) {
    const prefix = root === '.' ? '' : `${root}/`;
    if (!relPath.startsWith(prefix)) continue;
    const remainder = relPath.slice(prefix.length);
    const parts = remainder.split('/');
    if (parts.length === 2 && TYPE_DIR_SET.has(parts[0] ?? '') && Boolean(parts[1])) {
      return { path: relPath, root, typeDir: parts[0] as TypeDir };
    }
  }
  throw new DiscoveryConfigError(
    `Reader returned artifact directory outside the configured <root>/<type>/<slug> layout: ${relPath}`,
  );
}

function sourceErrors(manifest: ArtifactManifest, location: ArtifactLocation, options: ScanOptions): string[] {
  const errors: string[] = [];
  const expectedDir = DIR_FOR_TYPE[manifest.type];
  if (location.typeDir !== expectedDir) {
    errors.push(
      `type: type '${manifest.type}' does not match directory '${location.typeDir}/' (expected '${expectedDir}/')`,
    );
  }
  if (manifest.source.path !== location.path) {
    errors.push(`source.path: '${manifest.source.path}' does not match discovered path '${location.path}'`);
  }
  if (options.expectedRepository) {
    try {
      const actual = normalizeRepository(manifest.source.repository);
      const expected = normalizeRepository(options.expectedRepository);
      if (actual !== expected) {
        errors.push(
          `source.repository: '${manifest.source.repository}' does not match discovery source '${options.expectedRepository}'`,
        );
      }
    } catch (error) {
      errors.push(`source.repository: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return errors;
}

/** Validate one manifest and its physical repository location into a RawArtifact. */
function toRawArtifact(
  location: ArtifactLocation,
  manifestText: string,
  readme: string | undefined,
  options: ScanOptions,
): RawArtifact {
  const res = validateManifest(manifestText);
  if (!res.valid) return { path: location.path, readme, valid: false, errors: res.errors };
  const errors = sourceErrors(res.data, location, options);
  if (errors.length > 0) return { path: location.path, readme, valid: false, errors };
  return { path: location.path, manifest: res.data, readme, valid: true };
}

function attachAgentCard(raw: RawArtifact, cardText: string | undefined): RawArtifact {
  if (cardText === undefined) return raw;
  const res = validateAgentCard(cardText);
  if (res.valid) return { ...raw, agentCard: res.data as Record<string, unknown> };
  return { ...raw, agentCardErrors: res.errors };
}

const isAgent = (raw: RawArtifact) => raw.valid && raw.manifest?.type === 'agent';

function containedPath(rootPath: string, relPath: string): string {
  const base = path.resolve(rootPath);
  const target = path.resolve(base, ...relPath.split('/'));
  const relative = path.relative(base, target);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new DiscoveryConfigError(`Path escapes repository root: ${relPath}`);
  }
  return target;
}

/** Read a Git-worktree path without following a symlink (Git stores its target text as blob bytes). */
function readLocalRepoFile(rootPath: string, relPath: string): string | undefined {
  const absolute = containedPath(rootPath, relPath);
  let stat: Stats;
  try {
    stat = lstatSync(absolute);
  } catch (error) {
    if (isMissingPathError(error)) return undefined;
    throw error;
  }
  if (stat.isSymbolicLink()) return readlinkSync(absolute, 'utf8');
  if (!stat.isFile()) return undefined;
  return readCheckedRegularFile(absolute, relPath, stat).toString('utf8');
}

function isMissingPathError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  return error.code === 'ENOENT' || error.code === 'ENOTDIR';
}

/** Open and read the same regular file that was inspected, refusing a final-component symlink. */
function readCheckedRegularFile(absolute: string, relPath: string, checked: Stats): Buffer {
  let descriptor: number | undefined;
  try {
    descriptor = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = fstatSync(descriptor);
    if (!opened.isFile() || opened.dev !== checked.dev || opened.ino !== checked.ino) {
      throw new DiscoveryConfigError(`File changed while scanning repository: ${relPath}`);
    }
    return readFileSync(descriptor);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error.code === 'ELOOP' || isMissingPathError(error))
    ) {
      throw new DiscoveryConfigError(`File changed while scanning repository: ${relPath}`);
    }
    throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function validateLocalRoot(rootPath: string, root: string): string {
  const baseReal = realpathSync(rootPath);
  const absolute = containedPath(rootPath, root);
  if (!existsSync(absolute) || !statSync(absolute).isDirectory()) {
    throw new DiscoveryConfigError(`Configured artifact root does not exist or is not a directory: ${root}`);
  }
  const rootReal = realpathSync(absolute);
  const relative = path.relative(baseReal, rootReal);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new DiscoveryConfigError(`Configured artifact root escapes repository through a symlink: ${root}`);
  }
  return absolute;
}

function listLocalArtifactDirs(rootPath: string, artifactRoots: readonly string[]): string[] {
  const dirs: string[] = [];
  for (const root of artifactRoots) {
    const absoluteRoot = validateLocalRoot(rootPath, root);
    for (const typeDir of TYPE_DIRS) {
      const absoluteTypeDir = path.join(absoluteRoot, typeDir);
      if (!existsSync(absoluteTypeDir) || !lstatSync(absoluteTypeDir).isDirectory()) continue;
      for (const entry of readdirSync(absoluteTypeDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const artifactDir = path.join(absoluteTypeDir, entry.name);
        if (!existsSync(path.join(artifactDir, 'artifact.yaml'))) continue;
        dirs.push(repoJoin(root, typeDir, entry.name));
      }
    }
  }
  return [...new Set(dirs)].sort((a, b) => a.localeCompare(b));
}

function localArtifactDigest(rootPath: string, artifactRelPath: string): string {
  const artifactDir = containedPath(rootPath, artifactRelPath);
  const entries: { path: string; blobOid: string }[] = [];

  function walk(absoluteDir: string, relativeDir = '') {
    for (const entry of readdirSync(absoluteDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(absoluteDir, entry.name);
      const relative = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        entries.push({ path: relative, blobOid: gitBlobOid(Buffer.from(readlinkSync(absolute))) });
      } else if (stat.isDirectory()) {
        walk(absolute, relative);
      } else if (stat.isFile()) {
        entries.push({ path: relative, blobOid: gitBlobOid(readCheckedRegularFile(absolute, relative, stat)) });
      }
    }
  }

  walk(artifactDir);
  return artifactDirectoryDigest(entries);
}

function scanLocalDetailed(rootPath: string, options: ScanOptions = {}): DetailedScanResult {
  const config = resolveDiscoveryConfig(readLocalRepoFile(rootPath, DISCOVERY_CONFIG_PATH));
  const artifacts: RawArtifact[] = [];
  for (const relPath of listLocalArtifactDirs(rootPath, config.artifactRoots)) {
    const location = locationFor(relPath, config.artifactRoots);
    const manifestText = readLocalRepoFile(rootPath, `${relPath}/artifact.yaml`);
    if (manifestText === undefined) continue;
    const readme = readLocalRepoFile(rootPath, `${relPath}/README.md`);
    let raw = toRawArtifact(location, manifestText, readme, options);
    if (isAgent(raw)) raw = attachAgentCard(raw, readLocalRepoFile(rootPath, `${relPath}/agent-card.json`));
    raw.contentDigest = localArtifactDigest(rootPath, relPath);
    artifacts.push(raw);
  }
  return { artifacts, config };
}

/** Synchronous local scan retained for the break-glass CLI and existing callers. */
export function scan(rootPath: string, options: ScanOptions = {}): RawArtifact[] {
  return scanLocalDetailed(rootPath, options).artifacts;
}

/** A complete local filesystem RepoReader, including portable artifact-directory digesting. */
export function createLocalReader(rootPath: string): RepoReader {
  return {
    async listArtifactDirs(artifactRoots = ['.']) {
      return listLocalArtifactDirs(rootPath, artifactRoots);
    },
    async readFile(relPath) {
      return readLocalRepoFile(rootPath, relPath);
    },
    async artifactDigest(relPath) {
      return localArtifactDigest(rootPath, relPath);
    },
  };
}

/** Resolve config + scan a source, returning provenance alongside artifacts. */
export async function scanRepoDetailed(
  reader: RepoReader,
  options: ScanOptions = {},
): Promise<DetailedScanResult> {
  const config = resolveDiscoveryConfig(await reader.readFile(DISCOVERY_CONFIG_PATH));
  const artifacts: RawArtifact[] = [];
  const dirs = [...new Set(await reader.listArtifactDirs(config.artifactRoots))].sort((a, b) =>
    a.localeCompare(b),
  );
  for (const relPath of dirs) {
    const location = locationFor(relPath, config.artifactRoots);
    const manifestText = await reader.readFile(`${relPath}/artifact.yaml`);
    if (manifestText === undefined) continue;
    const readme = await reader.readFile(`${relPath}/README.md`);
    let raw = toRawArtifact(location, manifestText, readme, options);
    let cardText: string | undefined;
    if (isAgent(raw)) {
      cardText = await reader.readFile(`${relPath}/agent-card.json`);
      raw = attachAgentCard(raw, cardText);
    }
    raw.contentDigest = reader.artifactDigest
      ? await reader.artifactDigest(relPath)
      : digestKnownFiles({
          'artifact.yaml': manifestText,
          'README.md': readme,
          'agent-card.json': cardText,
        });
    artifacts.push(raw);
  }
  return { artifacts, config };
}

/** Backward-compatible artifact-array wrapper over the detailed repository scan. */
export async function scanRepo(reader: RepoReader, options: ScanOptions = {}): Promise<RawArtifact[]> {
  return (await scanRepoDetailed(reader, options)).artifacts;
}
