import {
  artifactDirectoryDigest,
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

/**
 * GitHub-backed RepoReader. One cached recursive tree powers exact configured-root enumeration and
 * complete artifact-directory digests; individual content reads remain raw blob requests.
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

  let treePromise: Promise<GitTreeEntry[]> | undefined;
  function loadTree(): Promise<GitTreeEntry[]> {
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
      return body.tree ?? [];
    })();
    return treePromise;
  }

  return {
    async listArtifactDirs(artifactRoots = ['.']) {
      const roots = artifactRoots.map(normalizeArtifactRoot);
      const tree = await loadTree();
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
      return [...dirs].sort((a, b) => a.localeCompare(b));
    },

    async readFile(relPath) {
      const url = `${apiBase}/repos/${owner}/${name}/contents/${relPath}?ref=${encodeURIComponent(ref)}`;
      const res = await doFetch(url, {
        headers: { ...authHeaders, Accept: 'application/vnd.github.raw+json' },
      });
      if (res.status === 404) return undefined;
      if (!res.ok) {
        throw new GithubClientError(`Failed to read ${relPath} (${repo}@${ref})`, res.status);
      }
      return res.text();
    },

    async artifactDigest(relPath) {
      const tree = await loadTree();
      const prefix = `${relPath}/`;
      const entries = tree
        .filter((entry) => entry.type === 'blob' && entry.path.startsWith(prefix))
        .map((entry) => {
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
