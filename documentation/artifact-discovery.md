# Artifact discovery and revision governance

KI Hub discovers Git-owned artifacts from each enabled `discovery-sources` record. Git remains the
source of truth: Payload stores searchable metadata, provenance, digests, and governance history,
not the artifact body.

## Repository layout

Without configuration, discovery preserves the original layout:

```text
skills/<slug>/artifact.yaml
agents/<slug>/artifact.yaml
…
```

A repository may instead commit exactly one `/kihub.yaml` on the configured ref:

```yaml
schemaVersion: 1
discovery:
  artifactRoots:
    - src
    - services/forms
```

Roots are repository-relative POSIX paths. They cannot contain globs, URLs, backslashes, empty or
`.`/`..` segments, and there may be at most 32. The mapping is strict: unsupported versions,
unknown keys, aliases, custom tags, duplicate roots, invalid YAML, missing roots, and truncated
GitHub trees fail the complete scan.

Discovery checks only `<root>/<type>/<slug>/artifact.yaml`. It does not recursively search for an
artifact at arbitrary depth. The manifest must describe physical source truth:

- `source.path` equals the full repository-relative artifact directory, including the configured
  root (for example `src/skills/security-review`);
- `source.repository` normalizes to the registered discovery source's `owner/repo`.

Repositories with no `kihub.yaml` resolve the implicit root `.`. Successful runs store the resolved
root list, `kihub.yaml` path when present, and canonical config digest in `discovery-runs`.

## Fail-safe reconcile

Config, tree, fetch, and source-validation failures are recorded as failed runs and never reach
reconcile. Reconcile also guards against the destructive case where a source owns active catalog
rows but the scan observes zero valid unique artifacts. The run fails before any create, update, or
deactivation.

For an intentional source cleanup, an Admin can arm `allowDestructiveReconcile` on the discovery
source and run it once. A successful run may then soft-deactivate the source's missing artifacts and
resets the option to false. A failed run does not consume the override.

## Artifact revisions

The scanner computes a portable `sha256:` digest from every Git blob under an artifact directory,
recursively. The input is each artifact-relative file path plus its Git blob OID. File ordering and
the artifact's outer repository path do not affect the value; content changes, additions, removals,
and renames do. Symlinks are hashed as their Git target-text bytes and are not followed.

`artifacts.contentDigest` is technical discovery metadata. A successful re-index records an artifact
in `revisionChangedIds` when a previous non-null digest differs. Initial backfill of legacy rows is
not reported as a change.

## Reviews and approvals

On create, the server stamps every review with the artifact version and content digest. Approval or
rejection decisions similarly store the exact decided version, digest, and decision time. Clients
cannot choose or rewrite these snapshots.

An approval is current only when all of these are true:

```text
approvalState = approved
approvalArtifactVersion = artifact.version
approvalArtifactDigest = artifact.contentDigest
```

When content changes, KI Hub keeps the old decision and reviews as audit history but marks them as
older. The employee surface removes green current Approved/Recommended indicators, suppresses the
effective recommendation, and shows a re-review warning. Lifecycle promotion to Approved or
Recommended—and raising `recommended`—requires approval of the current revision. Legacy decisions
without snapshots are intentionally treated as not current until re-approved. An Approver/Admin
records that fresh decision with the one-shot `reapproveCurrentRevision` control; it re-stamps the
current version/digest, resets immediately, and is audited as a new approval decision.

The complete implementation contracts and operating checks live in
[`specs/026-flexible-artifact-discovery/`](../specs/026-flexible-artifact-discovery/).
