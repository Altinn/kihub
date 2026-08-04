# Phase 0 Research: Phase 2 — Catalog

The stack is inherited from Phase 1; the open decisions below are resolved. Clarification answers
(index source = local path, trigger = CLI, categories = type-derived, versions = current) are the
inputs; this records the resulting technical decisions.

## 1. Indexing core placement & Payload boundary

**Decision**: A new `packages/discovery-core` holds the **Payload-agnostic** logic: `scan(path)`
(walk `ai-artifacts` type folders → `RawArtifact[]`), `buildRecord(manifest, readme)` (technical
metadata + derived install command), and `reconcile(payload, records)` (writes via an injected
Payload instance → report). A thin CLI in `apps/web/scripts/index-artifacts.ts` supplies
`getPayload({ config })` and `AI_ARTIFACTS_PATH`.

**Rationale**: Keeps scanning/derivation pure and unit-testable, isolates the single Payload write
path for an integration test, and lets a later remote/in-app trigger (Phase 4) reuse the same core
(Principle VII). `discovery-core` depends on `@kihub/artifact-schema` for validation — no schema
duplication.

**Alternatives**: Putting all logic in `apps/web` — rejected: couples scanning to Payload and
hampers reuse/testing.

## 2. Reading the local repository

**Decision**: Read a local checkout at `AI_ARTIFACTS_PATH`. Walk known type directories
(`skills/`, `prompts/`, `workflows/`, `mcp/`, `templates/`, `policies/`, `playbooks/`); each
immediate subfolder containing `artifact.yaml` is one artifact. Read its `artifact.yaml` and
sibling `README.md` (if present). Validate the manifest with `@kihub/artifact-schema`.

**Rationale**: Matches the clarified local-first decision; no GitHub credentials/network. Directory
layout mirrors the seeded `ai-artifacts` repo. Simple `fs` traversal.

**Alternatives**: GitHub API fetch — deferred to Phase 4. Recursive glob for any `artifact.yaml`
anywhere — acceptable but the type-folder walk also gives a natural sanity check that `type`
matches its folder.

## 3. Reconciliation strategy (add / update / deactivate / duplicates)

**Decision**: Reconcile keyed by `artifactId`. For each valid scanned record: upsert (create if
absent, else update in place). After processing, any previously-active catalog record whose
`artifactId` was not seen in this run is **soft-deactivated** (`active = false`) rather than deleted,
preserving history for future governance. Duplicate `artifactId`s within a single run are detected
and reported; the first is indexed, the rest skipped as conflicts. Invalid manifests are skipped and
reported. Each run stamps `lastIndexedAt` and returns a report `{ created, updated, deactivated,
skippedInvalid, duplicates }`.

**Rationale**: Idempotent and repository-truthful (FR-004/FR-005); soft-deactivation keeps the model
rebuildable and forward-compatible with Phase 3 governance history (Principle IV/VI). Duplicate
detection satisfies FR-006 and the edge case.

**Alternatives**: Hard-delete removed artifacts — rejected: loses history and any future governance
linkage. Wipe-and-reinsert each run — rejected: churns ids and breaks "update in place".

## 4. README rendering

**Decision**: Store the raw README markdown as the snapshot (a text field). Render it on the detail
page with `react-markdown` + `remark-gfm`, **no raw HTML** (react-markdown ignores embedded HTML by
default), styled with Designsystemet typography (headings/paragraph/list components or token-based
CSS).

**Rationale**: Safe by default for semi-trusted internal content, no separate sanitizer needed, and
integrates cleanly with the mandated design system (react-markdown is a renderer, not a competing UI
kit — Design System mandate preserved). Storing raw markdown keeps the snapshot faithful and small.

**Alternatives**: `marked` → HTML + a sanitizer (DOMPurify) — more moving parts and an XSS surface to
manage. Pre-render to HTML at index time — rejected: stores derived HTML, harder to restyle.

## 5. Listing, filtering, and detail routing

**Decision**: The listing is a server component that reads URL query params (`?type=&tag=&category=`)
and queries the `Artifact` collection via the Payload Local API with a `where` (always
`active = true`). Category filter maps to `type` groupings (categories are type-derived). Tag filter
matches artifacts containing the tag(s); combined filters AND together. Detail route
`(app)/artifacts/[artifactId]/page.tsx` fetches by `artifactId`; unknown id → `notFound()`.
The copy-install-command control is a small client component.

**Rationale**: Server-side querying keeps data access on the Local API (no public REST needed),
URL-param filters are shareable and SSR-friendly, and `active = true` enforces the
"present-in-repo" rule. Matches Phase 1's server-component + Designsystemet approach.

**Alternatives**: Client-side fetch/filter over a full dump — rejected: unnecessary for a small
catalog and leaks more data to the client than needed. Full-text search — out of scope (Phase 5).

## 6. Testing approach

**Decision**: Vitest. Unit (in `discovery-core`): `scan` (valid/invalid/missing-README/nested),
`buildRecord` (install-command derivation from `install.apm.package`; field mapping), reconcile
planning (add/update/deactivate/duplicate) with a fake payload. Integration (in `apps/web`):
`reconcile` against a live Payload+Postgres — first run creates, second run updates in place (no
dup), removing an input deactivates it. Listing/detail behavior verified via quickstart Scenarios.

**Rationale**: Satisfies the constitution testing gate (discovery/validation/reconcile + the Payload
write path). Live Postgres is already available from Phase 1 (Docker, host port 55432).

**Alternatives**: E2E of the UI — deferred; server-component + Local API logic is covered by the
integration test and manual quickstart.
