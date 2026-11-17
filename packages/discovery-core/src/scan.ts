import { execFileSync } from 'node:child_process';
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
import { artifactDirectoryDigest, comparePaths, digestKnownFiles, gitBlobOid } from './digest';
import {
  type ArtifactLocation,
  assertNoNestedArtifacts,
  buildLayout,
  type DiscoveryLayout,
  layoutForRoots,
  listedArtifactDirs,
  locateArtifact,
  repoJoin,
} from './layout';
import { missingDirMessage } from './messages';

export { TYPE_DIRS } from './types';

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
  /**
   * Actual repo-relative artifact folders (`<container>/<slug>`, one level) for a resolved layout.
   * Must fail when a required directory is missing. Omitted layout means the repository root.
   */
  listArtifactDirs(layout?: DiscoveryLayout): Promise<string[]>;
  /** File contents for a repo-relative path; undefined when absent. */
  readFile(relPath: string): Promise<string | undefined>;
  /** Optimized complete directory digest. Production local/GitHub readers implement this. */
  artifactDigest?(relPath: string): Promise<string>;
}

function sourceErrors(manifest: ArtifactManifest, location: ArtifactLocation, options: ScanOptions): string[] {
  const errors: string[] = [];
  if (location.expectedType !== manifest.type) {
    errors.push(
      `type: type '${manifest.type}' does not match the type '${location.expectedType}' configured for '${location.containerDir}'`,
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

/** Resolve a required directory inside the checkout; it must be a real directory that stays inside. */
function validateLocalDir(rootPath: string, dir: string): string {
  const baseReal = realpathSync(rootPath);
  const absolute = containedPath(rootPath, dir);
  if (!existsSync(absolute) || !statSync(absolute).isDirectory()) {
    throw new DiscoveryConfigError(missingDirMessage(dir));
  }
  const dirReal = realpathSync(absolute);
  const relative = path.relative(baseReal, dirReal);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new DiscoveryConfigError(`Configured artifact directory escapes repository through a symlink: ${dir}`);
  }
  return absolute;
}

function listLocalArtifactDirs(rootPath: string, layout: DiscoveryLayout): string[] {
  const required = new Set(layout.requiredDirs);
  for (const dir of layout.requiredDirs) validateLocalDir(rootPath, dir);
  const dirs: string[] = [];
  for (const container of layout.containers) {
    // A configured directory was validated above; a root-layout type directory is optional and, as
    // in 026, ignored when absent or when it is a symlink.
    const absoluteContainer = containedPath(rootPath, container.dir);
    if (!existsSync(absoluteContainer)) continue;
    if (!required.has(container.dir) && !lstatSync(absoluteContainer).isDirectory()) continue;
    for (const entry of readdirSync(absoluteContainer, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!existsSync(path.join(absoluteContainer, entry.name, 'artifact.yaml'))) continue;
      dirs.push(repoJoin(container.dir, entry.name));
    }
  }
  return [...new Set(dirs)].sort(comparePaths);
}

/**
 * Repo-relative paths Git tracks, when `rootPath` is itself the top of a Git checkout; undefined
 * otherwise (plain directories hash every file). Submodule gitlinks are skipped, matching the
 * GitHub tree reader, which only digests blobs.
 */
function gitTrackedFiles(rootPath: string): string[] | undefined {
  let topLevel: string;
  try {
    topLevel = execFileSync('git', ['-C', rootPath, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
  if (realpathSync(topLevel) !== realpathSync(rootPath)) return undefined;
  const listing = execFileSync('git', ['-C', rootPath, 'ls-files', '--stage', '-z'], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  const files: string[] = [];
  for (const record of listing.split('\0')) {
    // "<mode> <oid> <stage>\t<path>"
    const tab = record.indexOf('\t');
    if (tab < 0) continue;
    if (record.startsWith('160000 ')) continue;
    files.push(record.slice(tab + 1));
  }
  return [...new Set(files)];
}

/**
 * Digest one artifact directory from the working tree. Inside a Git checkout only tracked files
 * count (once the artifact has any), so untracked/ignored files (.DS_Store, node_modules, a local
 * .env) never change the digest, and a clean checkout digests exactly like the GitHub reader.
 */
function localArtifactDigest(
  rootPath: string,
  artifactRelPath: string,
  tracked: readonly string[] | undefined,
): string {
  const artifactDir = containedPath(rootPath, artifactRelPath);
  const entries: { path: string; blobOid: string }[] = [];

  function addFile(absolute: string, relative: string) {
    let stat: Stats;
    try {
      stat = lstatSync(absolute);
    } catch (error) {
      if (isMissingPathError(error)) return; // tracked but deleted in the working tree
      throw error;
    }
    if (stat.isSymbolicLink()) {
      entries.push({ path: relative, blobOid: gitBlobOid(Buffer.from(readlinkSync(absolute))) });
    } else if (stat.isFile()) {
      entries.push({ path: relative, blobOid: gitBlobOid(readCheckedRegularFile(absolute, relative, stat)) });
    }
  }

  const prefix = `${artifactRelPath}/`;
  const trackedHere = tracked?.filter((file) => file.startsWith(prefix)) ?? [];
  // A never-committed artifact has no tracked files; digest what is on disk rather than nothing.
  if (trackedHere.length > 0) {
    for (const file of trackedHere) addFile(containedPath(rootPath, file), file.slice(prefix.length));
    return artifactDirectoryDigest(entries);
  }

  function walk(absoluteDir: string, relativeDir = '') {
    for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
      const absolute = path.join(absoluteDir, entry.name);
      const relative = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(absolute, relative);
      else addFile(absolute, relative);
    }
  }

  walk(artifactDir);
  return artifactDirectoryDigest(entries);
}

function scanLocalDetailed(rootPath: string, options: ScanOptions = {}): DetailedScanResult {
  const config = resolveDiscoveryConfig(readLocalRepoFile(rootPath, DISCOVERY_CONFIG_PATH));
  const layout = buildLayout(config);
  const tracked = gitTrackedFiles(rootPath);
  const artifacts: RawArtifact[] = [];
  const dirs = listLocalArtifactDirs(rootPath, layout);
  assertNoNestedArtifacts(dirs, listedArtifactDirs(layout, dirs));
  for (const relPath of dirs) {
    const location = locateArtifact(layout, relPath);
    const manifestText = readLocalRepoFile(rootPath, `${relPath}/artifact.yaml`);
    if (manifestText === undefined) continue;
    const readme = readLocalRepoFile(rootPath, `${relPath}/README.md`);
    let raw = toRawArtifact(location, manifestText, readme, options);
    if (isAgent(raw)) raw = attachAgentCard(raw, readLocalRepoFile(rootPath, `${relPath}/agent-card.json`));
    raw.contentDigest = localArtifactDigest(rootPath, relPath, tracked);
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
  let tracked: string[] | undefined | null = null;
  return {
    async listArtifactDirs(layout = layoutForRoots()) {
      return listLocalArtifactDirs(rootPath, layout);
    },
    async readFile(relPath) {
      return readLocalRepoFile(rootPath, relPath);
    },
    async artifactDigest(relPath) {
      if (tracked === null) tracked = gitTrackedFiles(rootPath);
      return localArtifactDigest(rootPath, relPath, tracked);
    },
  };
}

/** Resolve config + scan a source, returning provenance alongside artifacts. */
export async function scanRepoDetailed(
  reader: RepoReader,
  options: ScanOptions = {},
): Promise<DetailedScanResult> {
  const config = resolveDiscoveryConfig(await reader.readFile(DISCOVERY_CONFIG_PATH));
  const layout = buildLayout(config);
  const artifacts: RawArtifact[] = [];
  const dirs = [...new Set(await reader.listArtifactDirs(layout))].sort(comparePaths);
  assertNoNestedArtifacts(dirs, listedArtifactDirs(layout, dirs));
  for (const relPath of dirs) {
    const location = locateArtifact(layout, relPath);
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
