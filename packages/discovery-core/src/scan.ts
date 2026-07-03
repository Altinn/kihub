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
 * Scan a local ai-artifacts checkout at `rootPath`. Reads each artifact's `artifact.yaml` and
 * sibling `README.md`, validating the manifest with `@kihub/artifact-schema`. Invalid manifests are
 * returned with `valid:false` + errors (never thrown); a missing README is fine.
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

      const res = validateManifest(readFileSync(manifestPath, 'utf8'));
      if (res.valid) {
        results.push({ path: relPath, manifest: res.data, readme, valid: true });
      } else {
        results.push({ path: relPath, readme, valid: false, errors: res.errors });
      }
    }
  }

  return results;
}
