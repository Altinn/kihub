import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { type ArtifactManifest, validateManifest } from '@kihub/artifact-schema';

/** Type directories walked under the repo root; each subfolder with an artifact.yaml is one artifact. */
export const TYPE_DIRS = [
  'skills',
  'prompts',
  'workflows',
  'mcp',
  'templates',
  'policies',
  'playbooks',
] as const;

export interface RawArtifact {
  /** Repo-relative folder, e.g. "skills/security-review". */
  path: string;
  manifest?: ArtifactManifest;
  readme?: string;
  valid: boolean;
  errors?: string[];
}

/**
 * A source of artifact bytes, independent of where they live (local checkout or remote repo).
 * `scanRepo` walks this so the identical validation logic serves the Phase 2 CLI (local) and
 * Phase 4 automated discovery (GitHub) — contracts/discovery-core-scanrepo.md.
 */
export interface RepoReader {
  /** Repo-relative dirs under TYPE_DIRS that contain an artifact.yaml (e.g. "skills/foo"). */
  listArtifactDirs(): Promise<string[]>;
  /** File contents for a repo-relative path; undefined when absent (e.g. a missing README.md). */
  readFile(relPath: string): Promise<string | undefined>;
}

/** Validate one artifact dir's manifest (+ optional README) into a RawArtifact. Never throws. */
function toRawArtifact(relPath: string, manifestText: string, readme: string | undefined): RawArtifact {
  const res = validateManifest(manifestText);
  if (res.valid) return { path: relPath, manifest: res.data, readme, valid: true };
  return { path: relPath, readme, valid: false, errors: res.errors };
}

/**
 * Scan a local ai-artifacts checkout at `rootPath`. Reads each artifact's `artifact.yaml` and
 * sibling `README.md`, validating the manifest with `@kihub/artifact-schema`. Invalid manifests are
 * returned with `valid:false` + errors (never thrown); a missing README is fine. Synchronous and
 * behaviourally unchanged from Phase 2 — the CLI and existing tests depend on it.
 */
export function scan(rootPath: string): RawArtifact[] {
  const results: RawArtifact[] = [];

  for (const dir of TYPE_DIRS) {
    const typeDir = path.join(rootPath, dir);
    if (!existsSync(typeDir) || !statSync(typeDir).isDirectory()) continue;

    for (const entry of readdirSync(typeDir)) {
      const artifactDir = path.join(typeDir, entry);
      if (!statSync(artifactDir).isDirectory()) continue;

      const manifestPath = path.join(artifactDir, 'artifact.yaml');
      if (!existsSync(manifestPath)) continue;

      const relPath = `${dir}/${entry}`;
      const readmePath = path.join(artifactDir, 'README.md');
      const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : undefined;

      results.push(toRawArtifact(relPath, readFileSync(manifestPath, 'utf8'), readme));
    }
  }

  return results;
}

/** A `RepoReader` over a local filesystem checkout — the source-agnostic form of `scan`. */
export function createLocalReader(rootPath: string): RepoReader {
  return {
    async listArtifactDirs() {
      const dirs: string[] = [];
      for (const dir of TYPE_DIRS) {
        const typeDir = path.join(rootPath, dir);
        if (!existsSync(typeDir) || !statSync(typeDir).isDirectory()) continue;
        for (const entry of readdirSync(typeDir)) {
          const artifactDir = path.join(typeDir, entry);
          if (!statSync(artifactDir).isDirectory()) continue;
          if (!existsSync(path.join(artifactDir, 'artifact.yaml'))) continue;
          dirs.push(`${dir}/${entry}`);
        }
      }
      return dirs;
    },
    async readFile(relPath) {
      const abs = path.join(rootPath, relPath);
      return existsSync(abs) ? readFileSync(abs, 'utf8') : undefined;
    },
  };
}

/**
 * Source-agnostic scan: for each artifact dir a `RepoReader` reports, read `artifact.yaml`
 * (skipping the dir if it has none) and the optional `README.md`, then validate. Same
 * `RawArtifact[]` output as `scan`; feeds the unchanged `reconcile`.
 */
export async function scanRepo(reader: RepoReader): Promise<RawArtifact[]> {
  const results: RawArtifact[] = [];
  const dirs = await reader.listArtifactDirs();
  for (const relPath of dirs) {
    const manifestText = await reader.readFile(`${relPath}/artifact.yaml`);
    if (manifestText === undefined) continue;
    const readme = await reader.readFile(`${relPath}/README.md`);
    results.push(toRawArtifact(relPath, manifestText, readme));
  }
  return results;
}
