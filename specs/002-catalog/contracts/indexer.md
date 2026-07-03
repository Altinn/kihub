# Contract: Indexing core (`@kihub/discovery-core`) + CLI

Payload-agnostic indexing logic plus the thin CLI that wires it to Payload. Behavior is fixed here;
implementation lives in `packages/discovery-core` and `apps/web/scripts/index-artifacts.ts`.

## `scan(rootPath) → RawArtifact[]`

Walk these type directories under `rootPath`: `skills`, `prompts`, `workflows`, `mcp`, `templates`,
`policies`, `playbooks`. Each immediate subfolder containing an `artifact.yaml` is one artifact.

```txt
RawArtifact {
  path:      string            // repo-relative folder, e.g. "skills/security-review"
  manifest?: ArtifactManifest  // parsed+validated (via @kihub/artifact-schema) when valid
  readme?:   string            // contents of sibling README.md if present
  valid:     boolean
  errors?:   string[]          // validation/parse errors when !valid
}
```

- Missing `README.md` → `readme` undefined (valid artifact still indexes).
- Invalid/unparseable manifest → `valid: false` with `errors` (not thrown).

## `buildRecord(manifest, readme?) → ArtifactRecord`

Maps a valid manifest (+README) to the `Artifact` collection shape (see data-model.md). Derives:

- `installCommand`: `apm install <manifest.install.apm.package>` if present, else empty.
- `readme`: the raw README markdown (or empty).
- copies `artifactId(id)`, `type`, `name`, `description`, `version`, `source`, `tags`, `visibility`,
  `lifecycleStatus(lifecycle.status)`.

## `reconcile(payload, records) → IndexReport`

Given a Payload instance and the valid records from one scan:

1. Detect duplicate `artifactId`s in `records`; first wins, rest → `duplicates` (skipped).
2. For each unique record: find `Artifact` by `artifactId`; **create** if absent (→ `created`),
   else **update in place** (→ `updated`). Set `active = true`, stamp `lastIndexedAt`.
3. Any `Artifact` with `active = true` whose `artifactId` was not in this run → set `active = false`
   (→ `deactivated`). (Soft-deactivate, never delete.)
4. Return the `IndexReport` (see data-model.md), including `skippedInvalid` passed through from scan.

All writes use `overrideAccess: true` (trusted server-side operation).

## CLI: `apps/web/scripts/index-artifacts.ts`

```txt
Usage: pnpm --filter web index          (reads AI_ARTIFACTS_PATH)
       AI_ARTIFACTS_PATH=/path/to/ai-artifacts pnpm --filter web index
```

- Resolves `AI_ARTIFACTS_PATH` (error with guidance if unset/missing).
- `scan` → split valid/invalid → `getPayload({ config })` → `reconcile`.
- Prints a human-readable summary (counts + lists) and exits `0` on success, `1` if any duplicates
  or invalid manifests were encountered (so it can gate a manual check), `2` on usage/path error.

## Observable outcomes (map to FR-001..FR-008, SC-001..SC-003, SC-006)

| Situation | Expected |
|-----------|----------|
| First run over N valid artifacts | N `Artifact` records created, each keyed by `artifactId`, `active=true`. |
| Re-run after editing an artifact | Matching record updated in place; no duplicate. |
| Re-run after removing an artifact | That record `active=false`; absent from listing. |
| Manifest fails schema validation | Skipped + reported; other artifacts still indexed. |
| Same id twice in one run | First indexed; rest reported as duplicates. |
| Any stored record | Contains only metadata (+README snapshot) — no artifact body. |
