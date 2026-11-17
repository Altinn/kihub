# Data Model: Flexible Artifact Discovery & Revision-Bound Governance

All changes are additive. Git remains canonical for `kihub.yaml` and artifact content. Payload stores
only indexed technical metadata, run provenance, and governance decision snapshots.

## Repository-only model: `kihub.yaml`

Not stored as a collection. The scanner resolves and validates it for each repository/ref.

| Field | Type | Rules |
|---|---|---|
| `schemaVersion` | integer | required, exactly `1` |
| `discovery` | object | required; only `artifactRoots` allowed in v1 |
| `discovery.artifactRoots` | string[] | required; 1–32 unique normalized roots; each `.` or safe relative POSIX path |

Resolved scan provenance:

```ts
interface ResolvedDiscoveryConfig {
  schemaVersion: 1;
  artifactRoots: string[];
  configPath: 'kihub.yaml' | null;
  configDigest: `sha256:${string}` | null;
}
```

Absent config resolves to roots `['.']`, `configPath: null`, `configDigest: null`.

## Existing collection: `artifacts`

| New field | Payload type | Required | Meaning / migration |
|---|---|---:|---|
| `contentDigest` | text | no | Current `sha256:` artifact-directory digest. Null on migrated rows until next successful scan. Indexed technical metadata, not content. |

Invariant: every valid artifact produced by the new scanner carries a digest. Reconcile writes it on
every upsert. A null database value is tolerated only for deployment/backfill compatibility and
blocks new review/approval decisions.

## Existing collection: `reviews`

| New field | Payload type | Required | Meaning / migration |
|---|---|---:|---|
| `artifactVersion` | text | no | Manifest semantic version loaded server-side when the review is created. Null only for legacy rows. Read-only in admin. |
| `artifactDigest` | text | no | Artifact digest loaded server-side at review creation. Null only for legacy rows. Read-only in admin. |

Create invariants:

- Related artifact must exist and have `contentDigest`.
- Hook overwrites any client-supplied snapshot values.
- Stored snapshot never follows later artifact updates.
- Audit details include both snapshot fields.

## Existing collection: `catalog-entries`

| New field | Payload type | Required | Meaning / migration |
|---|---|---:|---|
| `approvalArtifactVersion` | text | no | Artifact version to which the current approved/rejected decision applied. Null for no decision and legacy decisions. |
| `approvalArtifactDigest` | text | no | Artifact digest to which the current approved/rejected decision applied. Null for no decision and legacy decisions. |
| `approvalDecidedAt` | date | no | Server decision time for approved/rejected state. |

`reapproveCurrentRevision` is a virtual, non-persisted one-shot admin control. It lets an
Approver/Admin explicitly record a fresh Approved decision when the stored state is already
`approved` but its revision snapshot is stale. The hook resets it and emits a new approval-decision
audit event.

Decision invariants:

- Transition to `approved` or `rejected` snapshots the current revision server-side.
- Transition to `not-approved` clears the snapshot/time.
- Missing current artifact digest rejects an approved/rejected decision.
- Client snapshot values never override hook values.
- Only an Approver/Admin can record a decision or use the one-shot reapproval command.
- A current approval requires:

```text
approvalState == approved
AND approvalArtifactVersion == artifact.version
AND approvalArtifactDigest == artifact.contentDigest
```

- Lifecycle promotion to `approved`/`recommended` and setting `recommended=true` require that
  predicate at write time.
- Old snapshots/history remain after discovery updates; freshness is computed, not destructively
  rewritten.

## Existing collection: `discovery-sources`

| New field | Payload type | Required/default | Meaning |
|---|---|---|---|
| `allowDestructiveReconcile` | checkbox | default `false` | Admin-only operational one-shot. Allows a non-empty owned source to reconcile to zero valid artifacts. Reset to false after a successful run that consumes it. |

The field must be visible only with a warning description in Payload admin. Existing Admin-only
collection access protects it server-side.

## Existing collection: `discovery-runs`

| New field | Payload type | Required | Meaning |
|---|---|---:|---|
| `configPath` | text | no | `kihub.yaml` when present; null for default configuration |
| `configDigest` | text | no | Canonical resolved-config SHA-256; null for default configuration |
| `artifactRoots` | text, hasMany | no | Effective roots used for this successful scan |
| `summary.revisionChanged` | number | no | Count of existing artifacts whose non-null digest changed |
| `revisionChangedIds` | text, hasMany | no | Stable IDs corresponding to that count |

Failure runs may lack config provenance when resolution itself failed. Run records never contain
artifact bodies, tokens, webhook secrets, or GitHub authorization data.

## Discovery core shapes

```ts
interface RawArtifact {
  path: string;                    // actual repository-relative artifact directory
  contentDigest?: string;          // present for scanner-produced artifacts
  manifest?: ArtifactManifest;
  readme?: string;
  valid: boolean;
  errors?: string[];
  agentCard?: Record<string, unknown>;
  agentCardErrors?: string[];
}

interface DetailedScanResult {
  artifacts: RawArtifact[];
  config: ResolvedDiscoveryConfig;
}

interface ScanOptions {
  expectedRepository?: string;
}

interface ReconcileOptions {
  sourceId: number | string | null;
  allowEmptySource?: boolean;      // ignored for sourceId null
}

interface IndexReport {
  // existing fields unchanged
  revisionChanged: string[];
}
```

## Relationships and lifecycle

```text
Git repo/ref
  ├─ kihub.yaml ──resolves──> discovery run provenance
  └─ artifact directory ──digest──> Artifact.contentDigest
                                      │
                    stable ID/doc relationship
                         ┌────────────┴────────────┐
                         │                         │
              Review revision snapshot   Catalog approval snapshot
                         │                         │
                         └──── compare to current ─┘
                                      │
                         current or stale projection
```

## Migration and rollback

- One generated additive migration adds all columns; no backfill SQL.
- Existing artifact/review/approval snapshot values remain null.
- First post-deploy discovery fills `artifacts.content_digest`.
- Existing approved/recommended entries render stale until a human re-approves the now-indexed
  revision.
- Down migration drops only the new fields. It does not delete existing artifact/governance rows.
