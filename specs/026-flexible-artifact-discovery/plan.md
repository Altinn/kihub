# Implementation Plan: Flexible Artifact Discovery & Revision-Bound Governance

**Branch**: `codex/026-flexible-artifact-discovery` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/026-flexible-artifact-discovery/spec.md`

## Summary

Extend the existing source-agnostic discovery pipeline with a strict repository-root `kihub.yaml`
contract that declares one or more artifact roots. The current `<type>/<slug>/artifact.yaml`
convention remains mandatory within every root, preserving predictable layout and type-directory
validation while allowing repositories to place roots under `src/` or service directories.

Discovery resolves config before enumeration, validates actual manifest source paths/repositories,
computes a deterministic digest over every Git blob below each artifact directory, and returns a
detailed scan result. Reconciliation adds a pre-write empty-source safety gate and reports changed
revisions. Payload persists config/run provenance and revision digests. Review and approval hooks
snapshot the current version+digest; employee reads compute whether the stored decision is current
without rewriting governance history. One additive migration introduces nullable snapshot fields,
run metadata, the artifact digest, and the one-shot destructive-reconcile switch.

## Technical Context

**Language/Version**: TypeScript 5.7+, Node.js 22+ (workspace currently exercised on Node 26)

**Primary Dependencies**: Next.js 16 App Router, Payload CMS 3.85/3.88 workspace baseline,
`@payloadcms/db-postgres`, `yaml` 2.9, Node `crypto`/`fs`, Designsystemet React 1.18

**Storage**: PostgreSQL through Payload; GitHub repositories remain canonical artifact storage

**Testing**: Vitest package/unit/integration tests, ESLint, `tsc --noEmit`, Next production build,
Payload additive migration up/down verification on a scratch PostgreSQL database

**Target Platform**: KI Hub web/container runtime on Linux; local break-glass scans on developer
workstations; GitHub REST API for automated discovery

**Project Type**: pnpm monorepo with reusable discovery/schema packages and one Next.js/Payload app

**Performance Goals**: One recursive Git tree request per remote scan; no artifact-body blob reads
solely for digesting; configuration parse O(config size); directory digest O(tree entries); catalog
reconcile remains linear in discovered + source-owned artifacts

**Constraints**: Git remains source of truth; no new artifact body storage; existing unconfigured
repositories remain compatible; every destructive guard runs before writes; no arbitrary manifest
crawl; no installer implementation; governance history is preserved by stable artifact ID

**Scale/Scope**: Up to 32 configured roots per repository, current catalog scale under 1,000 active
artifacts/source, existing `limit: 1000` reconciliation bound retained

## Constitution Check

*GATE: PASS before Phase 0 research. Re-checked after Phase 1 design: PASS.*

| Principle / gate | Assessment |
|---|---|
| I. Git is source of truth | PASS — `kihub.yaml`, artifacts, and all governed bytes stay in Git. Payload stores only hashes, existing snapshots, metadata, and governance context. |
| II. Payload owns enterprise context | PASS — digest/config provenance and decision snapshots are technical/governance metadata. No new artifact bodies are persisted. |
| III. Every AI asset is an Artifact | PASS — one generic scanner and record model serves every existing type; no type-specific subsystem is added. |
| IV. Stable artifact identity | PASS — path and repository may change without losing history; stable ID remains the relationship key. Revision currency is separate from identity. |
| V. Git-centric distribution | PASS — validated source paths improve APM/agentctl interoperability; installation remains out of scope. |
| VI. Governance is core value | PASS — the change closes the gap where an older approval could appear valid for changed content. Enforcement is server-side. |
| VII. Start simple, design for growth | PASS — explicit roots, one YAML filename, no globs/excludes, and a bounded schema solve the known need without a general crawler. |
| VIII. Two surfaces | PASS — employee UI only reads/communicates state; configuration and the destructive override remain repository/Admin concerns. |
| Contract-first | PASS — config, scan result, reconcile, governance revision, and Payload field contracts are specified before implementation. |
| Testing gate | PASS — package parity/digest tests and Payload integration tests cover validation and write paths. |

No constitution amendment is required. The artifact manifest schema remains 1.1.0 because the new
repository-level file is a separate discovery contract and no `artifact.yaml` field changes.

## Project Structure

### Documentation (this feature)

```text
specs/026-flexible-artifact-discovery/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── contracts/
│   ├── discovery-config-v1.md
│   ├── scan-and-digest.md
│   ├── reconcile-safety.md
│   └── governance-revision.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/discovery-core/
├── src/
│   ├── config.ts                    # NEW strict kihub.yaml parser + canonical config digest
│   ├── digest.ts                    # NEW Git blob + artifact-directory digest primitives
│   ├── scan.ts                      # roots, detailed scan result, actual path/repository validation
│   ├── record.ts                    # contentDigest in technical record
│   ├── reconcile.ts                 # pre-write empty guard + revisionChanged report
│   └── index.ts                     # public exports
└── tests/
    ├── config.test.ts               # NEW strict parser/path cases
    ├── digest.test.ts               # NEW deterministic digest cases
    ├── scan.test.ts                 # nested local roots + path validation
    ├── scanrepo.test.ts             # detailed scan/config/repository validation
    └── reconcile.test.ts            # zero guard + changed-revision report

packages/github-client/
├── src/client.ts                    # cached complete tree, roots, truncation, blob-OID digest
└── tests/client.test.ts             # nested roots, missing roots, digest, truncated tree

apps/web/src/
├── collections/
│   ├── Artifact.ts                  # contentDigest
│   ├── CatalogEntry.ts              # approval revision hooks/current-lifecycle enforcement
│   ├── Review.ts                    # review revision snapshot hook
│   ├── DiscoverySource.ts           # one-shot destructive reconcile override
│   └── DiscoveryRun.ts              # config provenance + revisionChanged reporting
├── lib/
│   ├── discovery.ts                 # detailed scan, expected repo, override/reset, run fields
│   └── governance.ts                # pure decision-currency computation + read projection
├── components/
│   ├── LifecycleBadge.tsx           # stale warning, no false green state
│   └── GovernancePanel.tsx          # revision details + stale review labels
├── migrations/
│   ├── 20261103_*_artifact_revision_governance.ts/json
│   └── index.ts
└── payload-types.ts                 # regenerated

apps/web/tests/
├── unit/
│   └── governance-revision.test.ts  # NEW current/stale pure projection cases
└── integration/
    ├── discovery-run.test.ts         # config metadata, revisionChanged, empty guard/reset
    ├── reindex-preserves.test.ts     # history preserved but approval becomes stale
    └── review-approval-flow.test.ts  # snapshots + current-promotion enforcement
```

**Structure Decision**: Extend the existing three package/app seams. Configuration, digesting,
scanning, and reconcile policy stay Payload-agnostic in `discovery-core`; GitHub tree mechanics stay
in `github-client`; database hooks, persistence, and employee rendering stay in `apps/web`.

## Complexity Tracking

No constitution violations require exceptions. The detailed scan result is additive and the legacy
`scan()` / `scanRepo()` array-returning APIs remain as wrappers, limiting migration cost for callers.
