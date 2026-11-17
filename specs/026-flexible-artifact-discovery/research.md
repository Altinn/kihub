# Phase 0 Research: Flexible Artifact Discovery & Revision-Bound Governance

## R1 — Use one repository-owned, versioned configuration file

**Decision**: Read optional `kihub.yaml` only from repository root and from the same ref as the
artifacts. Its strict v1 shape is namespaced under `discovery.artifactRoots`.

**Rationale**: Repository ownership makes path configuration follow branches and code review. One
canonical filename avoids precedence questions. A top-level schema version and namespace allow
future additions without giving v1 vague semantics.

**Rejected**:

- Store roots only in KI Hub's discovery-source row: configuration drifts from branches and is not
  reviewable beside repository changes.
- Support `json|yaml|yml` variants: needless precedence and documentation surface.
- Call it only `kihub-discovery.*`: blocks a future top-level versioned KI Hub repository contract.

## R2 — Explicit roots, typed convention; no arbitrary recursive crawler

**Decision**: Each configured root applies the existing exact `<TYPE_DIR>/<slug>/artifact.yaml`
layout. Roots are 1–32 strict relative POSIX paths. No globs, excludes, or arbitrary-depth search.

**Rationale**: This covers `src/skills/...` and `services/foo/agents/...`, retains the directory as
an independent type check, prevents accidental pickup, and keeps human/tool navigation predictable.

**Rejected**:

- Find every `artifact.yaml` and trust manifest `type`: removes a useful structural contract and
  makes unrelated files discoverable by accident.
- Include/exclude globs in v1: substantially more overlap, precedence, and security edge cases than
  the known use case requires.
- One source row per subpath: fragments reconciliation ownership and makes duplicate/takeover
  semantics harder for the same repository/ref.

## R3 — Add a detailed scan API without breaking callers

**Decision**: Add `scanRepoDetailed(reader, options)` returning `{ artifacts, config }`; retain
`scanRepo()` as an array-returning wrapper. Extend `RepoReader.listArtifactDirs(roots)` and add an
optional optimized `artifactDigest(path)` method. Local synchronous `scan()` resolves the same config
and stays backward compatible.

**Rationale**: Automated discovery needs config roots/digest for its run record, while many tests and
the break-glass indexer only need artifacts. An optional digest method lets GitHub use tree SHAs and
keeps simple in-memory test readers viable through a known-file fallback.

## R4 — Digest complete artifact-directory Git content

**Decision**: Define a portable digest:

1. For every blob recursively below the artifact directory, obtain the Git blob object ID
   (`SHA-1("blob " + byteLength + NUL + bytes)` locally; GitHub tree `sha` remotely).
2. Convert each path to a path relative to the artifact directory.
3. Sort entries lexicographically by relative path.
4. Hash UTF-8 records `relativePath + NUL + blobOid + LF` with SHA-256.
5. Store `sha256:<lowercase hex>`.

**Rationale**: GitHub already returns blob IDs in the recursive tree, so full content coverage adds
no blob downloads. Computing Git blob IDs locally makes local/remote results identical. Relative
paths make a pure directory move governance-neutral, consistent with stable identity.

**Rejected**:

- Manifest version only: cannot detect a changed `SKILL.md` without a version bump.
- Manifest+README only: misses the artifact body and bundled files.
- Repository commit SHA: unrelated changes stale every artifact.
- Hash actual repository-relative paths: moving an unchanged artifact would stale governance,
  contrary to Principle IV.

## R5 — Treat config/tree failures as hard pre-reconcile failures

**Decision**: Strictly parse the config, reject aliases/tags/unknown keys/unsafe roots, require every
root to exist, and reject a truncated GitHub recursive tree. These errors throw before reconciliation.

**Rationale**: An incomplete observation must never be interpreted as deletion. This extends the
existing transport-failure behavior that leaves the catalog intact.

## R6 — Protect the transition from non-empty to zero with a one-shot override

**Decision**: At the start of source-scoped `reconcile`, compute valid unique seen IDs and fetch the
source's currently active owned rows. If owned rows exist and seen is empty, throw before any writes
unless `allowEmptySource` is true. Payload exposes an Admin-only `allowDestructiveReconcile` checkbox;
`runDiscovery` passes it once and resets it after a successful run.

**Rationale**: Zero is the catastrophic typo case and can be detected without arbitrary percentage
thresholds. A one-shot server-side control supports intentional final retirement without permanently
weakening later scans.

**Rejected**:

- Permanent `allowEmpty` in Git config: a forgotten switch silently disables future protection.
- Always reject empty: makes intentional removal of a source's final artifact impossible.
- Block any large percentage drop: threshold policy is speculative and can interfere with normal
  repository reorganizations.

## R7 — Validate source metadata against observed reality

**Decision**: Require `manifest.source.path` to equal the actual artifact directory and, for a
registered remote scan, normalize and compare `manifest.source.repository` with `source.repo`.

**Rationale**: The path feeds install/source links. Flexible roots amplify the harm of stale copied
metadata. Invalid artifacts are reported per path; config failures remain source-level failures.

## R8 — Preserve governance history; compute decision currency

**Decision**: Do not reset or delete approval/lifecycle/review records during discovery. Store the
version+digest on each new review and current approval/rejection decision. At read/enforcement time,
a decision is current only when both values match the current artifact. Missing legacy snapshots are
stale by default.

**Rationale**: Discovery must not impersonate a reviewer or destroy audit history. Stable ID answers
"which artifact?"; revision answers "which content did this decision cover?" Computing currency gives
both historical truth and safe current presentation.

**Rejected**:

- Automatically set approval to `not-approved` on discovery: mutates governance without a human
  actor and obscures the earlier decision.
- Grandfather existing approvals: there is no evidence which historical bytes they covered.
- Key governance by version: fragments ownership/history and violates stable identity.

## R9 — Snapshot revisions in server hooks

**Decision**: Review `beforeChange` loads the related artifact and stamps `artifactVersion` /
`artifactDigest` on create. Catalog-entry `beforeChange` stamps `approvalArtifactVersion` /
`approvalArtifactDigest` / `approvalDecidedAt` whenever approval changes to approved or rejected.
Client-supplied snapshot values are overwritten. Missing artifact digests reject new decisions.

Lifecycle promotion to Approved/Recommended and setting `recommended=true` require a current approved
snapshot, enforced in the same server hook.

Because a stale decision may already have `approvalState=approved`, re-approval uses a virtual
one-shot `reapproveCurrentRevision` command rather than an artificial rejected/not-approved detour.
Approver/Admin authorization is enforced in both field access and the hook; the command stamps the
current revision/time, resets immediately, and emits another approval-decision audit event.
Unrelated metadata saves cannot silently renew approval.

**Rationale**: Payload hooks protect admin UI, REST, GraphQL, and Local API paths consistently.

## R10 — Report changes without treating initial digest backfill as a revision

**Decision**: `IndexReport.revisionChanged` includes an existing artifact only when its previous
digest is non-null and differs from the new digest. The run stores the count and stable IDs.

**Rationale**: Operators can correlate stale decisions with discovery. A null→digest deployment
backfill lacks evidence of an actual content change and should not create noisy change reports;
legacy approvals are independently stale because they have no snapshot.

## R11 — Employee UI communicates effective trust, not only stored state

**Decision**: Add a pure governance projection with current artifact version/digest and
`approvalCurrent`. For stale approved decisions, suppress green approved/recommended indicators,
render a warning/re-review state, show approved vs current revision, and tag reviews whose digest no
longer matches.

**Rationale**: Persisting correct data is insufficient if the primary surface still communicates an
old approval as current. The stored lifecycle remains visible as historical/recorded state where
useful, without green success styling.

## R12 — One additive migration; no data backfill

**Decision**: Add nullable text/timestamp/list/number columns and one boolean default false. Do not
backfill artifact or decision digests. The next source scan populates artifact digests; existing
approval snapshots remain null and therefore stale until re-approved.

**Rationale**: Reconstructing a historical reviewed digest is impossible. Additive nullable fields
make deploy/rollback safe and avoid fabricating evidence.

## R13 — Distribution and arbitrary branches remain out of scope

**Decision**: Continue surfacing validated manifest install/source metadata. Do not add an installer,
agentctl integration, or multi-branch catalog model.

**Rationale**: The constitution assigns installation to APM/equivalent. Each source already has one
configured ref; repository co-location still gives code consumers branch-aligned files outside the
catalog.
