import {
  artifactDirectoryDigest,
  comparePaths,
  normalizeArtifactRoot,
  type RepoReader,
  TYPE_DIRS,
} from '@kihub/discovery-core';

export interface GithubRepoReaderOptions {
  /** "owner/repo", e.g. "digdir/ai-artifacts". */
  repo: string;
  /** Branch/ref to read; defaults to "main". */
  ref?: string;
  /** GitHub token. Read from env by the caller — never logged or echoed. */
  token: string;
  /** Injectable fetch for tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /** API base; overridable for GitHub Enterprise. Defaults to the public API. */
  apiBase?: string;
}

export class GithubClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'GithubClientError';
  }
}

interface GitTreeEntry {
  path: string;
  type: string;
  sha?: string;
}

const TYPE_DIR_SET = new Set<string>(TYPE_DIRS);

/** One pass over the tree: each blob joins every enclosing known artifact directory. */
function groupBlobsByArtifactDir(
  blobs: ReadonlyMap<string, GitTreeEntry>,
  artifactDirs: ReadonlySet<string>,
): Map<string, GitTreeEntry[]> {
  const grouped = new Map<string, GitTreeEntry[]>();
  for (const entry of blobs.values()) {
    for (let slash = entry.path.lastIndexOf('/'); slash > 0; slash = entry.path.lastIndexOf('/', slash - 1)) {
      const dir = entry.path.slice(0, slash);
      if (!artifactDirs.has(dir)) continue;
      const list = grouped.get(dir) ?? [];
      list.push(entry);
      grouped.set(dir, list);
    }
  }
  return grouped;
}

interface TreeSnapshot {
  entries: GitTreeEntry[];
  /** Blob entries by repo-relative path. */
  blobs: Map<string, GitTreeEntry>;
}

/**
 * GitHub-backed RepoReader. One cached recursive tree is the scan's single snapshot: enumeration,
 * digests AND file contents all come from it (contents are fetched by blob sha), so a push landing
 * mid-scan can never pair one commit's manifest with another commit's digest.
 */
export function createGithubRepoReader(opts: GithubRepoReaderOptions): RepoReader {
  const { repo, ref = 'main', token } = opts;
  const doFetch = opts.fetchImpl ?? fetch;
  const apiBase = (opts.apiBase ?? 'https://api.github.com').replace(/\/$/, '');
  const parts = repo.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new GithubClientError(`Invalid repo "${repo}" — expected "owner/repo"`);
  }
  const [owner, name] = parts as [string, string];
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'kihub-discovery',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  let treePromise: Promise<TreeSnapshot> | undefined;
  // Artifact dirs reported by listArtifactDirs; their blobs are grouped once for digesting.
  const knownArtifactDirs = new Set<string>();
  let blobsByDir: Map<string, GitTreeEntry[]> | undefined;
  function loadTree(): Promise<TreeSnapshot> {
    treePromise ??= (async () => {
      const url = `${apiBase}/repos/${owner}/${name}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
      const res = await doFetch(url, {
        headers: { ...authHeaders, Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) throw new GithubClientError(`Failed to list repo tree (${repo}@${ref})`, res.status);
      const body = (await res.json()) as { tree?: GitTreeEntry[]; truncated?: boolean };
      if (body.truncated) {
        throw new GithubClientError(`Refusing truncated repo tree (${repo}@${ref})`);
      }
      const entries = body.tree ?? [];
      const blobs = new Map<string, GitTreeEntry>();
      for (const entry of entries) if (entry.type === 'blob') blobs.set(entry.path, entry);
      return { entries, blobs };
    })();
    return treePromise;
  }

  return {
    async listArtifactDirs(artifactRoots = ['.']) {
      const roots = artifactRoots.map(normalizeArtifactRoot);
      const tree = (await loadTree()).entries;
      for (const root of roots) {
        if (root === '.') continue;
        const prefix = `${root}/`;
        const exists = tree.some(
          (entry) => (entry.path === root && entry.type === 'tree') || entry.path.startsWith(prefix),
        );
        if (!exists) {
          throw new GithubClientError(
            `Configured artifact root does not exist in ${repo}@${ref}: ${root}`,
          );
        }
      }

      const dirs = new Set<string>();
      for (const entry of tree) {
        if (entry.type !== 'blob' || !entry.path.endsWith('/artifact.yaml')) continue;
        for (const root of roots) {
          const prefix = root === '.' ? '' : `${root}/`;
          if (!entry.path.startsWith(prefix)) continue;
          const remainder = entry.path.slice(prefix.length);
          const pathParts = remainder.split('/');
          if (
            pathParts.length === 3 &&
            TYPE_DIR_SET.has(pathParts[0] ?? '') &&
            Boolean(pathParts[1]) &&
            pathParts[2] === 'artifact.yaml'
          ) {
            dirs.add(`${prefix}${pathParts[0]}/${pathParts[1]}`);
          }
        }
      }
      for (const dir of dirs) knownArtifactDirs.add(dir);
      blobsByDir = undefined;
      return [...dirs].sort(comparePaths);
    },

    async readFile(relPath) {
      const entry = (await loadTree()).blobs.get(relPath);
      if (!entry) return undefined; // absent from the snapshot, e.g. a missing README
      if (!entry.sha) throw new GithubClientError(`Missing blob sha for ${relPath} (${repo}@${ref})`);
      const url = `${apiBase}/repos/${owner}/${name}/git/blobs/${entry.sha}`;
      const res = await doFetch(url, {
        headers: { ...authHeaders, Accept: 'application/vnd.github.raw+json' },
      });
      if (!res.ok) {
        throw new GithubClientError(`Failed to read ${relPath} (${repo}@${ref})`, res.status);
      }
      return res.text();
    },

    async artifactDigest(relPath) {
      const { blobs } = await loadTree();
      const prefix = `${relPath}/`;
      blobsByDir ??= groupBlobsByArtifactDir(blobs, knownArtifactDirs);
      const candidates =
        blobsByDir.get(relPath) ?? [...blobs.values()].filter((entry) => entry.path.startsWith(prefix));
      const entries = candidates.map((entry) => {
        if (!entry.sha) throw new GithubClientError(`Missing blob sha for ${entry.path} (${repo}@${ref})`);
        return { path: entry.path.slice(prefix.length), blobOid: entry.sha };
      });
      if (entries.length === 0) {
        throw new GithubClientError(`Artifact directory has no blobs: ${relPath} (${repo}@${ref})`);
      }
      return artifactDirectoryDigest(entries);
    },
  };
}
