# Feature Specification: Phase 1 Foundation

**Feature Branch**: `001-phase1-foundation`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "Phase 1 Foundation for KI Hub: authenticated internal users (Azure Entra ID, employees only) can sign in and see an empty-but-working catalog shell; define the artifact manifest schema (artifact.yaml) and seed 2–3 example artifacts in a sibling ai-artifacts repo. No discovery automation or catalog browsing yet — just the foundation and schema."

## Clarifications

### Session 2026-07-02

- Q: What should Phase 1 deliver as the artifact manifest schema itself? → A: A formal machine-readable schema file (validatable) plus human-readable field documentation.
- Q: What is the canonical rule for an artifact's stable ID? → A: Reverse-DNS-style `org.slug` (lowercase, globally unique, e.g., `digdir.security-review`), independent of repository/path.
- Q: How is "employee" determined for access? → A: Any member of the organization's own Entra ID home tenant, excluding guest/external (B2B) accounts.
- Q: What does "done" mean for the Phase 1 working shell — where must it run? → A: Runs locally with working Entra ID sign-in; Azure hosting/deployment is deferred to a later step.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Employee signs in and reaches the catalog shell (Priority: P1)

An employee opens KI Hub. If they are not already signed in, they are sent to the organization's single sign-on. After authenticating with their work identity, they land on a working KI Hub home/catalog shell — a real, navigable application that is clearly authenticated (they can see who they are signed in as and can sign out) but currently shows no artifacts. People who are not employees of the organization cannot get past sign-in.

**Why this priority**: Access control and a running, authenticated application are the bedrock everything else sits on. Without a trustworthy "only employees, signed in" boundary and a live shell, no catalog, schema, or governance work has anywhere to live. This slice alone proves the platform is stood up, deployable, and secured.

**Independent Test**: Attempt to open KI Hub while unauthenticated (redirected to sign-in and blocked), sign in as an employee (reaches the catalog shell, identity and sign-out visible), and confirm a non-employee identity is refused. Delivers a demonstrably secured, running application.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor, **When** they open any KI Hub page, **Then** they are redirected to the organization's sign-in and cannot view application content until authenticated.
2. **Given** an employee with a valid work identity, **When** they complete sign-in, **Then** they are returned to KI Hub and see the catalog shell with their signed-in identity displayed.
3. **Given** a signed-in employee, **When** they choose to sign out, **Then** their session ends and reopening a KI Hub page requires signing in again.
4. **Given** an identity that is not an employee of the organization, **When** they attempt to sign in, **Then** access is denied and they do not reach application content.
5. **Given** a signed-in employee on the catalog shell, **When** no artifacts exist yet, **Then** the shell renders successfully and communicates that the catalog is empty rather than showing an error or a broken page.

---

### User Story 2 - Standard artifact manifest schema is defined (Priority: P2)

A platform maintainer needs a single, agreed way to describe any AI artifact — skill, prompt pack, workflow, MCP server, template, policy, or playbook — so that every artifact carries consistent, machine-readable metadata and a stable identity. The manifest (`artifact.yaml`) format is defined and documented: which fields exist, which are required, what they mean, and the rule that an artifact's identity is its stable artifact ID rather than its repository location.

**Why this priority**: The manifest is the contract that all later phases (discovery, catalog, governance) depend on. Defining it early — and getting identity stability right — prevents rework and protects governance history when artifacts later move between repositories. It has value independent of the UI: it can be reviewed and adopted by content authors before any catalog exists.

**Independent Test**: A reviewer can read the schema documentation, hand-write an `artifact.yaml` for a hypothetical artifact, and unambiguously determine whether it is valid — which fields are mandatory, allowed artifact types, and how identity is expressed — without consulting anyone.

**Acceptance Scenarios**:

1. **Given** the schema definition, **When** a content author reads it, **Then** they can identify every field, whether it is required or optional, and its permitted values (e.g., the allowed set of artifact types and lifecycle statuses).
2. **Given** a candidate `artifact.yaml`, **When** it is checked against the schema, **Then** a clear valid/invalid determination can be made and missing required fields are identifiable.
3. **Given** two artifacts, **When** they are compared, **Then** each has a unique, stable artifact ID that does not depend on repository or path, so identity survives a future move between repositories.

---

### User Story 3 - Example artifacts seeded in the ai-artifacts repository (Priority: P3)

A platform maintainer creates a separate `ai-artifacts` repository and seeds it with 2–3 real, well-formed example artifacts (each in its own folder with `artifact.yaml`, `README.md`, and any examples/assets), covering more than one artifact type. These serve as reference implementations of the schema and as the first content the platform will later index — while keeping the KI Hub platform repository free of any actual artifact content.

**Why this priority**: Examples prove the schema is expressible in practice and give later phases (discovery, catalog) something real to work against. They also establish the platform/content separation from day one. This depends on the schema (P2) existing but not on the UI, so it is the lowest of the three foundational slices.

**Independent Test**: Clone the `ai-artifacts` repository, confirm 2–3 artifacts of differing types each conform to the schema, and confirm the KI Hub platform repository contains no artifact content of its own.

**Acceptance Scenarios**:

1. **Given** the `ai-artifacts` repository, **When** its contents are inspected, **Then** it contains 2–3 example artifacts, each in its own folder with a valid `artifact.yaml` and a `README.md`.
2. **Given** the seeded examples, **When** their types are compared, **Then** at least two different artifact types are represented.
3. **Given** the KI Hub platform repository, **When** it is inspected, **Then** it contains no actual artifact content (no skill/prompt/workflow/MCP bodies), preserving the platform-versus-content separation.

---

### Edge Cases

- **Expired or interrupted session**: A signed-in employee whose session has expired is returned to sign-in on their next action rather than seeing stale or partial content.
- **Sign-in cancelled or failed**: A user who abandons or fails authentication is returned to a clear state (not a broken page) and can retry.
- **Valid identity, not an employee**: A tenant guest or external identity that authenticates but is not an employee is refused access to application content.
- **Malformed manifest**: An `artifact.yaml` that is missing required fields or uses an unknown artifact type is unambiguously identifiable as invalid against the schema.
- **Duplicate artifact IDs**: Two artifacts declaring the same artifact ID are recognizable as an identity conflict.
- **Empty catalog**: With zero artifacts present, the catalog shell still renders correctly and communicates emptiness rather than failing.

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & access (User Story 1)

- **FR-001**: The system MUST require authentication via the organization's single sign-on before any application content is accessible; unauthenticated requests MUST be redirected to sign-in.
- **FR-002**: The system MUST restrict access to employees of the organization only. "Employee" is defined as a member of the organization's own Entra ID home tenant; guest/external (B2B) accounts and identities from other tenants MUST be denied access to application content.
- **FR-003**: After successful sign-in, the system MUST return the user to a working KI Hub catalog shell and MUST display the identity the user is signed in as.
- **FR-004**: The system MUST allow a signed-in user to sign out, ending their session such that subsequent access requires signing in again.
- **FR-005**: The catalog shell MUST render successfully when no artifacts exist, clearly communicating an empty state rather than an error or broken layout.
- **FR-006**: Every authenticated employee MUST, in this phase, be treated as a baseline read-level user; no additional privileged roles are granted or required to reach the catalog shell. (Fine-grained role mapping is deferred to a later phase.)

#### Artifact manifest schema (User Story 2)

- **FR-007**: The system MUST define the manifest format named `artifact.yaml` (describing a single artifact) as BOTH a formal machine-readable schema file (against which a manifest can be automatically validated) AND human-readable field documentation.
- **FR-008**: The manifest schema MUST specify, for each field, its name, meaning, and whether it is required or optional.
- **FR-009**: The manifest MUST support representing all foundational artifact types as a single generic artifact differentiated by a `type` field, with an enumerated set of allowed types (skill, prompt pack, workflow, MCP server, template, policy, playbook).
- **FR-010**: The manifest MUST carry a stable artifact identity (artifact ID) that is independent of repository location and path, so an artifact can move between repositories without breaking its identity. The ID MUST follow a reverse-DNS-style `org.slug` format (lowercase, globally unique, e.g., `digdir.security-review`), and the schema MUST enforce this format.
- **FR-011**: The manifest MUST be able to express, at minimum: artifact ID, type, human-readable name, version, description, owner (team and contact), source location (provider/repository/path), installation reference, tags, visibility, and lifecycle status.
- **FR-012**: The schema MUST enumerate the allowed lifecycle statuses (e.g., draft, experimental, in review, approved, recommended, deprecated, archived) and allowed visibility values.
- **FR-013**: A candidate manifest MUST be automatically checkable against the machine-readable schema so that valid versus invalid manifests — including missing required fields, malformed artifact IDs, and unknown type values — can be unambiguously distinguished. (Wiring this validation into CI/PR automation or discovery is deferred to a later phase.)

#### Example artifacts & repository separation (User Story 3)

- **FR-014**: A separate content repository (`ai-artifacts`) MUST exist, organized so that each artifact lives in its own folder containing at least an `artifact.yaml` and a `README.md`.
- **FR-015**: The content repository MUST be seeded with 2–3 example artifacts that each conform to the manifest schema.
- **FR-016**: The seeded examples MUST represent at least two different artifact types.
- **FR-017**: The KI Hub platform repository MUST NOT contain actual artifact content (skill/prompt/workflow/MCP bodies); artifact content lives only in the content repository.

#### Out of scope (this phase)

- **FR-018**: The system MUST NOT include automated discovery/scanning of the content repository, catalog browsing/listing, artifact detail pages, or search in this phase; these are explicitly deferred to later phases.
- **FR-019**: For this phase, the application MUST be runnable locally with working Entra ID sign-in end-to-end; deployment to a hosted Azure environment is deferred to a later step and is NOT required for this phase to be considered complete.

### Key Entities *(include if feature involves data)*

- **Artifact**: A generic, package-like unit representing any AI asset (skill, prompt pack, workflow, MCP server, template, policy, playbook). Distinguished by its `type`. Owns a stable artifact ID that is independent of where it is stored. In this phase it exists only as content in the `ai-artifacts` repository described by its manifest — KI Hub does not yet index it.
- **Artifact Manifest (`artifact.yaml`)**: The machine-readable description of one artifact, governed by a formal schema file. Key attributes: artifact ID (reverse-DNS-style `org.slug`), type, name, version, description, owner (team, contact), source (provider, repository, path), install reference, tags, visibility, lifecycle status. It is the contract later phases rely on.
- **Authenticated User (Employee)**: A person authenticated through the organization's single sign-on who is an employee of the organization. In this phase, all authenticated employees have baseline read-level access; richer role mapping is deferred.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of attempts to reach application content without a valid, signed-in employee identity are blocked (redirected to sign-in or denied).
- **SC-002**: An employee can go from opening KI Hub to viewing the authenticated catalog shell in a single sign-in flow, completing sign-in in under 30 seconds under normal conditions.
- **SC-003**: A non-employee identity that authenticates is denied access to application content in 100% of attempts.
- **SC-004**: The catalog shell loads successfully with zero artifacts present and shows an intentional empty state in 100% of loads (no errors or broken layout).
- **SC-005**: A content author unfamiliar with the project can, using only the schema documentation, hand-write a manifest and correctly determine its validity for at least 9 of 10 sample cases.
- **SC-006**: 100% of the seeded example artifacts pass automated validation against the machine-readable manifest schema, and they cover at least two distinct artifact types.
- **SC-007**: The KI Hub platform repository contains zero files of actual artifact content, verifiable by inspection.

## Assumptions

- **Identity provider**: The organization's single sign-on is Azure Entra ID, used from the start. "Employees only" means members of the organization's own home tenant; guest/external (B2B) accounts are excluded. This is a locked project constraint, not a choice to be re-evaluated here.
- **Empty-but-working shell**: "Catalog shell" means a real, deployed, authenticated application home that renders an intentional empty state — not catalog listing, detail, or search UI, which are deferred to Phase 2.
- **Roles in this phase**: Only a baseline read-level access tier is needed; the full role set (Reader/Contributor/Reviewer/Approver/Admin) and Entra-group-to-role mapping are deferred to the governance phase. All employees are effectively Readers now.
- **Manifest source of truth**: Artifact content and manifests live in Git (the `ai-artifacts` repository). KI Hub never becomes the canonical store of artifact content.
- **Schema deliverable**: This phase delivers a formal machine-readable schema file for `artifact.yaml` (plus human-readable documentation) and conforming examples that can be validated against it on demand. Wiring that validation into CI/PR automation and discovery/scanning is deferred to a later phase.
- **Number of examples**: 2–3 example artifacts are seeded; exact count within that range is at the maintainer's discretion so long as at least two types are represented.
- **Repository model**: Two repositories — `kihub` (platform, zero real artifacts) and `ai-artifacts` (content) — as established in the architecture proposal.
- **Data persistence**: A persistent data store is provisioned as part of standing up the application even though no artifact catalog data is written yet in this phase.
- **Deployment scope**: This phase targets a locally-runnable application with working Entra ID sign-in end-to-end. Hosting/deployment to an Azure environment is deferred to a later step and is not part of this phase's Definition of Done.
