<!--
Sync Impact Report
Version change: (template) → 1.0.0 → 1.1.0
Modified principles: N/A
Added sections:
  - Core Principles (7 principles)
  - Technology & Architecture Constraints
  - Security, Governance & Compliance
  - Development Workflow & Quality Gates
  - Governance
Amendments:
  - 1.1.0 (2026-07-02): Added mandatory Design System constraint (Digdir Designsystemet)
    under Technology & Architecture Constraints. MINOR — new mandated constraint, non-breaking.
Removed sections: none
Templates requiring updates:
  ✅ .specify/templates/plan-template.md (Constitution Check references generic gates — compatible)
  ✅ .specify/templates/spec-template.md (no mandatory-section conflicts)
  ✅ .specify/templates/tasks-template.md (task categories compatible)
Follow-up TODOs: none
-->

# KI Hub Constitution

KI Hub is an internal AI enablement and governance platform for discovering, managing,
reviewing, and distributing AI-related artifacts (skills, prompts, workflows, MCP servers,
templates, policies, playbooks). It is a catalog and governance layer on top of Git-based
artifacts — not a store for the artifacts themselves.

## Core Principles

### I. Git is the Source of Truth (NON-NEGOTIABLE)

KI Hub MUST NOT store actual artifact content (skill bodies, prompt text, workflow
definitions, MCP server code) inside the web application or its database. Git repositories
own artifact content. KI Hub indexes, enriches, reviews, and exposes that content but never
becomes its canonical home. Any feature that would require KI Hub to be the primary store of
artifact content is out of scope and MUST be rejected at design time.

Rationale: Keeping content in Git preserves versioning, review history, and tooling
compatibility (APM, CI) while letting KI Hub focus on enterprise context.

### II. Payload Owns Enterprise Context, Not Content

Payload CMS MUST store only the enterprise metadata *around* artifacts: indexed technical
metadata (manifest, readme snapshot, versions, install command) and governance metadata
(approvals, owners, review status, risk level, visibility, lifecycle state, usage). The
dividing line is explicit and enforced in every collection design:

```
Git owns the artifact.        Payload owns the enterprise context.
```

Rationale: A clean data-ownership boundary prevents drift and duplication, and keeps the
catalog rebuildable from Git at any time.

### III. Everything is an Artifact

All asset types — skill, prompt pack, workflow, MCP server, template, policy, playbook,
evaluation dataset, agent definition — MUST be modeled as a single generic `Artifact`
concept differentiated by a `type` field. Building separate subsystems per asset type is
prohibited. New asset types are added as new `type` values, not new collections or services.

Rationale: A unified model keeps the platform future-proof and avoids combinatorial
complexity as asset types grow.

### IV. Stable Artifact Identity

Artifact identity MUST be based on a stable artifact ID (e.g. `digdir.security-review`),
never on repository URL or filesystem path. Governance history, approvals, usage data, and
internal links MUST key off the artifact ID. An artifact MUST be able to move between
repositories without breaking any KI Hub state.

Rationale: Physical repository structure will change; enterprise governance history must not.

### V. Git-Centric, APM-Compatible Distribution

KI Hub MUST NOT reimplement installation. APM (or equivalent) is the installation mechanism;
KI Hub surfaces install commands and dependency blocks and makes packages discoverable and
governable. The separation of concerns is fixed:

```
APM = installation   |   GitHub = artifact source   |   KI Hub = catalog, governance, discovery, approvals
```

Rationale: Interoperating with existing tooling beats replacing it and speeds adoption.

### VI. Governance is the Core Value

KI Hub's differentiating value is structured governance: lifecycle states (Draft,
Experimental, In Review, Approved, Recommended, Deprecated, Archived), typed reviews
(security, GDPR/privacy, technical, accessibility, responsible AI, operational), owners,
risk levels, and visibility rules. Every catalog feature MUST reinforce, not bypass, the
governance model.

Rationale: Discovery without governance is just a file browser; governance is why KI Hub
exists.

### VII. Start Simple, Design for Growth

Ship the simplest thing that satisfies current phase requirements while keeping seams for
known future needs: one `ai-artifacts` monorepo (splittable later via stable IDs),
PostgreSQL full-text search first (semantic search / Qdrant later), on-demand discovery
first (webhooks / scheduled scans later). Speculative complexity MUST be justified against a
concrete near-term phase; otherwise defer it (YAGNI).

Rationale: Momentum comes from shipping phases; the identity and artifact-model principles
above preserve the ability to grow without rewrites.

## Technology & Architecture Constraints

- **Stack**: Next.js (App Router) + Payload CMS in a single `apps/web` application, backed by
  PostgreSQL and Azure Blob Storage. Shared logic lives in `packages/` (e.g.
  `artifact-schema`, `discovery-core`, `github-client`, `apm-utils`, `ui`).
- **Design System (MANDATORY)**: All user-facing UI MUST be built with Digdir's Designsystemet
  (https://github.com/digdir/designsystemet) — its React components and design tokens/theme.
  Custom UI components are permitted only to fill genuine gaps the design system does not cover,
  MUST reuse its tokens (color, spacing, typography), and MUST NOT restyle or fork its primitives.
  This applies from the first UI (the Phase 1 catalog shell) onward.
- **Repositories**: Two-repo model — `kihub` (this platform) and `ai-artifacts` (content).
  The platform repo MUST contain zero real artifacts.
- **Discovery Service**: Scans artifact repositories, finds `artifact.yaml` manifests,
  validates schema, extracts metadata, reads README, checks versions/install config, and
  updates Payload. It runs on demand initially; scheduled/webhook/GitHub-Action triggers are
  additive.
- **Manifest Schema**: The `artifact.yaml` schema (id, type, name, version, description,
  owner, source, install, tags, visibility, lifecycle) is a versioned contract shared between
  `ai-artifacts` and KI Hub; changes require a schema version bump.
- **Deployment**: Azure Container Apps / App Service → Next.js + Payload → Azure PostgreSQL →
  Azure Blob Storage. Terraform is introduced only when stable dev/test/prod environments are
  needed.

## Security, Governance & Compliance

- **Authentication**: Azure Entra ID from day one. Only employees may log in, enforced via
  tenant restrictions and group-based access.
- **Authorization**: Role model — Reader, Contributor, Reviewer, Approver, Admin — mapped from
  Entra groups. Governance actions (approve/reject, review decisions, lifecycle transitions)
  MUST be gated by role.
- **Reviews**: Typed reviews carry reviewer, status, date, comments, decision, required
  changes, risk level, and expiry. Approval state MUST be auditable.
- **Data ownership**: Per Principles I & II, no artifact content is persisted in KI Hub;
  only metadata and governance records.

## Development Workflow & Quality Gates

- **Spec-driven**: Features follow the spec-kit flow — constitution → specify → clarify →
  plan → tasks → analyze → implement. Plans MUST include a Constitution Check that verifies
  the seven principles above.
- **Contract-first**: The artifact manifest schema and Payload collection shapes are
  contracts; changes to them require explicit versioning and updates to dependent packages.
- **Testing**: Discovery/validation logic, manifest schema validation, and governance
  state-transition rules MUST have automated tests. Integration tests cover manifest
  parsing and Payload write paths.
- **Reviews**: All PRs MUST verify constitution compliance; any added complexity MUST be
  justified against a concrete phase requirement.

## Governance

This constitution supersedes other practices where they conflict. Amendments require a
documented change (what and why), an approval, and a version bump per the policy below, plus
propagation to dependent spec-kit templates and any runtime guidance (`CLAUDE.md`, docs).

Versioning policy (semantic):
- **MAJOR**: Backward-incompatible governance/principle removal or redefinition.
- **MINOR**: New principle or materially expanded section.
- **PATCH**: Clarifications, wording, non-semantic refinements.

Compliance: Plans and reviews MUST check against these principles. Use `CLAUDE.md` and
`.specify/` templates for runtime development guidance.

**Version**: 1.1.0 | **Ratified**: 2026-07-02 | **Last Amended**: 2026-07-02
