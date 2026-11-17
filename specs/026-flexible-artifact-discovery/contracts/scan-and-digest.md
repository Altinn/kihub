# Contract: Configured Scan, Source Validation & Content Digest

## Public surface

```ts
interface RepoReader {
  listArtifactDirs(artifactRoots?: readonly string[]): Promise<string[]>;
  readFile(relPath: string): Promise<string | undefined>;
  artifactDigest?(relPath: string): Promise<string>;
}

interface ScanOptions {
  expectedRepository?: string;
}

interface DetailedScanResult {
  artifacts: RawArtifact[];
  config: ResolvedDiscoveryConfig;
}

function scanRepoDetailed(reader: RepoReader, options?: ScanOptions): Promise<DetailedScanResult>;
function scanRepo(reader: RepoReader, options?: ScanOptions): Promise<RawArtifact[]>;
function scan(rootPath: string, options?: ScanOptions): RawArtifact[];
```

`scanRepo()` delegates to the detailed form and returns only `.artifacts`, preserving callers.

## Scan order

1. Read and resolve root `kihub.yaml`.
2. Ask the reader to enumerate exact artifact directories beneath the resolved roots.
3. Sort/deduplicate actual directories for deterministic duplicate-ID precedence.
4. Read `artifact.yaml` and optional README.
5. Validate manifest schema.
6. Validate manifest type against the type directory relative to its matched root.
7. Validate `source.path` against the actual repository-relative artifact directory.
8. When `expectedRepository` is provided, normalize and compare `source.repository`.
9. Read/validate an agent card only for a valid `type: agent`, preserving current behavior.
10. Compute content digest using the reader optimization or known-file fallback.

Path/repository mismatches produce invalid `RawArtifact` records so the run report identifies their
paths. Config/root/tree failures throw and prevent reconcile.

## Repository normalization

Both values must be `owner/repo`. Comparison trims surrounding whitespace, removes one trailing
`.git`, and lowercases. Extra/missing path segments are invalid.

## Artifact directory digest v1

For each Git blob under the artifact directory recursively:

```text
gitBlobOid = sha1("blob " + byteLength + NUL + rawBytes)
record     = relativePath + NUL + gitBlobOid + LF
digest     = "sha256:" + sha256(concat(sortBy(relativePath, records)))
```

- Paths are relative to the artifact directory and use `/`; `sortBy` compares UTF-8 bytes
  (`comparePaths`), never `localeCompare`.
- File mode is not included.
- A Git symlink is hashed as its blob bytes (link target text), not followed.
- GitHub uses the recursive tree's blob `sha`; local scanning computes the Git blob OID. In a Git
  checkout the local scan hashes only tracked files (`git ls-files`, gitlinks skipped); outside Git,
  or for a never-committed artifact, it hashes every file on disk.
- GitHub file contents are read by blob sha from the same tree (`/git/blobs/{sha}`), never by ref.
- GitHub rejects `truncated: true` tree responses.
- The GitHub tree response is cached for enumeration and digesting within one reader/run.
- If a test/custom reader omits `artifactDigest`, the scanner applies the same aggregation to the
  bytes it already reads (`artifact.yaml`, README, and agent card). Production readers implement the
  complete directory method.

## Determinism invariants

- Byte-identical checked-out Git content produces equal local and GitHub digests.
- Directory entry order does not affect the digest.
- Repository-relative artifact root/path moves do not affect the digest.
- Any blob byte change, addition, removal, rename within the artifact directory changes the digest.
