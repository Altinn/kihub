import { type RepoReader, TYPE_DIRS } from '@kihub/discovery-core';

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

/**
 * Thrown for any non-recoverable GitHub transport/auth failure. The message deliberately carries
 * only the operation + HTTP status — never the token or headers (research §5).
 */
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
}

// TYPE_DIRS/<name>/artifact.yaml — the only blobs discovery cares about for directory enumeration.
const ARTIFACT_MANIFEST_RE = /^([^/]+)\/([^/]+)\/artifact\.yaml$/;
const TYPE_DIR_SET = new Set<string>(TYPE_DIRS);

/**
 * A `RepoReader` (contracts/github-client.md) backed by the GitHub REST API. `listArtifactDirs`
 * resolves the whole recursive git tree in one request and keeps the dirs holding an
 * `artifact.yaml`; `readFile` fetches a single raw blob, treating 404 as "absent" (a missing
 * README is normal) and any other non-OK status as a hard failure the caller records as a failed
 * run (FR-009).
 */
export function createGithubRepoReader(opts: GithubRepoReaderOptions): RepoReader {
  const { repo, ref = 'main', token } = opts;
  const doFetch = opts.fetchImpl ?? fetch;
  const apiBase = (opts.apiBase ?? 'https://api.github.com').replace(/\/$/, '');
  const [owner, name] = repo.split('/');
  if (!owner || !name) {
    throw new GithubClientError(`Invalid repo "${repo}" — expected "owner/repo"`);
  }
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'kihub-discovery',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  return {
    async listArtifactDirs() {
      const url = `${apiBase}/repos/${owner}/${name}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
      const res = await doFetch(url, {
        headers: { ...authHeaders, Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) {
        throw new GithubClientError(`Failed to list repo tree (${repo}@${ref})`, res.status);
      }
      const body = (await res.json()) as { tree?: GitTreeEntry[] };
      const dirs = new Set<string>();
      for (const entry of body.tree ?? []) {
        if (entry.type !== 'blob') continue;
        const m = ARTIFACT_MANIFEST_RE.exec(entry.path);
        if (!m) continue;
        const [, typeDir, slug] = m;
        if (typeDir && TYPE_DIR_SET.has(typeDir)) dirs.add(`${typeDir}/${slug}`);
      }
      return [...dirs];
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
  };
}
