# Feature Specification: Phase 2 — Catalog

**Feature Branch**: `002-catalog`

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "Phase 2 — Catalog for KI Hub: authenticated employees can browse a listing of artifacts and open an artifact detail page showing its metadata, README, versions, and install command (e.g. `apm install digdir/security-review`). Artifacts are indexed on demand from the sibling ai-artifacts repo into Payload (technical metadata: manifest, readme snapshot, versions, install command, source), and can be filtered by type, tags, and categories. Builds on the Phase 1 foundation (auth shell + artifact.yaml schema). No automated discovery triggers (GitHub Action/webhook — Phase 4), no review/approval governance workflows (Phase 3), and no semantic search (Phase 5) yet."

## Clarifications

### Session 2026-07-03

- Q: How should on-demand indexing read the ai-artifacts repository? → A: From a local/cloned checkout via a configured filesystem path (no GitHub API/credentials this phase; remote fetch + webhooks deferred to Phase 4).
- Q: How is indexing triggered? → A: A maintainer-run CLI/script command (no in-app trigger; avoids needing the role model, which is Phase 3). The indexing core is reusable for a later in-app trigger.
- Q: What does "category" mean as a filter facet? → A: A grouping derived from the artifact `type` (no separate taxonomy and no manifest change this phase).
- Q: What version information does the catalog show? → A: The single current manifest version (treated as latest); multi-version history is deferred.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Index artifacts from the content repository (Priority: P1)

A maintainer runs an on-demand indexing operation that scans the `ai-artifacts` repository, reads each artifact's manifest and README, and records the indexed technical metadata (identity, type, name, description, version(s), source location, install command, and a README snapshot) in the catalog — keyed by the stable artifact ID. Running it again reflects any changes (new, updated, or removed artifacts) without creating duplicates.

**Why this priority**: Nothing in the catalog can be browsed or opened until artifacts have been indexed. This slice turns the empty Phase 1 shell into a populated catalog and is independently verifiable (inspect the indexed records) without any UI. It also proves the platform-versus-content boundary: metadata is derived from Git, and the catalog stays rebuildable from the repository.

**Independent Test**: Point indexing at the seeded `ai-artifacts` repo, run it, and confirm one catalog record per artifact with correct identity/type/name/version/source/install command and a README snapshot; run it a second time and confirm updates apply with no duplicates.

**Acceptance Scenarios**:

1. **Given** an `ai-artifacts` repo with valid manifests, **When** indexing runs, **Then** the catalog contains exactly one record per artifact, keyed by its stable artifact ID, with the indexed technical metadata populated.
2. **Given** an artifact whose manifest fails schema validation, **When** indexing runs, **Then** that artifact is skipped and reported, and valid artifacts are still indexed.
3. **Given** an already-indexed artifact whose manifest changed (e.g., new version or description), **When** indexing runs again, **Then** the existing record is updated in place (no duplicate) and the last-indexed time is refreshed.
4. **Given** an artifact that was indexed but has since been removed from the repo, **When** indexing runs again, **Then** it is no longer presented as an active catalog entry.
5. **Given** any indexed record, **When** its stored fields are inspected, **Then** they contain only metadata about the artifact (manifest, README snapshot, versions, install command, source) and never the artifact's executable body.

---

### User Story 2 - Browse and filter the catalog (Priority: P2)

An authenticated employee opens the catalog and sees a listing of indexed artifacts, each showing at a glance its name, type, description, and key tags. They can narrow the list by type (skill, prompt, workflow, MCP, template, policy, playbook), by tags, and by category, and can combine filters to find relevant artifacts quickly.

**Why this priority**: Discovery is the headline value of the catalog. Once data is indexed (US1), a browsable, filterable listing lets employees actually find artifacts — the core reason the catalog exists. It is independently testable against indexed data and delivers value even before the detail page exists.

**Independent Test**: With artifacts indexed, load the catalog listing and confirm all active artifacts appear with name/type/description; apply a type filter, a tag filter, and a category filter (individually and combined) and confirm the listing narrows to the matching artifacts.

**Acceptance Scenarios**:

1. **Given** indexed artifacts, **When** an employee opens the catalog, **Then** a listing of all active artifacts is shown, each with at least name, type, and description.
2. **Given** the listing, **When** the employee filters by a type, **Then** only artifacts of that type are shown.
3. **Given** the listing, **When** the employee filters by one or more tags, **Then** only artifacts carrying those tags are shown.
4. **Given** the listing, **When** the employee filters by a category, **Then** only artifacts in that category are shown.
5. **Given** the listing, **When** the employee combines filters (e.g., type + tag), **Then** only artifacts matching all selected filters are shown.
6. **Given** no artifacts match the active filters, **When** the listing renders, **Then** an intentional empty state is shown (not an error).
7. **Given** an unauthenticated visitor, **When** they attempt to open the catalog, **Then** they are redirected to sign-in (Phase 1 access rules still apply).

---

### User Story 3 - View an artifact's detail page (Priority: P3)

From the listing, an employee opens an artifact to see a detail page with its full metadata (identity, type, owner, tags, visibility, lifecycle status), its README rendered for reading, the version(s) known to the catalog, and a ready-to-use install command they can copy (e.g., `apm install digdir/security-review`).

**Why this priority**: The detail page is where an employee decides whether to adopt an artifact and gets the exact command to install it (the APM-compatible distribution value). It depends on indexed data (US1) and complements the listing (US2), but the listing already delivers discovery value on its own, so detail is the third slice.

**Independent Test**: Open a known indexed artifact's detail page and confirm it shows the artifact's metadata, a readable README, the version(s), and a correct, copyable install command; confirm a request for a non-existent artifact shows a not-found state rather than an error.

**Acceptance Scenarios**:

1. **Given** an indexed artifact, **When** an employee opens its detail page, **Then** the page shows its identity, type, name, description, owner, tags, visibility, and lifecycle status.
2. **Given** an indexed artifact with a README, **When** the detail page renders, **Then** the README is shown in a readable form.
3. **Given** an indexed artifact, **When** the detail page renders, **Then** the version(s) known to the catalog and a correct install command are shown, and the install command can be copied.
4. **Given** an artifact id that is not in the catalog, **When** its detail page is requested, **Then** a not-found state is shown (not a broken page).

---

### Edge Cases

- **Empty catalog / no indexing yet**: Before any indexing has run, the catalog listing shows an intentional empty state rather than an error.
- **Invalid manifest during indexing**: A malformed or schema-invalid manifest is skipped and reported; it does not abort the whole indexing run.
- **Duplicate artifact IDs in the repo**: Two artifacts declaring the same ID are detected and reported as a conflict during indexing rather than silently overwriting.
- **Artifact removed from repo**: A previously indexed artifact that no longer exists in the repo is no longer shown as active.
- **Missing README or optional fields**: An artifact with no README (or no tags/install block) still indexes and displays, with the missing parts handled gracefully.
- **Filter with no matches**: Combining filters that match nothing shows an empty state, not an error.
- **Large README / long lists**: Long README content and long listings render without breaking layout.

## Requirements *(mandatory)*

### Functional Requirements

#### Indexing (User Story 1)

- **FR-001**: The system MUST provide an on-demand, maintainer-run CLI/script command that indexes artifacts into the catalog from a local checkout of the `ai-artifacts` repository located at a configured filesystem path (no automated triggers and no remote GitHub fetching this phase). The indexing logic MUST be factored so a later in-app or remote trigger can reuse it.
- **FR-002**: For each artifact, the system MUST validate the manifest against the artifact schema and index only valid artifacts; invalid ones MUST be skipped and reported.
- **FR-003**: The system MUST record, per artifact, the indexed technical metadata: stable artifact ID, type, name, description, current version (from the manifest, treated as latest), source (provider/repository/path), install command, and a README snapshot.
- **FR-004**: The catalog record MUST be keyed by the stable artifact ID (independent of repository/path), so re-indexing updates the same record in place without duplicates.
- **FR-005**: Re-running indexing MUST update changed artifacts, add new ones, and stop presenting artifacts that have been removed from the repository, and MUST refresh a last-indexed timestamp.
- **FR-006**: The system MUST detect and report duplicate artifact IDs encountered during indexing rather than silently overwriting.
- **FR-007**: The system MUST NOT store any artifact's executable content/body; only metadata about the artifact (manifest, README snapshot, versions, install command, source) is stored.
- **FR-008**: The system MUST derive the install command from the manifest's install reference (e.g., APM package) and MUST NOT perform or reimplement installation.

#### Browse & filter (User Story 2)

- **FR-009**: The system MUST present a listing of all active (indexed, present-in-repo) artifacts to authenticated employees, showing at least name, type, and description per artifact.
- **FR-010**: Users MUST be able to filter the listing by artifact type.
- **FR-011**: Users MUST be able to filter the listing by one or more tags.
- **FR-012**: Users MUST be able to filter the listing by category, where a category is a grouping derived from the artifact `type` (no separate taxonomy this phase).
- **FR-013**: The system MUST support combining filters, showing only artifacts matching all active filters.
- **FR-014**: The listing MUST show an intentional empty state (not an error) when no artifacts exist or none match the active filters.
- **FR-015**: All catalog access MUST remain restricted to authenticated employees per the Phase 1 access rules.

#### Artifact detail (User Story 3)

- **FR-016**: The system MUST provide a detail view for a single artifact showing its identity, type, name, description, owner, tags, visibility, and lifecycle status.
- **FR-017**: The detail view MUST render the artifact's README snapshot in a readable form when present.
- **FR-018**: The detail view MUST show the current version and a correct, copyable install command.
- **FR-019**: Requesting the detail view for an unknown artifact ID MUST show a not-found state (not a broken page).

#### Cross-cutting

- **FR-020**: All catalog user interface MUST be built with the mandated design system (consistent with the constitution).
- **FR-021**: The catalog MUST remain fully rebuildable from the `ai-artifacts` repository by re-running indexing (Git remains the source of truth).
- **FR-022**: This phase MUST NOT include automated discovery triggers, review/approval or other governance workflows, or semantic search; these are deferred to later phases.

### Key Entities *(include if feature involves data)*

- **Artifact (catalog record)**: The indexed technical metadata for one artifact, keyed by stable artifact ID. Attributes: artifactId, type, name, description, current version, source (provider, repository, path), install command, README snapshot, tags, visibility, lifecycle status, last-indexed timestamp. Holds metadata only — never the artifact's executable body. (This is the technical-metadata collection; governance metadata is a separate concern deferred to Phase 3.)
- **Category**: A grouping derived from the artifact `type` (skill/prompt/workflow/MCP/template/policy/playbook), used as a browse/filter facet alongside tags. No separate taxonomy or per-artifact category assignment this phase.
- **Tag**: A free-form keyword carried on an artifact's manifest, used as a browse/filter facet.
- **Indexing run**: A single on-demand execution that reconciles the catalog with the repository (add/update/deactivate), producing a report of indexed, skipped (invalid), and conflicting artifacts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After running indexing against a repository of N valid artifacts, the catalog shows exactly N active artifacts, each with correct identity, type, name, version, source, and install command.
- **SC-002**: Re-running indexing after editing, adding, and removing artifacts results in the catalog matching the repository exactly, with zero duplicate records.
- **SC-003**: 100% of manifests that fail schema validation are skipped and reported, and do not prevent valid artifacts from being indexed.
- **SC-004**: An employee can locate a specific artifact by combining a type and a tag filter and reach its detail page in under 30 seconds.
- **SC-005**: For any indexed artifact, the detail page displays a copyable install command that matches the artifact's manifest install reference in 100% of cases.
- **SC-006**: Inspecting stored catalog records reveals zero artifact executable bodies — only metadata (verifiable by inspection).
- **SC-007**: Filtering by type, tag, or category returns exactly the set of artifacts carrying that attribute (no missing or extra results) for all test cases.
- **SC-008**: Unauthenticated access to any catalog page is redirected to sign-in in 100% of attempts.

## Assumptions

- **Builds on Phase 1**: The authenticated shell, employee-only access, and the `artifact.yaml` schema (`@kihub/artifact-schema`) from Phase 1 are in place and reused. The Phase 1 empty catalog shell becomes the entry point to the listing.
- **Data ownership**: Only indexed technical metadata is stored (the Artifact/technical-metadata collection). Governance metadata (approvals, reviews, owners-as-governance, risk) is explicitly deferred to Phase 3. README snapshot is treated as indexed metadata about the artifact, not the artifact's executable content (consistent with the constitution's data-ownership boundary).
- **Indexing trigger**: "On demand" means a maintainer-run CLI/script command — not a scheduled job, webhook, GitHub Action, or in-app action. The indexing core is factored for reuse by a later trigger.
- **Source of artifacts**: Indexing reads a local checkout of the sibling `ai-artifacts` repository at a configured filesystem path (Git remains the source of truth); remote GitHub fetching is deferred to Phase 4. The catalog is always rebuildable by re-indexing.
- **Categories**: Categories are groupings derived from artifact `type`; there is no separate taxonomy or manifest change this phase. A curated category facet may be layered on later without changing the model.
- **Versions**: The catalog stores and shows the single current manifest version (treated as latest); multi-version history tracking is deferred.
- **Search**: Only attribute filtering (type/tags/category) is in scope. Free-text/full-text and semantic search are out of scope this phase.
- **Access tier**: All authenticated employees (baseline reader) can browse and view; no role-gated catalog actions exist yet (governance/roles are Phase 3).
