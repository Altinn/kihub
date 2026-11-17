/**
 * Pure layout rules shared by the scanner and BOTH repository readers (028, research R4–R6).
 *
 * Everything discovery reads is modelled as a **container**: a repository directory plus the artifact
 * type expected there. An artifact is always `<container.dir>/<slug>/artifact.yaml`. The root layout
 * (`artifactRoots`) contributes eight containers per root; `artifactDirs` contributes one per entry.
 * Because the type, path and conflict decisions live here, the local and GitHub readers can only
 * differ in HOW they list folders — never in WHICH folders count.
 */
import { ARTIFACT_TYPES } from '@kihub/artifact-schema';
import { type ArtifactDirsMap, DiscoveryConfigError } from './config';
import { comparePaths } from './digest';
import { nestedMessage, rootClashMessage, twoTypesMessage } from './messages';
import { type ArtifactType, TYPE_DIRS, TYPE_FOR_DIR } from './types';

export interface ArtifactContainer {
  /** Repo-relative directory whose immediate subfolders are artifacts. */
  dir: string;
  /** The artifact type every artifact below `dir` must declare. */
  type: ArtifactType;
  /** True when `dir` is listed in `artifactDirs` (as opposed to only implied by a root). */
  listed: boolean;
}

export interface DiscoveryLayout {
  /** Sorted by `dir`, one entry per distinct `{dir, type}`. */
  containers: ArtifactContainer[];
  /** Directories that MUST exist at the ref: roots (except `.`) and every `artifactDirs` entry. */
  requiredDirs: string[];
}

export interface ArtifactLocation {
  /** Actual repo-relative artifact folder, e.g. "agents/_skills/tekstforfatter-docs". */
  path: string;
  /** The type configured for the container the folder was found in. */
  expectedType: ArtifactType;
  /** The container directory, used in error messages. */
  containerDir: string;
  /** Whether the container is listed in `artifactDirs`; see {@link assertNoNestedArtifacts}. */
  listed: boolean;
}

/** Join repo-relative parts, treating "." and empty parts as the repository root. */
export function repoJoin(...parts: string[]): string {
  return parts.filter((part) => part && part !== '.').join('/');
}

type LayoutConfig = { artifactRoots: readonly string[]; artifactDirs?: ArtifactDirsMap };

export function buildLayout(config: LayoutConfig): DiscoveryLayout {
  const byDir = new Map<string, { type: ArtifactType; fromRoot: boolean; listed: boolean }>();
  const required = new Set<string>();

  for (const root of config.artifactRoots) {
    if (root !== '.') required.add(root);
    for (const typeDir of TYPE_DIRS) {
      byDir.set(repoJoin(root, typeDir), { type: TYPE_FOR_DIR[typeDir], fromRoot: true, listed: false });
    }
  }

  for (const type of ARTIFACT_TYPES) {
    for (const dir of config.artifactDirs?.[type] ?? []) {
      required.add(dir);
      const existing = byDir.get(dir);
      if (!existing) {
        byDir.set(dir, { type, fromRoot: false, listed: true });
      } else if (existing.type !== type) {
        // Type decides governance and search, so an ambiguity is never resolved silently.
        throw new DiscoveryConfigError(
          existing.fromRoot
            ? rootClashMessage(dir, type, existing.type)
            : twoTypesMessage(dir, existing.type, type),
        );
      }
      // Same {dir, type} reached twice (root layout and a listed dir): one container, listed once.
      else existing.listed = true;
    }
  }

  const containers = [...byDir.entries()]
    .map(([dir, { type, listed }]) => ({ dir, type, listed }))
    .sort((a, b) => comparePaths(a.dir, b.dir));
  return { containers, requiredDirs: [...required].sort(comparePaths) };
}

/** The layout for plain roots; the default is the repository root, as in 026. */
export function layoutForRoots(roots: readonly string[] = ['.']): DiscoveryLayout {
  return buildLayout({ artifactRoots: roots });
}

/**
 * For readers that hold a flat list of file paths (the GitHub tree): the artifact folders whose
 * `artifact.yaml` sits exactly at `<container>/<slug>/artifact.yaml`. Sorted and deduplicated.
 */
export function matchArtifactDirs(layout: DiscoveryLayout, manifestPaths: Iterable<string>): string[] {
  const containerDirs = new Set(layout.containers.map((c) => c.dir));
  const dirs = new Set<string>();
  for (const manifestPath of manifestPaths) {
    if (!manifestPath.endsWith('/artifact.yaml')) continue;
    const slugDir = manifestPath.slice(0, -'/artifact.yaml'.length);
    const slash = slugDir.lastIndexOf('/');
    if (slash <= 0) continue;
    if (!slugDir.slice(slash + 1)) continue;
    if (containerDirs.has(slugDir.slice(0, slash))) dirs.add(slugDir);
  }
  return [...dirs].sort(comparePaths);
}

/** Resolve a reader-reported folder to its container; a folder outside every container is a bug. */
export function locateArtifact(layout: DiscoveryLayout, relPath: string): ArtifactLocation {
  if (relPath.startsWith('/') || relPath.includes('\\') || relPath.includes('\0')) {
    throw new DiscoveryConfigError(`Reader returned unsafe artifact directory ${JSON.stringify(relPath)}`);
  }
  const slash = relPath.lastIndexOf('/');
  const containerDir = slash > 0 ? relPath.slice(0, slash) : '';
  const container = layout.containers.find((c) => c.dir === containerDir);
  if (!container || !relPath.slice(slash + 1)) {
    throw new DiscoveryConfigError(
      `Reader returned artifact directory outside the configured layout: ${relPath}`,
    );
  }
  return { path: relPath, expectedType: container.type, containerDir, listed: container.listed };
}

/**
 * Two artifact folders must never contain one another: their content digests would overlap, so
 * editing the inner artifact would silently stale the outer one's approval. Fail closed instead.
 *
 * `listed` restricts the check to pairs where at least one folder was found through `artifactDirs`.
 * 026 never rejected nesting between root-layout artifacts (the outer digest simply covers the inner
 * files), and roots-only configs must behave exactly as they did there (FR-013). Omit it to check
 * every pair.
 */
export function assertNoNestedArtifacts(paths: readonly string[], listed?: ReadonlySet<string>): void {
  const all = new Set(paths);
  for (const inner of [...all].sort(comparePaths)) {
    for (let slash = inner.lastIndexOf('/'); slash > 0; slash = inner.lastIndexOf('/', slash - 1)) {
      const outer = inner.slice(0, slash);
      if (!all.has(outer)) continue;
      if (listed && !listed.has(outer) && !listed.has(inner)) continue;
      throw new DiscoveryConfigError(nestedMessage(outer, inner));
    }
  }
}

/** The artifact folders (of `paths`) that sit in a container listed in `artifactDirs`. */
export function listedArtifactDirs(layout: DiscoveryLayout, paths: readonly string[]): Set<string> {
  return new Set(paths.filter((path) => locateArtifact(layout, path).listed));
}
