# Implementation Plan: Multi-Source Discovery & Agent Artifacts

**Branch**: `main` (repo convention: features land on main) | **Date**: 2026-08-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/015-multi-source-agents/spec.md`

## Summary

Make discovery safe for many artifact repositories and add agents to the registry taxonomy.
(1) Every artifact gains a nullable `discoverySource` relationship; `reconcile()` takes the
scanned source's id, stamps ownership on every upsert (adoption of legacy rows, reassignment on
moves — ownership-by-last-sighting per the stable-identity principle), and deactivates only its
own source's missing artifacts. (2) `agent` becomes the eighth artifact type (`agents/` type
dir, manifest schema 1.0.0 → 1.1.0), with an optional sibling `agent-card.json` (A2A v1.0)
fetched per agent, validated tolerantly in `@kihub/artifact-schema`, stored verbatim as jsonb,
and rendered on the artifact detail page by a server-only `AgentCardPanel` — invalid/missing
cards never block registration and are reported per path in the run report. A Norwegian
type-label map (`lib/registry-view.ts`) is introduced for all eight types (none exists today).
One additive migration; all decisions in [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript ^5.7 (strict), Node >= 22

**Primary Dependencies**: Next.js 16.2.11 (App Router) + Payload 3.85.2 (`apps/web`); zod 4.4.3
(`@kihub/artifact-schema`); workspace packages `@kihub/discovery-core`, `@kihub/github-client`
(no new external dependencies)

**Storage**: PostgreSQL 16 (local: docker `kihub-postgres` :55432; prod: Azure PG Flexible).
New DDL: `'agent'` enum value, `artifacts.discovery_source_id` FK (`ON DELETE SET NULL`, index),
`artifacts.agent_card` jsonb, `discovery_runs` summary/array additions — one additive migration

**Testing**: vitest 4.1.9 — per-package unit suites (`pnpm -r test`) + `apps/web` integration
suite against live Payload/Postgres (`fileParallelism: false`; env must be exported:
`set -a; source apps/web/.env; set +a`). Current baseline: web 328/328 across 37 files,
packages 43 across 9 files

**Target Platform**: Azure Container Apps (standalone Next.js build; migrations run at boot via
`prodMigrations`)

**Project Type**: pnpm monorepo web application (`apps/web` + `packages/*`)

**Performance Goals**: scan cost unchanged except one extra GitHub `contents` request per
*agent* directory (404 → absent card); reconcile remains O(scanned + active-of-source)

**Constraints**: additive-only migration (upgrade flips zero artifacts, FR-007 / SC-003); zero
new client components; employee-facing UI on Designsystemet + kihub tokens only; card size cap
256 KB; `reconcile` source id is a **required** parameter (no silently-global fallback)

**Scale/Scope**: sources capped by existing `runAllEnabledSources` limit 200; deactivation query
`limit: 1000` per source (unchanged); ~9 code files touched + 1 migration + 1 new component +
1 new lib module + tests

## Constitution Check

*GATE: v3.1.0. Evaluated pre-Phase-0 and re-checked post-design — PASS on both.*

| Principle / constraint | Assessment | Status |
|---|---|---|
| I. Git is source of truth | Card + manifest stay in the artifact repo; KI Hub stores an indexed snapshot (like the readme), refreshed every scan, never edited in KI Hub (FR-015). No artifact *content* (agent code/config) is stored. | ✅ PASS |
| II. Payload owns enterprise context | `discoverySource`, `agentCard`, run-report fields are exactly "indexed technical metadata + governance metadata". | ✅ PASS |
| III. Every AI asset is an Artifact | `agent` added as a `type` value on the one Artifact concept — no new collection/subsystem. Principle III's own enumeration already names "agent definition", so **no constitution amendment is required** (spec assumption confirmed). | ✅ PASS |
| IV. Stable artifact identity | Strengthened: ownership-by-last-sighting makes repo moves first-class (FR-004) while all governance keys stay on `artifactId`. | ✅ PASS |
| V. APM-compatible distribution | Untouched. | ✅ PASS |
| VI. Governance is core value | Agents inherit the full type-blind governance model (verified: no per-type logic exists anywhere in governance-core / catalog-entries). | ✅ PASS |
| VII. Start simple | No card search indexing (deferred, seam identified); no per-source policy knobs; tolerant card schema instead of chasing strict A2A. | ✅ PASS |
| VIII. Two surfaces | Employee app renders card read-only; sources/runs remain Admin-only in `/cms` + `/admin/discovery`. Server-side role gating unchanged. | ✅ PASS |
| Design System constraint | `AgentCardPanel` + label wiring style exclusively via `--kihub-*`/`--ds-*` tokens; Designsystemet primitives for tags; no restyled primitives; zero client components. | ✅ PASS |
| Manifest is a versioned contract | Schema bump 1.0.0 → 1.1.0; JSON schema regenerated; docs updated (R4). | ✅ PASS |
| Testing gates | New unit + integration tests for scoping, adoption, moves, card validation, labels; migration verified on scratch DB. | ✅ PASS |

No violations → Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/015-multi-source-agents/
├── spec.md              # Feature specification (done)
├── plan.md              # This file
├── research.md          # Phase 0 — decisions R1–R12
├── data-model.md        # Phase 1 — field-level changes + card shape
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   ├── manifest-v1.1.md # Manifest schema 1.1.0 (agent type, agents/ dir, card sibling)
│   ├── agent-card.md    # Validated card subset + storage/render semantics
│   └── reconcile.md     # reconcile() signature, IndexReport, deactivation rules
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/artifact-schema/
├── src/schema.ts                     # + 'agent' in ARTIFACT_TYPES; schemaVersion default 1.1.0
├── src/agent-card.ts                 # NEW — agentCardSchema + validateAgentCard (R6)
├── src/index.ts                      # + exports
├── scripts/generate-json-schema.ts   # $id → artifact-1.1.0.json; regenerate committed schema/
├── docs/artifact-manifest.md         # version, type row, agent-card.json section
└── tests/ (schema.test.ts, agent-card.test.ts NEW)

packages/discovery-core/
├── src/scan.ts                       # + 'agents' in TYPE_DIRS; card fetch in scanRepo/scan (R7)
├── src/reconcile.ts                  # + { sourceId } param; scoped deactivation; adoption/
│                                     #   reassignment; agentCard splice; IndexReport fields (R1,R2,R9)
├── src/record.ts                     # unchanged (card is not manifest data)
└── tests/ (reconcile.test.ts fake grows and:/depth support; scanrepo.test.ts card cases)

packages/github-client/               # UNCHANGED (TYPE_DIR_SET is derived; readFile 404→undefined)

apps/web/src/
├── collections/Artifact.ts           # + discoverySource relationship, agentCard json,
│                                     #   type options as {value,label} from registry-view
├── collections/DiscoveryRun.ts       # + summary counts, adoptedIds/reassignedIds, cardIssues array
├── lib/discovery.ts                  # pass { sourceId } to reconcile; record new report fields
├── lib/registry-view.ts              # NEW — ARTIFACT_TYPE_LABELS (all 8, Norwegian) (R10)
├── components/AgentCardPanel.tsx     # NEW — server-rendered card section (R11)
├── components/DiscoveryRunSummary.tsx# surface duplicates + reassigned + card issues
├── components/CatalogFilters.tsx     # label lookup
├── components/ArtifactCard.tsx       # label lookup
├── app/(app)/artifacts/[artifactId]/page.tsx  # label + <AgentCardPanel>
├── scripts/index-artifacts.ts        # break-glass path: upserts stay unowned (null source) (R12)
├── migrations/20260812_*_agents_multisource.ts # NEW (+ index.ts registration; down hand-patch)
└── payload-types.ts                  # regenerated

apps/web/tests/
├── unit/registry-view.test.ts        # NEW
└── integration/                      # multi-source reconcile, agent discovery e2e,
                                      # agent-card lifecycle (valid→invalid→removed), run reporting
```

**Structure Decision**: Existing monorepo layout; no new packages, no new routes. The feature is
a contract bump in `artifact-schema`, a behavior change in `discovery-core`, and additive
Payload/UI wiring in `apps/web` — matching where 004 originally placed each concern.

## Complexity Tracking

Not applicable — no constitution violations.
