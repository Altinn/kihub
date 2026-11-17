# Contract: layout, scan and conflict rules

Extends [`specs/026-flexible-artifact-discovery/contracts/scan-and-digest.md`](../../026-flexible-artifact-discovery/contracts/scan-and-digest.md).
Digest, GitHub blob reading, truncated-tree failure and reconcile behaviour are unchanged.

## Public surface (`@kihub/discovery-core`)

```ts
interface ArtifactContainer { dir: string; type: ArtifactType; listed: boolean }
interface DiscoveryLayout { containers: ArtifactContainer[]; requiredDirs: string[] }

buildLayout(config: ResolvedDiscoveryConfig): DiscoveryLayout        // may throw DiscoveryConfigError
layoutForRoots(roots?: readonly string[]): DiscoveryLayout           // default ['.']
matchArtifactDirs(layout, manifestPaths: Iterable<string>): string[] // sorted, deduped artifact dirs
locateArtifact(layout, relPath): { path: string; expectedType: ArtifactType; containerDir: string; listed: boolean }
assertNoNestedArtifacts(paths, listed?: ReadonlySet<string>): void   // throws DiscoveryConfigError
listedArtifactDirs(layout, paths): Set<string>                       // folders in artifactDirs containers

interface RepoReader {
  listArtifactDirs(layout?: DiscoveryLayout): Promise<string[]>;     // omitted ⇒ layoutForRoots()
  readFile(relPath: string): Promise<string | undefined>;
  artifactDigest?(relPath: string): Promise<string>;
}
```

`TYPE_DIRS` stays exported (root layout convention). The 026 form `listArtifactDirs(artifactRoots)` is
replaced; existing fakes that take no argument keep working.

## Layout derivation

1. For each root `R`: containers `{join(R,"skills"),skill}`, `{join(R,"prompts"),prompt}`, …, eight in all.
   `R` (unless `.`) joins `requiredDirs`.
2. For each `artifactDirs[T]` entry `D`: container `{D,T}`; `D` joins `requiredDirs`.
3. Collapse identical `{dir,type}`; sort by `dir` (UTF-8 bytes).
4. Same `dir` with two types ⇒ `DiscoveryConfigError`.

## Reader behaviour (both readers)

1. Every `requiredDirs` entry exists as a directory at the ref, else the scan fails.
2. For each container directory that exists: its immediate subfolders that contain `artifact.yaml`.
   A container directory that does not exist is skipped **unless** it is in `requiredDirs`.
3. Return sorted, deduplicated artifact folders. Never read outside the repository (local reader keeps
   the 026 symlink containment checks; GitHub reader reads only from the cached tree).

## Scanner behaviour

1. `resolveDiscoveryConfig` → `buildLayout` → reader → `assertNoNestedArtifacts` (scoped by `listedArtifactDirs`; roots-only nesting stays allowed as in 026) → per folder
   `locateArtifact` → manifest validation.
2. Checks per manifest, collected into `errors` (artifact invalid, not registered, scan continues):
   - `type`: `type '<manifest.type>' does not match the type '<expectedType>' configured for '<container dir>'`
   - `source.path`: `'<manifest.source.path>' does not match discovered path '<path>'` (unchanged)
   - `source.repository`: unchanged.

## Whole-scan failure messages (typed `DiscoveryConfigError`, run recorded as failed)

| Cause | Message (prefix is fixed; the rest names the offending value) |
|-------|------|
| neither key | `kihub.yaml.discovery: set artifactRoots, artifactDirs or both` |
| unknown type | `kihub.yaml.discovery.artifactDirs: unknown type 'skills' (valid: skill, prompt, workflow, mcp, template, policy, playbook, agent)`; plural names add `- did you mean 'skill'?` |
| bad list / entry | `kihub.yaml.discovery.artifactDirs.skill: …` (`must be a non-empty list`, `unsafe directory`, `'.' is not allowed`, `duplicate`) |
| over limit | `kihub.yaml.discovery.artifactDirs: at most 32 directories in total` |
| two types, one dir | `kihub.yaml.discovery.artifactDirs: 'agents/_skills' is listed for both 'agent' and 'skill'` |
| root layout clash | `kihub.yaml.discovery.artifactDirs: 'agents' is listed for 'skill' but the root layout reads it as 'agent'` |
| missing dir | local: `Configured artifact directory does not exist or is not a directory: <dir>`; GitHub: `Configured artifact directory does not exist in <repo>@<ref>: <dir>` |
| nested artifacts (at least one found through `artifactDirs`) | `Artifact folders overlap: '<outer>' contains '<inner>'` |

Messages must not echo file contents beyond the offending path/key.

## Parity requirement

For identical Git content, the local reader (on a checkout) and the GitHub reader (on the same tree)
return the same folders in the same order, with the same `locateArtifact` results and digests. A shared
fixture table drives both readers in tests.
