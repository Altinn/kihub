# Feature Specification: Per-Type Artifact Directories in `kihub.yaml`

**Feature Branch**: `028-per-type-artifact-dirs` (stacked on `026-flexible-artifact-discovery`, PR Altinn/kihub#176)

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "Let a repository tell KI Hub where each kind of artifact lives, so teams with their own folder layouts (for example Altinn Studio, which keeps skills in `agents/_skills/<slug>/SKILL.md`) can be discovered without moving any folders. Teams add one `kihub.yaml` at the repository root plus one small `artifact.yaml` inside each artifact folder. Keep every safety property of discovery from 026: strict configuration, fail-closed scans, revision-bound governance. Update all documentation and the employee-facing contribution guide so the two ways of describing a repository are explained consistently."

## Background

Spec 026 (unmerged, PR #176) lets a repository list `discovery.artifactRoots` in `kihub.yaml`. Below each root, discovery still insists on the fixed shape `<root>/<type-dir>/<slug>/artifact.yaml`, where the type directory is one of `skills`, `prompts`, `workflows`, `mcp`, `templates`, `policies`, `playbooks` or `agents`. A repository whose skills sit in `agents/_skills/<slug>/` has no root that makes that shape true, so it cannot be registered without moving folders that other tools depend on. KI Hub serves many teams with different layouts, and it must adapt to them rather than ask each team to restructure.

Because 026 is not yet merged, this feature extends the `kihub.yaml` v1 contract before it has shipped to any repository, so no version bump is needed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register a Repository Without Moving Folders (Priority: P1)

As a maintainer of a repository with its own layout, I commit one `kihub.yaml` at the repository root that says which folder holds which kind of artifact, and I add a small `artifact.yaml` inside each artifact folder next to its content (for example next to `SKILL.md`). I do not move, rename or duplicate anything. After an administrator registers the repository, every listed artifact appears in KI Hub, ready for review and approval.

Example for a repository that keeps skills in `agents/_skills/`:

```yaml
schemaVersion: 1
discovery:
  artifactDirs:
    skill:
      - agents/_skills
```

With `agents/_skills/tekstforfatter-docs/artifact.yaml` present, the artifact is found at `agents/_skills/tekstforfatter-docs`.

**Why this priority**: This is the concrete blocker for registering Altinn Studio and the general requirement that KI Hub respects every team's folder layout. Everything else in this feature supports it.

**Independent Test**: Scan a fixture repository with `kihub.yaml` declaring `artifactDirs: { skill: [agents/_skills] }` and two folders `agents/_skills/alpha/` and `agents/_skills/beta/`, each with a valid `artifact.yaml` of type `skill` and a `source.path` equal to its folder. Both artifacts are discovered with their real repository-relative paths and content digests, identically by the local and the GitHub reader. A sibling folder `agents/_skills/gamma/` with no `artifact.yaml` is ignored.

**Acceptance Scenarios**:

1. **Given** a `kihub.yaml` with `artifactDirs: { skill: [agents/_skills] }`, **when** KI Hub scans the repository, **then** every immediate subfolder of `agents/_skills` that contains an `artifact.yaml` is discovered as an artifact of type `skill`.
2. **Given** that configuration and only `artifactDirs` (no `artifactRoots`), **when** the repository also contains `skills/other/artifact.yaml` at the repository root, **then** that artifact is not discovered, because only what is listed is scanned.
3. **Given** a configuration using both `artifactRoots: [src]` and `artifactDirs: { agent: [custom/bots] }`, **when** KI Hub scans, **then** it discovers both the `src/<type>/<slug>` layout and the `custom/bots/<slug>` agents, and reports each artifact once.
4. **Given** a repository whose `artifact.yaml` files sit more than one level below a listed directory (for example `agents/_skills/group/alpha/artifact.yaml`), **when** KI Hub scans, **then** those manifests are ignored: listed directories are never searched recursively.
5. **Given** a repository with no `kihub.yaml`, or one that uses only `artifactRoots`, **when** KI Hub scans it, **then** results, stored configuration digest and behaviour are identical to what 026 produced.
6. **Given** a local break-glass scan and a GitHub scan of the same revision, **when** both resolve the same configuration, **then** they apply identical rules and return identical artifacts.

---

### User Story 2 - Wrong or Ambiguous Configuration Fails Safely (Priority: P2)

As a KI Hub administrator, I can trust that a typo or an ambiguous `kihub.yaml` can never silently drop, add or retype catalog artifacts. Invalid or contradictory configuration fails the whole scan before anything in the catalog changes, with a message that tells the repository maintainer what to fix.

**Why this priority**: Per-type directories widen what a single line of configuration can influence, so the 026 fail-closed guarantees must extend to them. Without this, a mapped directory with the wrong type could register artifacts under the wrong governance type.

**Independent Test**: Scan fixtures with each of the faults below, starting from a source that owns an active artifact. Every scan fails with a clear message and leaves the catalog unchanged.

**Acceptance Scenarios**:

1. **Given** an `artifactDirs` key that is not one of the eight manifest type names (for example the plural `skills`), **when** discovery runs, **then** the scan fails and the message lists the valid type names.
2. **Given** an unsafe or malformed directory (absolute, URL-like, containing backslash, empty or `.`/`..` segments, or the repository root `.`), **when** discovery runs, **then** the scan fails.
3. **Given** an empty directory list for a type, a duplicate directory within a type, or more than 32 directory entries in total, **when** discovery runs, **then** the scan fails.
4. **Given** the same directory listed under two different types, **when** discovery runs, **then** the scan fails.
5. **Given** a listed directory that is also reachable through a root layout with a different type (for example `artifactRoots: [.]` plus `artifactDirs: { agent: [skills] }`), **when** discovery runs, **then** the scan fails instead of choosing one.
6. **Given** a listed directory that does not exist or is not a directory at the scanned ref, **when** discovery runs, **then** the scan fails.
7. **Given** a discovered artifact folder that is nested inside another discovered artifact folder and at least one of the two was found through `artifactDirs`, **when** discovery runs, **then** the scan fails and names both paths, because their content digests would overlap. (Nesting between artifacts found only through the root layout keeps its 026 behaviour.)
8. **Given** a manifest whose `type` differs from the type configured for the directory it was found in, **when** it is scanned, **then** it is reported invalid and not registered, and the message names both types.
9. **Given** a manifest whose `source.path` differs from its real folder (for example `skills/tekstforfatter-docs` when the folder is `agents/_skills/tekstforfatter-docs`), **when** it is scanned, **then** it is reported invalid with both paths in the message. An already-registered artifact whose folder still exists stays active with its last valid metadata, as in 026.
10. **Given** a `kihub.yaml` with only an `artifactDirs` mapping that yields zero valid artifacts for a source that owns active ones, **when** the scan reconciles, **then** the 026 empty-source guard still refuses to deactivate them without the Admin's one-shot override.

---

### User Story 3 - One Consistent Explanation Everywhere (Priority: P3)

As a team preparing to register our artifacts, or as an administrator helping them, I find the same, correct explanation in every place I might look: the repository documentation, the manifest reference, and the Norwegian contribution guide at `/bidra`, including its example, checklist, troubleshooting entries and FAQ. The examples shown in the guide are valid against the real configuration parser, so they cannot drift from the behaviour.

**Why this priority**: The mechanism only helps if teams understand that nothing needs to move and know exactly what to add. Stale guidance would send teams back to restructuring their repositories.

**Independent Test**: Read the contribution guide as a new team with a non-standard layout: the page answers "do I have to move my folders?" (no), shows a complete example with both files, lists what to check, and explains each failure message a scan can now produce. Automated tests parse every example `kihub.yaml` in the guide and verify the described tree against the real rules.

**Acceptance Scenarios**:

1. **Given** the contribution guide, **when** a team with their own layout reads it, **then** it states that existing folders do not need to move and shows a `kihub.yaml` with `artifactDirs` next to a matching file tree and `artifact.yaml`.
2. **Given** the guide's troubleshooting section, **when** a team gets any of the new scan errors, **then** a matching entry explains the cause and the fix in Norwegian.
3. **Given** the guide's FAQ, **when** a team asks whether the same repository can mix layouts, **then** it explains that `artifactRoots` and `artifactDirs` can be combined and that only listed locations are scanned.
4. **Given** the repository documentation, manifest reference, README and project context file, **when** compared, **then** all describe the same contract, limits and failure behaviour, and none still claims that the layout below a root is the only option.
5. **Given** any example `kihub.yaml` in the guide, **when** the unit tests parse it with the real configuration parser, **then** it is valid and the example tree resolves to exactly the artifacts the guide says it does.
6. **Given** an administrator inspecting a successful discovery run in the back-office, **when** the repository used `artifactDirs`, **then** the run shows the resolved directory mapping alongside the existing roots, config path and config digest.

### Edge Cases

- `artifactDirs` present but `artifactRoots` absent: only the listed directories are scanned; there is no implicit `.` root. (An absent `kihub.yaml` still means root `.`, as in 026.)
- `kihub.yaml` exists with `discovery: {}` or neither key: the scan fails, because the file would otherwise scan nothing.
- Two listed directories of the same type expose the same stable artifact ID: handled by the existing duplicate-ID rule, deterministically by sorted path.
- A listed directory contains non-artifact subfolders (for example `common/`, `templates/`) without `artifact.yaml`: ignored.
- A listed directory is a symlink or contains a symlinked subfolder: the existing containment rules apply; nothing outside the repository is read.
- The same artifact reachable twice with the same type (for example via a root layout and a listed directory): reported once.
- A team later moves a folder and updates `kihub.yaml` plus `source.path`: stable artifact ID keeps governance history; the content digest is unchanged if the bytes are unchanged, as in 026.
- Directory entries listed in a different order produce the same configuration digest, because order is normalized; paths that differ in any character (including case) are different directories.
- A configuration that previously failed in 026 because it contained an unknown key now fails for any key other than `artifactRoots` and `artifactDirs`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `kihub.yaml` v1 MUST accept an optional `discovery.artifactDirs` mapping in addition to the existing optional `discovery.artifactRoots`, without changing `schemaVersion`.
- **FR-002**: Keys of `artifactDirs` MUST be exactly the manifest type names `skill`, `prompt`, `workflow`, `mcp`, `template`, `policy`, `playbook` and `agent`. Any other key MUST fail the scan with a message that lists the valid names.
- **FR-003**: Each value MUST be a non-empty list of repository-relative directories, using the same path rules as roots (normalized POSIX paths; no absolute paths, backslashes, empty segments, `.`/`..` segments, URL-like values, NUL or control characters), except that the repository root `.` is not allowed as an `artifactDirs` entry.
- **FR-004**: When `kihub.yaml` is present, at least one of `artifactRoots` and `artifactDirs` MUST be given, and only the locations listed in the file MUST be scanned. No implicit `.` root MUST be added when only `artifactDirs` is given.
- **FR-005**: `artifactRoots` MUST keep its 026 meaning and limit (1–32 unique roots when given). `artifactDirs` MUST contain at most 32 directory entries in total across all types, and entries MUST be unique within a type.
- **FR-006**: For every directory listed under type T, discovery MUST consider exactly the immediate subfolders `<dir>/<slug>/` that contain `artifact.yaml`, and MUST NOT search deeper.
- **FR-007**: An artifact found through a listed directory MUST be validated against the type configured for that directory: the manifest `type` MUST equal it, otherwise the artifact is invalid and not registered.
- **FR-008**: The same directory listed under two different types MUST fail the whole scan.
- **FR-009**: A listed directory that is also reachable through a root layout (`<root>/<type-dir>`) with a different type MUST fail the whole scan; with the same type it MUST be treated as one location and each artifact reported once.
- **FR-010**: If one discovered artifact folder is an ancestor or descendant of another and at least one of them was found through `artifactDirs`, the whole scan MUST fail and the message MUST name both paths. Nesting between two root-layout artifacts MUST keep the 026 behaviour (FR-013).
- **FR-011**: Every listed directory MUST exist as a directory at the scanned ref, in both the local and the GitHub reader; otherwise the whole scan MUST fail before reconciliation. Truncated repository trees MUST keep failing the scan.
- **FR-012**: Manifest `source.path` MUST equal the full actual repository-relative artifact folder (for example `agents/_skills/tekstforfatter-docs`), and `source.repository` MUST keep matching the registered source, exactly as in 026.
- **FR-013**: Configuration that uses only `artifactRoots`, or no `kihub.yaml`, MUST behave identically to 026, including the stored configuration digest, which MUST NOT change for such configurations.
- **FR-014**: The configuration digest for a file that uses `artifactDirs` MUST be deterministic and independent of entry order, and MUST change whenever the resolved roots or directory mapping change.
- **FR-015**: Successful discovery runs MUST record the resolved `artifactDirs` mapping alongside the roots, config path and config digest. Failed runs MUST continue to record the failure without reconciling.
- **FR-016**: Content digest, revision-bound approvals, re-approval, source-scoped reconcile, the empty-source guard and its one-shot override MUST behave unchanged for artifacts discovered through `artifactDirs`.
- **FR-017**: The local reader and the GitHub reader MUST apply the same configuration, enumeration, existence and conflict rules and MUST produce identical results for identical content.
- **FR-018**: The repository documentation (discovery operations guide and manifest reference), the README, the project context file and the employee-facing Norwegian contribution guide MUST describe `artifactDirs` consistently with this specification: purpose, example, combination with `artifactRoots`, limits, scan-only-what-is-listed semantics and failure modes.
- **FR-019**: The contribution guide MUST state in plain Norwegian that existing folders do not need to move, MUST show a complete example (`kihub.yaml`, folder tree and `artifact.yaml`) for a non-standard layout, MUST extend its checklist, and MUST have troubleshooting entries for each new scan failure and an FAQ entry about mixing layouts.
- **FR-020**: Every example `kihub.yaml` and example tree in the contribution guide MUST be covered by an automated test that parses it with the real configuration parser and checks it against the real location rules.
- **FR-021**: The change MUST add no new client-side code to the employee app beyond content changes in the existing guide page, and MUST use one additive, reversible database migration limited to recording the resolved directory mapping on discovery runs.
- **FR-022**: Automated tests MUST cover configuration parsing and every failure above, enumeration parity between readers, type and path checks, backward-compatible digest, conflict detection, nested-artifact detection, the guide examples and the migration shape.

### Key Entities

- **Discovery Configuration** *(extended)*: The repository's `kihub.yaml`; now carries optional artifact roots and an optional per-type directory mapping, plus a non-secret digest of the effective configuration.
- **Artifact Directory Mapping**: A list of repository-relative directories per artifact type. Each listed directory directly contains one folder per artifact.
- **Artifact Location**: The physical folder of one artifact together with the type that the configuration expects there. It is what the manifest `type` and `source.path` are checked against.
- **Discovery Run** *(extended)*: Append-only report; additionally records the resolved directory mapping.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A repository with skills in `agents/_skills/<slug>/` can be registered by adding exactly one `kihub.yaml` and one `artifact.yaml` per skill, with zero folders moved, renamed or copied; every such skill appears in the catalog after one scan.
- **SC-002**: 100% of existing 026 discovery tests pass unchanged, and the stored configuration digest for every `artifactRoots`-only and no-config fixture is byte-identical to the value 026 produced.
- **SC-003**: Every tested malformed, unsafe, ambiguous or missing-directory configuration produces zero catalog mutations and a failed run in 100% of cases.
- **SC-004**: The local and the GitHub reader return identical artifact lists and identical content digests for the same fixtures in 100% of parity tests.
- **SC-005**: Every example `kihub.yaml` in the contribution guide parses successfully in automated tests, and each of the new scan errors has a troubleshooting entry that a test can locate.
- **SC-006**: A reader unfamiliar with KI Hub can follow the guide to a valid configuration for a non-standard layout without moving folders, verified by walking the guide's example end to end.
- **SC-007**: Package tests, web unit and integration tests, lint, type checking and a production build pass, with one additive reversible migration.

## Assumptions

- This extends the unmerged `kihub.yaml` v1 of spec 026 before first release, so it is additive and no schema version bump is required. Should it ship after 026, it is still additive and backward compatible for every valid 026 file.
- Mapping by manifest type name (singular) is deliberate: it matches the `type` field teams already write in `artifact.yaml`, and the type directory names of the root layout stay as they are.
- Each team still writes one small `artifact.yaml` per artifact. KI Hub does not infer metadata from content files such as `SKILL.md`.
- Listing `.` as an artifact directory is not allowed in v1, so a configured directory always names a real container folder. A repository that wants root-level artifacts uses `artifactRoots`.
- Globs, exclude patterns, per-artifact path lists and unbounded recursive discovery remain out of scope, as in 026.
- The governed content of an artifact remains the complete content of its own folder; sibling folders such as other skills in the same container are not part of its revision.
- The one-ref-per-source model, source registration, token handling and scan triggers are unchanged.
- Installer integration (agentctl / APM) remains out of scope.
