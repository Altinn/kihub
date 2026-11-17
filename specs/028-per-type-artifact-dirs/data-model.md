# Data Model: Per-Type Artifact Directories (028)

Extends `specs/026-flexible-artifact-discovery/data-model.md`. Nothing here stores artifact bodies
(Principle I); everything is configuration provenance or in-memory scan state.

## 1. Repository `kihub.yaml` v1 (extended)

```text
schemaVersion: 1                       required, number 1
discovery:                             required mapping
  artifactRoots: [path, …]             optional, 1–32 unique roots   (026, unchanged)
  artifactDirs:                        optional mapping              (028)
    <type>: [path, …]                  type ∈ ARTIFACT_TYPES; list non-empty, unique
```

Rules:

- At least one of `artifactRoots`, `artifactDirs` must be present (and non-empty).
- Only listed locations are scanned. No implicit `.` when only `artifactDirs` is given.
- `artifactDirs` total entries across all types ≤ 32.
- Paths use the 026 grammar; `.` is rejected for `artifactDirs`.
- No `kihub.yaml` → roots `['.']`, `artifactDirs` empty, `configDigest = null` (unchanged).

## 2. `ResolvedDiscoveryConfig` (in memory)

| Field | Type | Notes |
|-------|------|-------|
| `schemaVersion` | `1` | unchanged |
| `artifactRoots` | `string[]` | sorted; `[]` allowed only when `artifactDirs` is non-empty |
| `artifactDirs` | `Partial<Record<ArtifactType, string[]>>`, **optional** | new; present only when the file uses it (roots-only configs resolve exactly as in 026, so 026's tests pass unchanged); each list sorted by UTF-8 bytes; types in `ARTIFACT_TYPES` order |
| `configPath` | `'kihub.yaml' \| null` | unchanged |
| `configDigest` | `string \| null` | roots-only: identical to 026; see contract |

## 3. `DiscoveryLayout` (in memory, pure, derived from the config)

| Field | Type | Notes |
|-------|------|-------|
| `containers` | `{ dir: string; type: ArtifactType; listed: boolean }[]` | sorted by `dir`; deduped; artifacts live at `<dir>/<slug>`; `listed` is true when the dir is in `artifactDirs` |
| `requiredDirs` | `string[]` | roots (except `.`) and every `artifactDirs` entry; must exist at the ref |

Derivation: each root `R` → `{join(R, typeDir), typeFor(typeDir)}` for all eight type directories; each
`artifactDirs[T]` entry `D` → `{D, T}`. Same `dir` with two types → `DiscoveryConfigError`.

## 4. `ArtifactLocation` (in memory)

| Field | Type | Notes |
|-------|------|-------|
| `path` | `string` | actual repo-relative folder, e.g. `agents/_skills/tekstforfatter-docs` |
| `expectedType` | `ArtifactType` | the container's type; replaces 026's `typeDir`/`root` pair |
| `containerDir` | `string` | the container directory, for error messages |
| `listed` | `boolean` | whether the container is in `artifactDirs`; scopes the nested-artifact check |

`RawArtifact` is unchanged. Its `valid`/`errors` carry the type and `source.path` checks.

## 5. `discovery-runs` (Payload collection) — one additive field

| Field | Type | Notes |
|-------|------|-------|
| `artifactDirs` | `json`, read-only, nullable | **new**; resolved mapping, e.g. `{"skill":["agents/_skills"]}`; `null` when unused |
| `artifactRoots` | `text[]` | unchanged; `[]` for dirs-only files |
| `configPath`, `configDigest` | text | unchanged |

Migration `…_discovery_run_artifact_dirs`: `ALTER TABLE "discovery_runs" ADD COLUMN "artifact_dirs"
jsonb;` with `down` dropping it `IF EXISTS`. Reversible, additive, no backfill. The migration snapshot
(`.json`) is generated on top of `20261103_080248_artifact_revision_governance`.

## 6. No change

`artifacts`, `catalog-entries`, `reviews`, `discovery-sources`: no schema change. Content digest,
revision snapshots, reapproval and the empty-source guard are untouched (FR-016).

## State and validation order (one scan)

1. Read `kihub.yaml` → `resolveDiscoveryConfig` (fails whole scan).
2. `buildLayout` (fails whole scan on type conflicts).
3. Reader checks `requiredDirs` exist, lists `<slug>` folders under containers (fails whole scan).
4. `assertNoNestedArtifacts` over the listed folders, only for pairs involving an `artifactDirs` container (fails whole scan).
5. Per folder: `locateArtifact` → validate manifest → type / `source.path` / `source.repository`
   checks (per-artifact `valid:false`).
6. Reconcile (unchanged, including the empty-source guard).
