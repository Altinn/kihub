# Feature Specification: Flexible Artifact Discovery & Revision-Bound Governance

**Feature Branch**: `codex/026-flexible-artifact-discovery`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "Let source repositories keep artifacts alongside the code they describe, including below `src/` or service directories, while retaining a clear KI Hub discovery contract. Make discovery fail safely when configuration is wrong. Record the exact artifact version/content that was reviewed or approved so a changed artifact can never continue to appear currently approved without re-review."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Repository-Owned Discovery Roots (Priority: P1)

As a repository maintainer, I can commit one `kihub.yaml` file at the repository root that names the directories containing KI Hub artifacts. This lets artifacts live and evolve beside the source code, service, or container they support instead of forcing every repository to move them to its root.

The layout inside each configured root remains predictable: `<type>/<slug>/artifact.yaml`. A repository that does not provide `kihub.yaml` continues to use the repository root, so existing repositories require no migration.

**Why this priority**: This is the concrete interoperability need raised by Altinn Studio and the prerequisite for registering repositories with code-coupled artifact layouts.

**Independent Test**: Scan a repository with artifacts at both `src/skills/app-development/artifact.yaml` and `services/forms/agents/form-helper/artifact.yaml`, using those directories as configured roots. Both are discovered with their actual repository-relative paths; an existing root-layout repository without a config file still scans unchanged.

**Acceptance Scenarios**:

1. **Given** a repository with no `kihub.yaml`, **when** KI Hub scans it, **then** discovery uses `.` and finds the existing `<type>/<slug>/artifact.yaml` layout exactly as before.
2. **Given** a valid root `kihub.yaml` with `artifactRoots: [src, services/forms]`, **when** KI Hub scans the same Git ref, **then** it discovers artifacts only at `<configured-root>/<type>/<slug>/artifact.yaml`.
3. **Given** an artifact below a configured root, **when** its manifest type does not match its type directory, **then** the artifact is reported invalid and is not registered.
4. **Given** an `artifact.yaml` at an arbitrary unconfigured depth, **when** discovery runs, **then** it is ignored rather than found by an unbounded recursive manifest search.
5. **Given** a local break-glass scan and a remote GitHub scan of the same revision, **when** both resolve the config, **then** they apply the same roots, path validation, and artifact validation rules.

---

### User Story 2 - Fail-Safe, Traceable Reconciliation (Priority: P2)

As a KI Hub administrator, I can trust that malformed discovery configuration, a missing configured root, or incorrect source metadata cannot silently deactivate or misattribute catalog artifacts. Discovery records the resolved roots and configuration digest for each successful run.

If a source that currently owns active artifacts suddenly yields no valid artifacts, KI Hub refuses to reconcile it. An administrator may explicitly arm a one-shot destructive-reconcile override for an intentional emptying; the override resets after the successful run.

**Why this priority**: Flexible paths otherwise enlarge the blast radius of a typo. Discovery must fail before writes rather than turn a configuration mistake into a catalog-wide deactivation.

**Independent Test**: Start with a source owning an active artifact, then scan with an invalid config, a missing root, and finally a valid but empty root. Each run fails and leaves the artifact unchanged. Arm the override, repeat the empty scan, and observe one deactivation plus automatic reset of the override.

**Acceptance Scenarios**:

1. **Given** malformed YAML, an unsupported schema version, unknown config keys, unsafe paths, duplicate roots, or more than the supported root limit, **when** discovery runs, **then** the run fails before any artifact write or deactivation.
2. **Given** a configured root that does not exist at the configured Git ref, **when** discovery runs, **then** the run fails and existing catalog state is unchanged.
3. **Given** a manifest whose `source.path` differs from its actual repository-relative artifact directory, **when** it is scanned, **then** it is reported invalid with both paths in the error.
4. **Given** a remote source whose manifest `source.repository` differs from the registered discovery source, **when** it is scanned, **then** it is reported invalid.
5. **Given** a source with one or more active owned artifacts and a scan containing zero valid unique artifact IDs, **when** the one-shot override is not armed, **then** reconciliation throws before all writes and a failure run is recorded.
6. **Given** the same empty scan with the override armed, **when** reconciliation succeeds, **then** the owned artifacts are soft-deactivated and the override is reset to false.
7. **Given** a successful configured scan, **when** an administrator inspects its discovery run, **then** the run shows the resolved artifact roots, the config file path when present, and a digest of the effective configuration without storing artifact bodies or credentials.

---

### User Story 3 - Reviews and Approvals Follow the Artifact Revision (Priority: P3)

As an employee or reviewer, I can see whether governance decisions apply to the artifact revision currently in the catalog. Every scanned artifact receives a deterministic content digest for the files inside its artifact directory. A review and an approval decision snapshot the artifact's semantic version and content digest at decision time.

If any file in the artifact directory changes—even when the author forgets to bump the manifest version—the current catalog revision no longer displays the old approval as valid. Historical governance records remain intact and auditable, but the employee surface clearly requires re-review and suppresses current approved/recommended indicators until a new approval is recorded.

**Why this priority**: Preserving governance by stable artifact ID is necessary for history, but treating that history as current after the underlying content changes is a material trust failure.

**Independent Test**: Approve version `1.0.0`, modify only `SKILL.md`, and rescan. The artifact keeps its governance history, the discovery report records a changed revision, the approval becomes visibly stale, and a new review/approval snapshots the new digest and restores current status.

**Acceptance Scenarios**:

1. **Given** an artifact directory, **when** local and GitHub readers scan byte-identical Git content, **then** they produce the same `sha256:` content digest derived from sorted relative paths and Git blob object IDs.
2. **Given** an artifact with no content digest (for example, a migrated row awaiting its first scan), **when** a reviewer or approver attempts a new decision, **then** the action is refused with a clear request to re-index first.
3. **Given** a reviewer records a review, **when** it is saved, **then** the review stores the current artifact version and digest and those snapshot fields cannot be client-selected independently.
4. **Given** an approver approves or rejects an artifact, **when** the decision is saved, **then** the catalog governance record stores the current artifact version, digest, and decision timestamp and the audit entry includes that revision.
5. **Given** an approved artifact whose current version and digest match the recorded approval revision, **when** employees view it, **then** it appears currently approved and may appear recommended.
6. **Given** an approved artifact whose current version or digest differs, or an existing approval with no recorded revision, **when** employees view it, **then** approved/recommended success indicators are suppressed and a warning states that re-review is required.
7. **Given** a review recorded for an older digest, **when** the current artifact is viewed, **then** that review remains in history but is labelled as applying to an older revision.
8. **Given** a stale approval, **when** an approver attempts to promote the lifecycle to Approved/Recommended or mark it recommended without recording a current approval, **then** the action is rejected server-side.
9. **Given** a scan changes an existing non-null artifact digest, **when** reconciliation completes, **then** the run report identifies that artifact as revision-changed; initial digest backfills are not falsely reported as changes.
10. **Given** an Approved decision that is stale, **when** an Approver or Admin explicitly re-approves the current revision, **then** the state remains Approved, the snapshot/time are refreshed and audited, and other roles cannot perform that command.

### Edge Cases

- `kihub.yaml` is absent: resolve the backward-compatible default root `.` and no config-file digest.
- `kihub.yaml` exists but is empty, not a mapping, contains aliases/custom tags, has an unsupported version, unknown keys, an empty root list, duplicate normalized roots, absolute paths, backslashes, `.`/`..` path segments, or more than 32 roots: fail the scan before reconciliation.
- A root exists but contains no artifacts: valid for a new source; protected by the empty-source guard when the source already owns active artifacts.
- Multiple configured roots expose the same stable artifact ID: report the duplicate deterministically; only the first sorted path is considered seen, preserving existing duplicate semantics.
- An artifact changes location and updates `source.path` without changing content: its content digest remains the same because digest paths are relative to the artifact directory, while stable identity preserves governance. The actual source path still updates.
- A file mode changes without byte changes: the content digest remains the same; governance is bound to content rather than executable-bit metadata.
- A symlink is stored in Git: its Git blob (the link target text) participates in the digest without following it outside the artifact directory.
- A digest changes while semantic version does not: approval becomes stale and the UI can reveal that the version was not bumped.
- Semantic version changes while content digest happens to remain the same: approval still becomes stale because both version and digest must match.
- An approval predates this feature and has no revision snapshot: it is treated as stale, never grandfathered as current.
- A review is edited after the artifact changes: its original revision snapshot remains unchanged, so it continues to be shown as historical rather than silently attaching to the new revision.
- A remote repository tree response is truncated: discovery fails rather than scanning an incomplete tree.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Discovery MUST look for exactly one optional configuration file named `kihub.yaml` at repository root on the same configured Git ref as the artifacts.
- **FR-002**: The configuration contract MUST be strict and versioned with top-level `schemaVersion: 1` and `discovery.artifactRoots`, containing 1–32 unique repository-relative roots.
- **FR-003**: Roots MUST be `.` or normalized POSIX-style relative paths and MUST reject absolute paths, backslashes, empty segments, `.`/`..` segments, URL-like paths, and NUL characters.
- **FR-004**: In the absence of `kihub.yaml`, discovery MUST behave as if `artifactRoots: [.]` were configured.
- **FR-005**: Within each root, discovery MUST only enumerate `<type>/<slug>/artifact.yaml`, where type is one of the existing `TYPE_DIRS` and slug is one non-empty path segment.
- **FR-006**: Discovery MUST NOT recursively accept arbitrary `artifact.yaml` files or infer placement solely from manifest type.
- **FR-007**: Local and remote readers MUST enforce that every configured root exists and is a directory/tree before returning artifact locations.
- **FR-008**: Configuration errors and incomplete/truncated repository trees MUST throw a typed discovery error before reconciliation.
- **FR-009**: Manifest `type` MUST match the physical type directory relative to its configured root.
- **FR-010**: Manifest `source.path` MUST exactly match the normalized actual repository-relative artifact directory.
- **FR-011**: Remote scans MUST require manifest `source.repository` to match the registered source's normalized `owner/repo` value.
- **FR-012**: Successful discovery runs MUST persist the effective roots, optional config path, and config digest for traceability.
- **FR-013**: Reconciliation MUST refuse, before any writes, a source-scoped scan with zero valid unique artifacts when that source owns active artifacts, unless its one-shot destructive override is armed.
- **FR-014**: The destructive override MUST be Admin-only, default false, explained as one-shot in the back-office, and automatically reset after a successful reconcile that uses it.
- **FR-015**: Each scanned artifact MUST receive a deterministic `sha256:` digest covering every blob in its artifact directory, ordered by relative path and based on Git blob object IDs so local and remote scans agree.
- **FR-016**: Artifact records MUST persist the current content digest as indexed technical metadata; no artifact file bodies beyond the already-supported README/agent-card snapshots may be added to Payload.
- **FR-017**: Reconciliation MUST report an artifact as revision-changed only when a previous non-null digest differs from the new digest.
- **FR-018**: Review creation MUST snapshot the current artifact version and digest server-side and refuse artifacts without a digest.
- **FR-019**: Approval/rejection decisions MUST snapshot the current artifact version, digest, and decision time server-side and refuse artifacts without a digest.
- **FR-020**: Snapshot fields MUST be controlled by server hooks and MUST NOT be accepted as authoritative client input.
- **FR-021**: A governance decision is current only when both its recorded semantic version and digest equal the current artifact values.
- **FR-022**: Historical catalog governance, reviews, and audit records MUST remain linked by stable artifact ID across revision and repository/path changes.
- **FR-023**: Employee-facing governance UI MUST distinguish a current approval from a stale historical approval, suppress green Approved/Recommended indicators for stale approvals, and label older reviews.
- **FR-024**: Server-side governance validation MUST prevent Approved/Recommended promotion or recommendation when the current artifact revision lacks a current approved decision.
- **FR-025**: Approval and review audit details MUST include the version and digest to which the action applied.
- **FR-026**: Existing repositories, source records, webhook/scheduled/manual triggers, stable artifact IDs, and source-scoped deactivation behavior MUST remain backward compatible.
- **FR-027**: Automated tests MUST cover config parsing, local/remote parity, source metadata checks, digest parity/change detection, pre-write empty-scan protection, override reset, revision snapshots, stale governance computation, server-side promotion enforcement, UI indicators, and migration shape.
- **FR-028**: An Approver/Admin MUST be able to explicitly re-approve a stale `approved` decision for the current revision without an artificial intermediate state; the one-shot command MUST be server-authorized, refresh the snapshot/time, reset immediately, and create a new approval-decision audit event.

### Key Entities

- **Discovery Configuration**: Version-controlled `kihub.yaml` data resolved from the same repository ref; contains explicit artifact roots and produces a non-secret config digest.
- **Artifact Root**: A normalized repository-relative base directory beneath which the existing `<type>/<slug>` convention applies.
- **Artifact Revision**: The pair of manifest semantic version and deterministic artifact-directory content digest.
- **Artifact**: Existing technical catalog record, extended with the current content digest and actual repository-relative source path validation.
- **Review**: Existing typed governance review, extended with an immutable server-recorded artifact revision snapshot.
- **Approval Decision**: Existing current governance decision on a catalog entry, extended with its artifact revision and decision timestamp.
- **Discovery Source**: Existing registered repository/ref, extended with an Admin-controlled one-shot destructive reconcile override.
- **Discovery Run**: Existing append-only run report, extended with effective configuration metadata and changed-revision IDs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of existing root-layout discovery tests pass without requiring a `kihub.yaml` file.
- **SC-002**: Configured fixtures at two different nested roots are discovered identically by local and GitHub readers, including identical content digests.
- **SC-003**: Every tested malformed/unsafe config and missing-root scenario produces zero artifact/catalog mutations and a failed automated run.
- **SC-004**: A protected empty scan of a previously non-empty source produces zero mutations; the explicitly armed follow-up run deactivates the expected artifacts and resets the override.
- **SC-005**: Changing only `SKILL.md` without changing `artifact.yaml` changes the digest and makes the prior approval visibly stale in 100% of tests.
- **SC-006**: Version-only changes and digest-only changes both invalidate approval currency; unchanged rescans do neither.
- **SC-007**: All newly created reviews and approval/rejection decisions contain the exact version and digest current at action time, with no client-controlled alternative accepted.
- **SC-008**: No employee-facing artifact card or detail view renders a stale approval/recommendation as a current green success state.
- **SC-009**: Package tests, web unit/integration tests, lint, TypeScript checking, and production build complete successfully, with one additive reversible database migration.

## Assumptions

- `kihub.yaml` is the only filename in v1; `.yml`, JSON, globs, excludes, and per-artifact path declarations are intentionally deferred.
- Explicit roots solve the known Altinn Studio layouts without needing an unbounded crawler.
- Each artifact's governed content is the complete Git content below its artifact directory (`source.path`). Content elsewhere in the repository is outside that artifact revision.
- Git blob object IDs are stable inputs for byte content, including symlink blobs; directory digest aggregation uses SHA-256.
- A root path move with byte-identical artifact contents does not by itself stale governance, consistent with stable identity and path independence.
- Existing approval rows cannot be safely backfilled to an unknown historical revision and therefore become stale until explicitly re-approved.
- Governance history remains preserved; "stale" is a computed currency state, not deletion or rewriting of an earlier decision.
- The existing one-ref-per-source model remains. Co-location gives branch/version fidelity in Git, while KI Hub indexes the configured source ref rather than every branch.
- Installer behavior remains owned by APM/agentctl. KI Hub exposes the manifest's validated actual `source.path` but does not implement installation.
