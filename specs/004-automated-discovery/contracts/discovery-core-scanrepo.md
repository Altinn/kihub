# Contract: `@kihub/discovery-core` — `RepoReader` + `scanRepo` (extension)

Extends the Phase 2 package. The manifest-validation / `TYPE_DIRS` walk is factored behind a reader
interface so identical logic runs over a local checkout or a remote GitHub repo. **`reconcile` is
unchanged.**

## New / changed surface

```ts
export interface RepoReader {
  // Dirs under TYPE_DIRS that contain an artifact.yaml, repo-relative (e.g. "skills/foo").
  listArtifactDirs(): Promise<string[]>;
  // File contents for a repo-relative path; undefined if absent (e.g. missing README.md).
  readFile(path: string): Promise<string | undefined>;
}

// Source-agnostic scan: validates each dir's artifact.yaml + README via @kihub/artifact-schema,
// returning the same RawArtifact[] shape as Phase 2's scan().
export function scanRepo(reader: RepoReader): Promise<RawArtifact[]>;

// Bundled local-FS reader (wraps existing node:fs walk).
export function createLocalReader(rootPath: string): RepoReader;

// BACK-COMPAT: unchanged signature/behavior; now implemented as scanRepo(createLocalReader(root))
// exposed synchronously-compatible for the Phase 2 CLI + scan.test.ts.
export function scan(rootPath: string): RawArtifact[];
```

## Invariants (preserved from Phase 2)

- Invalid manifests → `RawArtifact{ valid:false, errors }`, never thrown; one bad artifact never
  aborts the scan (FR-003, SC-009).
- Missing `README.md` is fine (`readme: undefined`).
- Output feeds the **unchanged** `reconcile(payload, scanned)` → `IndexReport`.

## Tests

- `scanrepo.test.ts` (NEW): `scanRepo(fakeReader)` output === `scan(tempDir)` output for the same
  fixture set (parity), incl. an invalid-manifest case.
- `scan.test.ts` / `reconcile.test.ts` (EXISTING): remain green unchanged.
