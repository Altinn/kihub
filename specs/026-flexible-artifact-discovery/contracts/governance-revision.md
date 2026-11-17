# Contract: Revision-Bound Reviews and Approval Currency

## Revision identity

```ts
interface ArtifactRevision {
  version: string;
  digest: string;
}

function sameRevision(a: ArtifactRevision, b: ArtifactRevision): boolean {
  return a.version === b.version && a.digest === b.digest;
}
```

Both fields are mandatory for a current decision. Null legacy snapshots never match.

## Review create hook

On create:

1. Resolve the related artifact at depth 0.
2. Require non-empty `artifact.version` and `artifact.contentDigest`; otherwise throw API error 409
   instructing the editor to run discovery first.
3. Overwrite `artifactVersion` and `artifactDigest` with current values.
4. Preserve existing reviewer/date attribution.

On update, preserve the original revision snapshot regardless of client input or current artifact.
The review stays historical if the artifact has changed. Audit details include the stored snapshot.

## Catalog approval hook

When `approvalState` changes:

- `approved` or `rejected`: resolve current artifact, require digest, overwrite
  `approvalArtifactVersion`, `approvalArtifactDigest`, and `approvalDecidedAt=now`.
- `not-approved`: clear all three snapshot fields.

When approval state does not change, preserve the original snapshot regardless of client input,
except for the explicit command below.

When an existing Approved decision is stale, an Approver/Admin may set the virtual one-shot
`reapproveCurrentRevision` control. The server keeps `approvalState=approved`, stamps a fresh
version/digest/time, clears the control, and records another approval-decision audit event. Other
roles are rejected server-side.

Before a lifecycle transition to `approved` or `recommended`, or a false→true recommendation:

- effective state must be `approvalState=approved`
- stored approval version and digest must match the current artifact
- otherwise reject server-side with a re-review-required message

Existing role and lifecycle state-machine checks still apply.

Approval audit detail adds `artifactVersion`, `artifactDigest`, and `decidedAt`.

## Read projection

`getGovernance()` compares the persisted catalog entry with the current artifact and returns:

```ts
interface Governance {
  // existing fields
  approvalCurrent: boolean;
  approvalArtifactVersion: string | null;
  approvalArtifactDigest: string | null;
  approvalDecidedAt: string | null;
  currentArtifactVersion: string;
  currentArtifactDigest: string | null;
}
```

`recommended` in the employee projection is true only when the stored flag is true and
`approvalCurrent` is true. Historical stored values remain unchanged in Payload.

## Employee presentation

- Current approved decision: existing green Approved indicator is allowed.
- Approved but stale/missing snapshot: no green Approved or Recommended indicator; warning
  `Re-review required` and recorded/current revision details.
- A lifecycle stored as Approved/Recommended while stale is rendered as recorded/outdated, not a
  current success state.
- Every review whose `artifactDigest` differs from the current digest (including null legacy
  snapshots) receives an older-revision marker.
- Expiry and revision staleness are separate; both may be displayed.

## Discovery boundary

Discovery writes only `Artifact.contentDigest` and technical metadata. It never edits catalog
entries or reviews. A changed digest makes currency false by comparison, preserving the exact prior
decision and audit history.
