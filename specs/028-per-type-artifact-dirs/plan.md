# Implementation Plan: Per-Type Artifact Directories in `kihub.yaml`

**Branch**: `028-per-type-artifact-dirs` (stacked on `026-flexible-artifact-discovery`, PR Altinn/kihub#176) | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/028-per-type-artifact-dirs/spec.md`

## Summary

Teams with their own folder layouts (first case: Altinn Studio, skills at `agents/_skills/<slug>/`)
register without moving anything: `kihub.yaml` gains an optional `discovery.artifactDirs` map from
manifest type to directories, each directly containing `<slug>/artifact.yaml`. Discovery is refactored
around one **container** model (`{dir, type}`), so the 026 root layout and the new typed directories
share one code path for type, path and conflict decisions, and the local and GitHub readers differ
only in how they list folders. All 026 safety properties stay: strict config, fail-closed scans,
unchanged digest/governance/reconcile guard, and a byte-identical config digest for roots-only
configs. Provenance gains one additive `artifactDirs` json field on discovery runs. All
documentation and the Norwegian `/bidra` guide are updated together, and the guide's examples are
checked by tests that run the real parser and matcher.

## Technical Context

**Language/Version**: TypeScript 5.x on Node 22 (pnpm monorepo)

**Primary Dependencies**: `yaml` (already used for `kihub.yaml`), `@kihub/artifact-schema` (`ARTIFACT_TYPES`, `validateManifest`), Payload 3.85.2, Next.js App Router, Designsystemet (guide page only)

**Storage**: PostgreSQL via Payload; one additive column (`discovery_runs.artifact_dirs jsonb`); no artifact bodies stored

**Testing**: vitest — package tests (`discovery-core`, `github-client`), web unit and integration tests; Payload migration verified up/down/up on a scratch database

**Target Platform**: Next.js server on Azure Container Apps; local break-glass scan via `scripts/index-artifacts.ts`

**Project Type**: web application plus workspace packages

**Performance Goals**: no regression — the GitHub reader still makes one recursive tree call per scan; enumeration is a pure filter over that tree

**Constraints**: fail closed; no new client components; guide stays pure data + server-rendered page; Norwegian (bokmål) copy; roots-only configs behave and hash exactly as in 026; generate migrations/types with `MEDIA_STORAGE_MODE=azure`

**Scale/Scope**: ≤ 32 roots and ≤ 32 directory entries per repository; a handful of source repositories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|-----------|------------|
| I. Git is the source of truth (NON-NEGOTIABLE) | **Pass.** Only configuration, locations and digests are indexed; artifact bodies stay in Git. The new `json` field holds a path mapping, not content. |
| II. Payload owns enterprise context | **Pass.** Provenance of a run lives in `discovery-runs`, as in 026. |
| III. Every AI asset is an artifact | **Pass.** No new asset kind; the eight types are reused as keys. |
| IV. Stable artifact identity | **Pass and reinforced.** Identity stays the manifest `id`; supporting arbitrary folders is exactly what lets a repo keep its layout without touching identity or governance. |
| V. Git-centric, APM-compatible | **Pass.** No install logic. Teams' folders are untouched, which keeps their tooling compatible. |
| VI. Governance is the core value | **Pass.** Digest, revision-bound approvals and the empty-source guard are unchanged; type conflicts fail closed so governance type can never be ambiguous. |
| VII. Start simple | **Pass with note.** Smallest extension that satisfies the concrete Altinn Studio need; globs, excludes and recursive discovery stay deferred. The container model removes code rather than adding a parallel path. |
| VIII. Two surfaces | **Pass.** Employee-facing change is content on the existing `/bidra` guide; admin run provenance appears in the back-office. No new admin in the employee app. |
| Technology constraints | **Pass.** No new dependency; Designsystemet components reused for the guide; no new client components. |

**Result: PASS — no violations, no amendment, Complexity Tracking not needed.** Post-design re-check
(after research R1–R10, data model and contracts): unchanged, PASS.

## Project Structure

### Documentation (this feature)

```text
specs/028-per-type-artifact-dirs/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── discovery-config-v1-artifactdirs.md
│   ├── scan-and-conflicts.md
│   └── guide-content.md
├── checklists/requirements.md
└── tasks.md              # created by /speckit-tasks
```

### Source Code (repository root)

```text
packages/discovery-core/
├── src/
│   ├── config.ts         # artifactDirs parse/validate, optional roots, canonical digest (R1–R3)
│   ├── layout.ts         # NEW: buildLayout, layoutForRoots, matchArtifactDirs, locateArtifact, assertNoNestedArtifacts
│   ├── scan.ts           # use layout; ArtifactLocation{path, expectedType}; local reader walks containers
│   └── index.ts          # export new API
└── tests/                # config, layout (new), scan, scanrepo

packages/github-client/
├── src/client.ts         # listArtifactDirs(layout) via matchArtifactDirs + required-dir existence
└── tests/client.test.ts

apps/web/
├── src/collections/DiscoveryRun.ts   # + artifactDirs json (read-only)
├── src/lib/discovery.ts              # persist resolved artifactDirs
├── src/migrations/                   # + …_discovery_run_artifact_dirs (.ts/.json), index.ts
├── src/payload-types.ts              # regenerated
├── src/lib/contribute-guide.ts       # new examples, checklist, troubleshooting, FAQ
├── src/app/(app)/bidra/page.tsx      # custom-layout section
└── tests/
    ├── unit/contribute-guide.test.ts # real parser + matcher over guide examples
    └── integration/discovery-*.test.ts # dirs-only scan, failure drills, run provenance

documentation/artifact-discovery.md
packages/artifact-schema/docs/artifact-manifest.md
README.md
CLAUDE.md
specs/026-flexible-artifact-discovery/contracts/*.md   # "Extended by 028" pointer only
```

**Structure Decision**: Extend the existing workspace packages and the `/bidra` guide in place. One new
module (`layout.ts`) holds every pure layout rule so both readers and the scanner share it; nothing new
is added to `apps/web` beyond a field, a migration and guide content.

## Risks and notes

- **Reader contract change** touches ten test fakes and the GitHub client tests. Fakes with no
  parameter stay valid; the GitHub tests that pass root arrays move to `layoutForRoots([...])`.
- **026 is unmerged.** 028 is stacked on it and its migration snapshot is generated on top of 026's. If
  026 is rebased, 028's migration must be regenerated (same rule as in CLAUDE.md for 020).
- **Error wording changes** for the type mismatch message; no test asserts the old text, and the guide
  entries are updated with it (R10).
- **Local DB in push mode** may hang tests on a schema mismatch: use a per-branch database clone.
