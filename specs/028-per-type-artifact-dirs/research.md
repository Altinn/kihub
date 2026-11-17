# Research: Per-Type Artifact Directories in `kihub.yaml` (028)

No `NEEDS CLARIFICATION` remained after the spec. This file records the design decisions, with the
alternatives that were weighed. It builds on `specs/026-flexible-artifact-discovery/research.md`.

## R1 — Keys of `artifactDirs` are the singular manifest type names

**Decision**: `discovery.artifactDirs` maps `skill | prompt | workflow | mcp | template | policy |
playbook | agent` to a list of directories. Any other key fails the scan. When the key equals a
root-layout directory name (`skills`, `agents`, …) the error also says "use the type name `skill`".

**Rationale**: Teams already write `type: skill` in every `artifact.yaml`, so the config reads in the
same vocabulary. The existing `TYPE_DIRS`/`DIR_FOR_TYPE` pair stays as the root layout's convention
only; it is not widened into a second naming scheme.

**Alternatives**: Plural directory names as keys (`skills:`) — rejected, easy to confuse "the type" with
"a folder called skills" and it would make `agents: [agents/_skills]` read ambiguously. A flat list of
`{path, type}` objects — rejected for v1 (more verbose, harder to validate for duplicates, and the
map form groups naturally by type).

## R2 — `.` is not allowed as an `artifactDirs` entry

**Decision**: Reuse `normalizeArtifactRoot` for path safety, then reject `.` for directories.

**Rationale**: A directory entry must name a real container folder. With `.`, every top-level folder of
the repository would become an artifact candidate, which approaches the "arbitrary crawler" that 026
deliberately rejected. A repository that wants root-level artifacts keeps using `artifactRoots`.
Loosening later is additive; tightening later would be breaking.

**Alternatives**: Allow `.` — rejected as above.

## R3 — The configuration digest stays byte-identical for roots-only configs

**Decision**: Canonical JSON is `{"schemaVersion":1,"discovery":{"artifactRoots":[…]}}` exactly as in
026 when `artifactDirs` is absent. When it is present, `"artifactDirs":{…}` is appended inside
`discovery`, with type keys in the fixed `ARTIFACT_TYPES` order and each list sorted by UTF-8 bytes.
`artifactRoots` is always serialized (`[]` for a dirs-only file).

**Rationale**: FR-013 and SC-002 require that existing roots-only configs produce the same stored
digest, so a deploy does not make every source look like it changed configuration. Key order is fixed
by construction, not by object insertion order.

**Alternatives**: Re-hash with a new version tag — rejected, would change every stored digest for no
benefit.

## R4 — One container model for both layouts

**Decision**: Resolve configuration into a *layout*: a list of **containers** `{dir, type}` plus a set
of **required directories**. An artifact is always `<container.dir>/<slug>/artifact.yaml`, and its
expected type is the container's type.

- Each `artifactRoots` entry `R` yields eight containers `{join(R, typeDir), typeFor(typeDir)}`. Only
  `R` itself (unless `.`) is required to exist, exactly as in 026.
- Each `artifactDirs` entry `D` under type `T` yields one container `{D, T}`, and `D` is required.
- Identical `{dir,type}` pairs collapse into one. The same `dir` with two types is a configuration
  error raised while building the layout.

**Rationale**: This removes the two special cases (root layout vs typed dir) from the scanner and the
readers. The reader's only job becomes "list `<slug>` folders under these containers"; type, path and
conflict decisions are made once in a pure function. Conflict rules FR-008 and FR-009 fall out of
"same dir, two types" without separate code paths.

**Alternatives**: Keep `listArtifactDirs(artifactRoots)` and add a second parameter for typed dirs —
rejected, it keeps the two code paths and invites the readers to diverge (the exact risk 026's parity
tests exist for).

## R5 — Reader contract: pass the layout, share the pure parts

**Decision**: `RepoReader.listArtifactDirs(layout?: DiscoveryLayout)`; omitted means the default layout
(root `.`), so behaviour for callers that pass nothing is unchanged. New pure helpers live in
`discovery-core/src/layout.ts` and are used by **both** readers and the scanner:

- `buildLayout(config)` — containers + required dirs, throws on same-dir-two-types.
- `layoutForRoots(roots)` — convenience for tests and the default.
- `matchArtifactDirs(layout, manifestPaths)` — for readers that hold a flat path list (GitHub tree).
- `locateArtifact(layout, relPath)` — returns `{path, expectedType, container}`; throws if a reader
  returns a folder outside every container (defence in depth, as 026's `locationFor`).
- `assertNoNestedArtifacts(paths)` — fails when one artifact folder is inside another.

The local reader walks container directories with `readdir`; the GitHub reader filters the single
cached recursive tree through `matchArtifactDirs`. Both then go through `locateArtifact` in the
scanner, so path/type/conflict semantics cannot diverge.

**Rationale**: FR-017 asks for structural parity. The ten test fakes in the repo implement
`listArtifactDirs()` with no parameters, which stays type-compatible.

**Alternatives**: Have the scanner enumerate directories and call a smaller `readDir` primitive on the
reader — rejected for v1: the GitHub reader's single-tree snapshot and blob grouping for digests is the
reason 026 gives readers enumeration, and changing that would rework digest code that FR-016 says must
not change.

## R6 — Conflict and overlap rules

**Decision**:

| Situation | Where detected | Result |
|-----------|----------------|--------|
| Same dir under two types in `artifactDirs` | `buildLayout` | whole scan fails |
| `artifactDirs` dir equals a root-layout container with a different type | `buildLayout` | whole scan fails |
| Same `{dir,type}` reachable twice | `buildLayout` | collapsed, each artifact once |
| Artifact folder inside another, at least one found through `artifactDirs` | `assertNoNestedArtifacts` after listing | whole scan fails, names both |
| Artifact folder inside another, both from the root layout only | not checked | allowed, exactly as in 026 (the outer digest covers the inner files) |
| Manifest `type` ≠ container type | `sourceErrors` | that artifact invalid, not registered |

**Rationale**: Ambiguity about *type* must never be resolved silently (type drives governance and
search). Nested artifact folders would give two artifacts overlapping content digests, so editing the
child would stale the parent's approval; failing closed is safer than guessing. Per-manifest problems
stay per-artifact (as in 026) so one bad folder does not hide the rest.

**Scope of the nesting check**: 026 never rejected nesting between root-layout artifacts (an existing
reader test even builds an outer artifact whose digest covers an inner one), and FR-013 requires
roots-only configs to behave exactly as before. The check therefore applies only when at least one of
the two folders sits in a container that is listed in `artifactDirs`; containers carry a `listed` flag
for this.

**Alternatives**: Allow nesting and exclude the child's files from the parent digest — rejected as new
digest semantics that FR-016 forbids. Reject all nesting — rejected, it would change roots-only
behaviour.

## R7 — Existence of listed directories

**Decision**: Every required directory must exist as a directory at the ref in both readers. The local
reader keeps the 026 symlink-containment check; the GitHub reader checks the tree for a tree entry or
any path under the prefix. Missing directories fail the scan with one shared message shape
("Configured artifact directory does not exist: <dir>").

**Rationale**: Same fail-closed behaviour as roots; a typo must not turn into an empty source.

## R8 — Persisting provenance on `discovery-runs`

**Decision**: Add `artifactDirs` as a `json` field next to `artifactRoots`, holding the resolved mapping
(`{ "skill": ["agents/_skills"] }`, or `null` when not used). `lib/discovery.ts` writes it on success.
One additive migration; generated with `MEDIA_STORAGE_MODE=azure` (CLAUDE.md gotcha) so `media._objectkey`
is not dropped; verified up → down → up on a scratch DB; the migration `.json` snapshot is generated on
top of 026's migration so it already contains 026's schema.

**Rationale**: A `json` column is the smallest additive change; a normalized table for a small
read-only provenance blob would be speculative (Principle VII). The existing `text hasMany`
`artifactRoots` field stays as is.

**Alternatives**: Encode as `type:path` strings in a second `text hasMany` — rejected, loses structure and
adds a join table.

## R9 — Documentation is a deliverable with tests

**Decision**: Update, in this order of authority: `documentation/artifact-discovery.md` (operations),
`packages/artifact-schema/docs/artifact-manifest.md` (manifest reference), `README.md`, `CLAUDE.md`,
the Norwegian `/bidra` guide (`lib/contribute-guide.ts` + `app/(app)/bidra/page.tsx`), and add an
"Extended by 028" pointer to the 026 contracts. The guide stays pure data, so its examples are checked
by unit tests that run the real `resolveDiscoveryConfig`, `buildLayout` and `matchArtifactDirs` over the
example file tree, rather than regex-checking paths.

**Rationale**: The 026 guide test only checked that example paths contained a type directory. That test
would pass for a wrong `artifactDirs` example. Running the real matcher makes the guide
non-driftable (SC-005).

## R10 — Error messages and their guide entries

Every whole-scan failure message is built in `discovery-core/src/messages.ts` from a fixed fragment (a
"marker") plus the offending value. The guide's troubleshooting entries quote the same markers, and a
unit test requires every marker to be quoted, so rewording an error without updating the guide fails
CI. New or changed failure messages, each of which gets a Norwegian troubleshooting entry (or extends the
existing "Feil i kihub.yaml" entry where the fix is the same):

1. `discovery must set artifactRoots, artifactDirs or both` — empty `discovery`.
2. `artifactDirs: unknown type 'skills' (valid: skill, prompt, …)` — wrong key, plural hint.
3. `artifactDirs.<type>: …` — unsafe path, `.`, empty list, duplicate, over-limit.
4. `artifactDirs: '<dir>' is listed for both '<a>' and '<b>'` — same dir two types.
5. `artifactDirs: '<dir>' is also read as '<type>' by the root layout` — root-layout conflict.
6. `Configured artifact directory does not exist: <dir>` — missing directory.
7. `Artifact folders overlap: '<a>' contains '<b>'` — nested artifacts.
8. `type: type '<t>' does not match the type '<c>' configured for '<dir>'` — replaces the 026 wording; the
   old wording named a type directory that no longer always exists.
