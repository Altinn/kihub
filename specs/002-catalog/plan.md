# Implementation Plan: Phase 2 — Catalog

**Branch**: `002-catalog` | **Date**: 2026-07-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-catalog/spec.md`

## Summary

Turn the Phase 1 empty shell into a working catalog. Add a reusable indexing core that reads a
local checkout of `ai-artifacts`, validates each manifest with `@kihub/artifact-schema`, derives
technical metadata (identity, type, name, description, current version, source, install command,
README snapshot), and reconciles it into a new Payload `Artifact` collection keyed by the stable
artifact ID (add/update/deactivate, duplicate-id detection). A maintainer-run CLI triggers indexing.
Authenticated employees browse a listing filterable by type, tag, and category (type-derived), and
open an artifact detail page that renders the README and shows a copyable install command
(`apm install …`). Local-first; no GitHub API, automation, governance workflows, or semantic search.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ (Phase 1 toolchain).

**Primary Dependencies**:
- Next.js 16 (App Router) + Payload CMS 3.85 (`@payloadcms/db-postgres`) — carried over from Phase 1.
- `@kihub/artifact-schema` (workspace) — manifest parsing/validation, reused for indexing.
- Digdir Designsystemet (`@digdir/designsystemet-react` + `-css`) — all catalog UI.
- `react-markdown` (+ `remark-gfm`) — render the README snapshot safely (no raw HTML) on the detail page, styled with Designsystemet typography.
- `yaml` (via `@kihub/artifact-schema`) for manifest parsing.

**Storage**: PostgreSQL (Phase 1). New Payload `Artifact` collection stores indexed technical
metadata only (Principle II). No artifact bodies (Principle I).

**Testing**: Vitest. Unit: repo scan, install-command derivation, reconcile planning
(add/update/deactivate/duplicate detection). Integration: reconcile against a live Payload+Postgres
(create → re-index update → removal deactivation). Catalog listing/detail verified via quickstart.

**Target Platform**: Local dev (Phase 1). Indexing reads a local `ai-artifacts` checkout at a
configured path (`AI_ARTIFACTS_PATH`).

**Project Type**: Web app monorepo — `apps/web` (Next.js + Payload) + `packages/` (adds
`discovery-core`; reuses `artifact-schema`).

**Performance Goals**: Locate an artifact via type+tag filter and reach detail in under 30s (SC-004).
No throughput targets this phase (small internal catalog).

**Constraints**:
- Only technical metadata stored; catalog rebuildable from Git by re-indexing (FR-021, Principle I).
- All UI from Designsystemet (constitution).
- Indexing = maintainer-run CLI reading a local path; no GitHub API / automation (FR-001, FR-022).
- Categories derived from `type`; single current version; per clarifications.

**Scale/Scope**: Small internal catalog (tens of artifacts). One `Artifact` collection, one indexer
CLI, one listing page + filters, one detail page.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Constraint | Phase 2 compliance | Status |
|------------------------|--------------------|--------|
| I. Git is source of truth | Only metadata + README snapshot stored; catalog fully rebuildable by re-indexing; no artifact bodies. | ✅ PASS |
| II. Payload owns context not content | New `Artifact` = indexed *technical* metadata collection (per §6.1). Governance metadata (CatalogEntry) stays deferred to Phase 3. | ✅ PASS |
| III. Everything is an Artifact | Single generic `Artifact` collection differentiated by `type`; no per-type collections. | ✅ PASS |
| IV. Stable artifact identity | Records keyed by `artifactId`; reconcile updates in place; duplicate ids detected. | ✅ PASS |
| V. Git-centric, APM-compatible distribution | Install command derived from manifest `install.apm`; surfaced for copy; no installation reimplemented. | ✅ PASS |
| VI. Governance is the core value | Lifecycle/visibility indexed and displayed now; review/approval workflows deferred to Phase 3 (foundation not bypassed). | ✅ PASS |
| VII. Start simple, design for growth | Local path + on-demand CLI + type-derived categories + single version; indexing core factored for later remote/in-app reuse. | ✅ PASS |
| Design System (MANDATORY) | Listing + detail built from Designsystemet; README rendered via react-markdown styled with DS tokens/typography (renderer, not a competing UI kit). | ✅ PASS |
| Auth (employees only) | Catalog behind the Phase 1 employee gate (FR-015). | ✅ PASS |
| Testing gate | Discovery/validation/reconcile logic + install-command derivation have automated tests; reconcile integration test covers the Payload write path. | ✅ PASS |
| Contract-first (manifest schema) | Reuses the versioned `@kihub/artifact-schema` contract; no schema change this phase. | ✅ PASS |

**Result**: No violations. Complexity Tracking intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-catalog/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── artifact-collection.md   # Payload Artifact collection shape (technical metadata)
│   └── indexer.md               # discovery-core scan + reconcile contract & report shape
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/
  web/
    src/
      collections/
        Artifact.ts            # NEW: indexed technical-metadata collection (keyed by artifactId)
      app/
        (app)/
          page.tsx             # CHANGED: empty shell -> catalog listing + filters
          artifacts/
            [artifactId]/
              page.tsx         # NEW: artifact detail (metadata + README + install command)
      components/
        ArtifactCard.tsx       # NEW: listing card (Designsystemet)
        CatalogFilters.tsx     # NEW: type/tag/category filters (URL-param driven)
        Markdown.tsx           # NEW: react-markdown wrapper styled with Designsystemet
        CopyButton.tsx         # NEW: copy install command (client component)
      lib/
        catalog.ts             # NEW: query helpers (list/get via Payload Local API)
      scripts/
        index-artifacts.ts     # NEW: maintainer CLI — getPayload + discovery-core reconcile
      payload.config.ts        # CHANGED: register Artifact collection
    tests/
      integration/
        reconcile.test.ts      # NEW: scan+reconcile against live Payload (add/update/deactivate)

packages/
  discovery-core/              # NEW: reusable, Payload-agnostic indexing core
    src/
      scan.ts                  # walk type folders -> RawArtifact[] (manifest, readme, path, validity)
      record.ts                # build technical-metadata record; derive install command
      reconcile.ts             # reconcile(payload, records) -> report (add/update/deactivate/dup)
      index.ts
    tests/
      scan.test.ts             # scanning + validity handling
      record.test.ts           # install-command derivation, field mapping
    package.json               # @kihub/discovery-core (deps: @kihub/artifact-schema)
```

**Structure Decision**: Add `packages/discovery-core` as a reusable, Payload-agnostic core (scan +
record-build + reconcile-plan), consumed by a thin `apps/web` CLI that supplies the Payload Local
API and the local repo path. This honors Principle VII (a later remote/in-app trigger reuses the
same core) and keeps the write path testable. The Phase 1 `(app)/page.tsx` shell becomes the
listing; a new `artifacts/[artifactId]` route provides detail.

## Complexity Tracking

> No constitution violations — section intentionally empty.
