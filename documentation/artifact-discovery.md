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

A repository that keeps its artifacts elsewhere commits exactly one `/kihub.yaml` on the configured
ref. Nothing has to move: the file says where things are, and each artifact folder gets a small
`artifact.yaml` next to its content (for example next to `SKILL.md`). There are two ways to say where,
and they can be combined.

**`artifactRoots`** — folders that contain the standard `<type-dir>/<slug>/` layout:

```yaml
schemaVersion: 1
discovery:
  artifactRoots:
    - src
    - services/forms
```

**`artifactDirs`** — per artifact *type*, the folders whose immediate subfolders are artifacts of
that type, whatever the folders are called:

```yaml
schemaVersion: 1
discovery:
  artifactDirs:
    skill:
      - agents/_skills
```

With `agents/_skills/tekstforfatter-docs/artifact.yaml` present, the artifact is found at
`agents/_skills/tekstforfatter-docs`, and its manifest must say `type: skill` and
`source.path: agents/_skills/tekstforfatter-docs`.

Both keys together:

```yaml
schemaVersion: 1
discovery:
  artifactRoots: [src]
  artifactDirs:
    agent: [custom/bots]
    skill: [agents/_skills, docs/skills]
```

Rules:

- **Only what is listed is scanned.** A repository without `kihub.yaml` uses the root layout; with
  one, only the listed roots and directories are read. With only `artifactDirs` the root layout
  (`skills/`, `agents/`, …) is not read; list `.` under `artifactRoots` to keep it.
- At least one of `artifactRoots` and `artifactDirs` is required. `schemaVersion` must be `1`.
- `artifactDirs` keys are the manifest type names, singular: `skill`, `prompt`, `workflow`, `mcp`,
  `template`, `policy`, `playbook`, `agent`. `skills:` is rejected (the error suggests `skill`).
- Entries are repository-relative POSIX paths: no globs, URLs, backslashes, empty or `.`/`..`
  segments. `.` is allowed under `artifactRoots` but **not** under `artifactDirs`.
- At most 32 roots and at most 32 `artifactDirs` entries in total; entries are unique within a type.
- Aliases, custom YAML tags, multiple documents and unknown keys are rejected.

Discovery checks only `<root>/<type-dir>/<slug>/artifact.yaml` for roots, and
`<dir>/<slug>/artifact.yaml` for each `artifactDirs` entry. It does not recursively search for an
artifact at arbitrary depth. The manifest must describe physical source truth:

- `type` equals the type the folder is configured for (the type directory for roots, the key for
  `artifactDirs`);
- `source.path` equals the full repository-relative artifact directory, including any root or
  directory (for example `src/skills/security-review` or `agents/_skills/tekstforfatter-docs`);
- `source.repository` normalizes to the registered discovery source's `owner/repo`.

A directory can mean only one type. These configurations fail the whole scan:

- the same directory listed under two types;
- an `artifactDirs` directory that a root layout reads as a different type (for example
  `artifactRoots: [.]` with `agent: [skills]`);
- an artifact folder inside another artifact folder when either was found through `artifactDirs`
  (their content digests would overlap).

Repositories with no `kihub.yaml` resolve the implicit root `.`. Successful runs store the resolved
root list, the resolved `artifactDirs` mapping (empty for roots-only configurations), the `kihub.yaml`
path when present, and the canonical config digest in `discovery-runs`. The digest of a configuration
that only uses `artifactRoots` is unchanged from before `artifactDirs` existed.

### Registering a repository with its own layout

1. The team commits `kihub.yaml` at the repository root and an `artifact.yaml` in each artifact
   folder (validate with `pnpm --filter @kihub/artifact-schema validate <path>`).
2. An Admin creates the source in `/cms` → Discovery Sources: `repo` (`owner/repo`), `ref`, and the
   name of the env var that holds a read-only GitHub token (fine-grained PAT, Contents + Metadata;
   Altinn's organisation policy caps the lifetime at 366 days).
3. Set that env var as a secret on `kihub-web` (this creates a new revision).
4. Click "Run now" and read the run: created / updated / skipped-invalid counts, resolved roots and
   `artifactDirs`, config path and digest. Skipped-invalid items list the exact reason.
5. Review and approval work as for any artifact; approvals follow the version and the content of the
   artifact's own folder.

A local dry run of a checkout (reads only, no database):

```bash
SCAN_ROOT=/path/to/checkout pnpm --filter web exec tsx -e \
  "import { scan } from '@kihub/discovery-core'; \
   console.log(JSON.stringify(scan(process.env.SCAN_ROOT!, { expectedRepository: 'owner/repo' }), null, 2));"
```

## Fail-safe reconcile

Config, tree, fetch, layout-conflict, missing-directory, nested-artifact and source-validation
failures are recorded as failed runs and never reach reconcile. Reconcile also guards against the destructive case where a source owns active catalog
rows but the scan observes zero valid unique artifacts. The run fails before any create, update, or
deactivation.

An owned artifact whose directory is still present but whose manifest is now invalid (for example a
`source.path` that no longer matches) stays active with its last valid metadata; it is listed in
`skippedInvalid` until fixed. Only artifacts whose directory is gone are soft-deactivated.

For an intentional source cleanup, an Admin can arm `allowDestructiveReconcile` on the discovery
source and run it once. A successful run may then soft-deactivate the source's missing artifacts and
resets the option to false. A failed run does not consume the override.

## Artifact revisions

The scanner computes a portable `sha256:` digest from every Git blob under an artifact directory,
recursively. The input is each artifact-relative file path plus its Git blob OID, sorted by UTF-8
bytes (never the host locale). File ordering and
the artifact's outer repository path do not affect the value; content changes, additions, removals,
and renames do. Symlinks are hashed as their Git target-text bytes and are not followed.

The GitHub reader takes one recursive tree per run and reads every file by its blob SHA from that
tree, so a push during a scan cannot mix two commits. A local scan of a Git checkout hashes only
tracked files, so untracked or ignored clutter does not change the digest. A plain directory, or an
artifact that has never been committed, hashes every file on disk.

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
without snapshots are intentionally treated as not current until re-approved.

**Release note:** right after deploying 026, every approval recorded before it shows as outdated
("Re-review required"), and the Recommended indicator is hidden, until an Approver re-approves it. An Approver/Admin
records that fresh decision with the one-shot `reapproveCurrentRevision` control; it re-stamps the
current version/digest, resets immediately, and is audited as a new approval decision.

The complete implementation contracts and operating checks live in
[`specs/026-flexible-artifact-discovery/`](../specs/026-flexible-artifact-discovery/).
