import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { type ArtifactManifest, validateAgentCard, validateManifest } from '@kihub/artifact-schema';

/** Type directories walked under the repo root; each subfolder with an artifact.yaml is one artifact. */
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

export interface RawArtifact {
  /** Repo-relative folder, e.g. "skills/security-review". */
  path: string;
  manifest?: ArtifactManifest;
  readme?: string;
  valid: boolean;
  errors?: string[];
  /** Parsed valid agent-card.json (015 US3) — set only for valid agents that ship one. */
  agentCard?: Record<string, unknown>;
  /** Card validation errors — the artifact itself stays valid (FR-012). */
  agentCardErrors?: string[];
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

/** The type directory each artifact type must live under (015 manifest contract rule 4). */
const DIR_FOR_TYPE: Record<ArtifactManifest['type'], (typeof TYPE_DIRS)[number]> = {
  skill: 'skills',
  prompt: 'prompts',
  workflow: 'workflows',
  mcp: 'mcp',
  template: 'templates',
  policy: 'policies',
  playbook: 'playbooks',
  agent: 'agents',
};

/**
 * Validate one artifact dir's manifest (+ optional README) into a RawArtifact. Never throws.
 * A schema-valid manifest whose `type` does not match its type directory is reported invalid
 * (015 US2-3): the directory decides where discovery looks, so a mismatch is always an authoring
 * error rather than something to silently register.
 */
function toRawArtifact(relPath: string, manifestText: string, readme: string | undefined): RawArtifact {
  const res = validateManifest(manifestText);
  if (!res.valid) return { path: relPath, readme, valid: false, errors: res.errors };

  const dir = relPath.split('/')[0] ?? '';
  const expected = DIR_FOR_TYPE[res.data.type];
  if (dir !== expected) {
    return {
      path: relPath,
      readme,
      valid: false,
      errors: [`type: type '${res.data.type}' does not match directory '${dir}/' (expected '${expected}/')`],
    };
  }
  return { path: relPath, manifest: res.data, readme, valid: true };
}

/**
 * Attach the optional sibling agent-card.json to a valid agent's RawArtifact (015 US3).
 * Cards are only ever consulted for valid `type: agent` manifests (FR-014); an absent file is
 * normal, and an invalid card records errors WITHOUT invalidating the artifact (FR-012).
 */
function attachAgentCard(raw: RawArtifact, cardText: string | undefined): RawArtifact {
  if (cardText === undefined) return raw;
  const res = validateAgentCard(cardText);
  if (res.valid) return { ...raw, agentCard: res.data as Record<string, unknown> };
  return { ...raw, agentCardErrors: res.errors };
}

const isAgent = (raw: RawArtifact) => raw.valid && raw.manifest?.type === 'agent';

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

      let raw = toRawArtifact(relPath, readFileSync(manifestPath, 'utf8'), readme);
      if (isAgent(raw)) {
        const cardPath = path.join(artifactDir, 'agent-card.json');
        raw = attachAgentCard(raw, existsSync(cardPath) ? readFileSync(cardPath, 'utf8') : undefined);
      }
      results.push(raw);
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
    let raw = toRawArtifact(relPath, manifestText, readme);
    if (isAgent(raw)) {
      // One extra read per AGENT only (never for other types — FR-014); 404 → undefined → no card.
      raw = attachAgentCard(raw, await reader.readFile(`${relPath}/agent-card.json`));
    }
    results.push(raw);
  }
  return results;
}
