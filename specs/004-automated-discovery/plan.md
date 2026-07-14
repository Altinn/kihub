# Implementation Plan: Phase 4 — Automated Discovery Triggers

**Branch**: `feat/new-architecture` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-automated-discovery/spec.md`

## Summary

Make the catalog self-updating. Phase 2 discovery was a maintainer-run CLI reading a local
`ai-artifacts` checkout; Phase 4 keeps the same idempotent `reconcile` but drives it from
automated triggers and a remote source. Three trigger paths converge on one discovery-service
code path: (1) a **GitHub webhook** (HMAC-verified `X-Hub-Signature-256`) fires on push, (2) a
**scheduled scan** invoked on a configurable cadence catches missed events, and (3) an **in-app
Admin "Run now"** replaces the CLI as the primary manual path. Content is fetched **remotely from
GitHub** via a new pure `@kihub/github-client`, fed through a source-agnostic reader added to
`@kihub/discovery-core` (so `scan`/`reconcile` and the Phase 2 CLI are preserved), then reconciled
into the existing `artifacts` collection — leaving all Phase 3 governance state untouched. Every
run writes a `discovery-runs` record (trigger, source, outcome, change summary) for observability.
Two new Payload collections (`discovery-sources`, `discovery-runs`), all Admin-gated. No semantic
search (Phase 5).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ (Phase 1–3 toolchain, unchanged).

**Primary Dependencies**:
- Next.js 16 (App Router) + Payload CMS 3.85 (`@payloadcms/db-postgres`) — carried over.
- Digdir Designsystemet (`@digdir/designsystemet-react` + `-css`) — all discovery admin UI.
- New workspace package `@kihub/github-client` (pure, wraps GitHub's REST contents/trees + raw
  blob fetch via the platform `fetch`; no Payload dependency; Octokit optional — see research §2).
- `@kihub/discovery-core` — **extended, not rewritten**: add a `RepoReader` interface and
  `scanRepo(reader)`; keep `scan(rootPath)` as a thin local-FS reader wrapper so the CLI and all
  Phase 2 tests keep passing. `reconcile` is unchanged.
- Node `crypto` (HMAC) for webhook signature verification — no new dependency.

**Storage**: PostgreSQL (unchanged). Two new Payload collections — `discovery-sources` (connection
config: repo ref, credential env-var name, webhook signing secret, enabled, lastRun snapshot) and
`discovery-runs` (append-only run history). Both hold operational/enterprise-context metadata only
(Principle II); zero artifact content (Principle I). The Phase 2 `artifacts` collection and all
Phase 3 governance collections are unmodified in shape.

**Testing**: Vitest. Unit: `@kihub/github-client` (path/tree mapping, error handling via a faked
`fetch`), `@kihub/discovery-core` `scanRepo` against a fake `RepoReader` (parity with the local
`scan`). Integration (Payload): webhook signature accept/reject, one full run records a
`discovery-runs` doc + reconciles + updates the source snapshot, re-run preserves governance
(reuses Phase 3 guarantee), non-Admin trigger refused, overlapping-run serialization.

**Target Platform**: Local dev baseline (`AUTH_MODE=mock`, Admin persona for the discovery UI);
Azure Container Apps for the deployed scheduled trigger (research §1).

**Project Type**: Web app monorepo — `apps/web` (Next.js + Payload) + `packages/` (adds
`github-client`; extends `discovery-core`; `artifact-schema`, `governance-core` untouched).

**Performance Goals**: A webhook-triggered run reflects catalog changes within a few minutes
(SC-001); no throughput target beyond the small internal catalog (tens of artifacts, a full
re-scan per trigger per Clarifications).

**Constraints**:
- Webhook authenticity enforced by per-source HMAC (`X-Hub-Signature-256`); unverified
  notifications run no discovery (FR-002, research §3).
- One discovery-service path (`lib/discovery.ts`) shared by webhook route, scheduled route, and
  in-app Server Action — reconcile semantics defined exactly once (FR-003).
- Runs serialized per source (skip/coalesce if a run is already active) so scheduled + webhook
  cannot race or duplicate (FR-008, research §4).
- A fetch/unreachable failure records a failed run and MUST NOT mass-deactivate existing entries
  (FR-009) — deactivation only happens on a successful scan that observed the repo.
- Secrets (GitHub token, webhook secret) never stored in run records or surfaced in UI; token
  supplied via env, referenced by name from the source doc (research §5).
- Trigger + source config Admin-only, enforced server-side via Payload `access` (FR-013).
- All admin UI from Designsystemet (constitution).

**Scale/Scope**: Same small internal catalog. Initial single connected source (`ai-artifacts`),
but the `discovery-sources` collection models multiple. One new package, one extended package, two
collections, two API routes, one admin page, one shared service module.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Constraint | Phase 4 compliance | Status |
|------------------------|--------------------|--------|
| I. Git is source of truth | Discovery still only *reads* Git and stores metadata; remote fetch reinforces Git as the canonical source. No artifact bodies persisted. | ✅ PASS |
| II. Payload owns context not content | `discovery-sources`/`discovery-runs` hold connection + operational metadata only, separate from the technical `artifacts` record. | ✅ PASS |
| III. Everything is an Artifact | Discovery is type-agnostic (walks the same `TYPE_DIRS`); no per-type trigger logic. | ✅ PASS |
| IV. Stable artifact identity | `reconcile` still keys create/update/deactivate on stable `artifactId`; changing the *source* of bytes doesn't touch identity. | ✅ PASS |
| V. Git-centric, APM-compatible distribution | Unchanged — install/distribution untouched; only discovery triggering/sourcing changes. | ✅ PASS |
| VI. Governance is the core value | Automated discovery *feeds* governance: new artifacts land ready to be governed and re-runs preserve Phase 3 state (FR-004/FR-005). Run history is auditable (FR-010/FR-014). | ✅ PASS |
| VII. Start simple, design for growth | This is the exact deferred item in Principle VII ("on-demand first; webhooks/scheduled later"). Full re-scan per trigger over delta parsing; external scheduler over in-process cron; token-by-env over a secrets vault — each the simplest option that satisfies the phase. | ✅ PASS |
| Design System (MANDATORY) | Discovery admin page (source list, run history, Run-now) built from Designsystemet only. | ✅ PASS |
| Discovery Service constraint | Constitution: discovery "runs on demand initially; scheduled/webhook/GitHub-Action triggers are additive" — Phase 4 adds exactly these, additively, reusing the existing scan/reconcile. | ✅ PASS |
| Auth (employees only, roles) | Reuses Phase 1 auth + Phase 3 five-role model; discovery operations gated to Admin. Webhook route is unauthenticated-by-session but HMAC-verified (machine caller). | ✅ PASS |
| Testing gate | `github-client` + `scanRepo` unit tests; Payload integration tests for signature verify, run recording, governance preservation, access control, serialization. | ✅ PASS |
| Contract-first | `github-client` reader interface, extended `discovery-core` `RepoReader`/`scanRepo`, the two collection shapes, and the webhook/scan route contracts documented in `contracts/`. | ✅ PASS |

**Result**: No violations. Complexity Tracking intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/004-automated-discovery/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── github-client.md              # GitHub repo-reader contract + RepoReader interface
│   ├── discovery-core-scanrepo.md    # source-agnostic scanRepo + local-reader back-compat
│   ├── discovery-collections.md      # discovery-sources + discovery-runs Payload shapes
│   └── discovery-routes.md           # webhook + scheduled-scan routes + in-app trigger action
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/
  web/
    src/
      collections/
        Artifact.ts                 # unchanged (Phase 2)
        CatalogEntry.ts             # unchanged (Phase 3)
        Review.ts / AuditLog.ts     # unchanged (Phase 3)
        Users.ts                    # unchanged
        DiscoverySource.ts          # NEW: source connection config (Admin-gated)
        DiscoveryRun.ts             # NEW: append-only run history
      payload.config.ts             # CHANGED: register DiscoverySource, DiscoveryRun
      app/
        api/
          discovery/
            webhook/[sourceId]/route.ts  # NEW: per-source HMAC-verified GitHub webhook → runDiscovery(source,'webhook')
            scan/route.ts           # NEW: secured scheduled-scan trigger → runDiscovery(all,'scheduled')
        (app)/
          admin/
            discovery/
              page.tsx              # NEW: Admin source list + run history + "Run now" (Server Action)
      components/
        DiscoveryRunSummary.tsx     # NEW: outcome + created/updated/deactivated/skipped counts
        DiscoverySourceCard.tsx     # NEW: source status (last run, outcome) + Run-now control
      lib/
        discovery.ts                # NEW: runDiscovery(source, trigger) — fetch→scanRepo→reconcile→
                                     #      record DiscoveryRun + update source snapshot; serialized
                                     #      per source. Plus triggerDiscovery Server Action (Admin).
    scripts/
      index-artifacts.ts            # UNCHANGED: local-checkout CLI, retained as break-glass fallback
    tests/
      integration/
        discovery-webhook.test.ts   # NEW: signature accept/reject; rejected → no run
        discovery-run.test.ts       # NEW: run records a discovery-runs doc + reconciles + updates source
        discovery-access.test.ts    # NEW: non-Admin trigger / source edit refused
        discovery-serialize.test.ts # NEW: overlapping triggers for one source do not race/duplicate
        reindex-preserves.test.ts   # EXISTING (Phase 3): still green — governance preserved on auto-run

packages/
  github-client/                    # NEW: pure GitHub repo reader (constitution names this package)
    src/
      client.ts                     # createGithubRepoReader({ repo, ref, token }): RepoReader
      index.ts
    tests/
      client.test.ts                # faked fetch: tree walk, blob read, 404/unreachable handling
    package.json                    # @kihub/github-client
  discovery-core/                   # EXTENDED (Phase 2 package)
    src/
      scan.ts                       # CHANGED: extract RepoReader interface + scanRepo(reader);
                                     #          scan(rootPath) becomes a local-FS reader wrapper
      reconcile.ts                  # unchanged
      record.ts                     # unchanged
      index.ts                      # CHANGED: export RepoReader, scanRepo, createLocalReader
    tests/
      scan.test.ts                  # unchanged (local reader parity)
      scanrepo.test.ts              # NEW: scanRepo against a fake reader == scan against a temp dir
```

**Structure Decision**: Keep Phase 2's pure-core + thin-Payload-layer pattern. The *only* change
inside `discovery-core` is factoring the filesystem walk behind a `RepoReader` interface so the
identical `scanRepo` logic runs over a local checkout (CLI/back-compat) or a remote GitHub repo
(new `@kihub/github-client`). `reconcile` — the create/update/deactivate-by-`artifactId` engine —
is untouched, so automated runs inherit Phase 3's governance-preservation guarantee for free. All
three trigger entry points (webhook route, scheduled route, in-app Admin action) call one
`lib/discovery.ts::runDiscovery`, which is where fetch→scan→reconcile→record-run and per-source
serialization live, so reconcile semantics and audit recording are defined exactly once.

## Complexity Tracking

> No constitution violations — section intentionally empty.
