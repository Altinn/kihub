# Contract: `@kihub/github-client`

Pure, Payload-agnostic GitHub repo reader (constitution-named package). Constructor-injectable
`fetch` for testability. Produces a `RepoReader` consumed by `@kihub/discovery-core.scanRepo`.

## Public surface

```ts
export interface GithubRepoReaderOptions {
  repo: string;            // "owner/repo"
  ref?: string;            // branch/ref, default "main"
  token: string;          // GitHub token (from env; never logged)
  fetchImpl?: typeof fetch; // injectable for tests; defaults to global fetch
}

// Returns a RepoReader (interface defined by @kihub/discovery-core).
export function createGithubRepoReader(opts: GithubRepoReaderOptions): RepoReader;
```

## Behavior

- `listArtifactDirs()` → resolves the recursive git tree
  (`GET /repos/{owner}/{repo}/git/trees/{ref}?recursive=1`) and returns the set of directories
  under the known `TYPE_DIRS` that contain an `artifact.yaml` (repo-relative, e.g.
  `skills/security-review`).
- `readFile(path)` → fetches a single blob (raw media type) for a repo-relative path; resolves
  `undefined` for a `404` (missing README is normal), throws for other transport/auth errors.
- Sends `Authorization: Bearer <token>` and a `User-Agent`; never includes the token in thrown
  error messages or return values.

## Failure contract

- Auth failure (`401`/`403`) and unreachable host → throw a typed error the caller (`runDiscovery`)
  records as a **failed run**; existing catalog entries are left intact (FR-009).
- A truncated git tree (very large repos) → out of scope for the phase (small catalog); documented
  as a future concern.

## Tests (unit, faked `fetch`)

- Tree response → correct `listArtifactDirs()` set (only dirs with `artifact.yaml`).
- Blob read returns file contents; `404` → `undefined`; `500` → throws.
- Token never appears in error output.
