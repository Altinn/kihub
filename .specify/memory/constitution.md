<!--
Sync Impact Report
Version change: 1.1.0 → 2.0.0
Bump rationale: MAJOR. Redefines the platform's identity and scope (from a narrow AI-artifact
  catalog to an internal employee portal with multiple modules) and REDEFINES an existing mandatory
  constraint (Design System now applies to the employee-facing app only; the Payload admin
  back-office is exempt). Existing AI-artifact principles are preserved but re-scoped. Per the
  versioning policy, a principle/constraint redefinition ⇒ MAJOR.
Modified principles:
  - I. "Git is the Source of Truth" → "Git is the Source of Truth for AI Artifacts" (scoped to AI
    artifacts; native platform content explicitly excluded)
  - II. "Payload Owns Enterprise Context, Not Content" → "Payload Owns Enterprise Context and Native
    Content" (now also the store for first-class News/Events content)
  - III. "Everything is an Artifact" → "Every AI Asset is an Artifact" (scoped to AI asset types;
    News/Events are NOT artifacts)
  - VI. "Governance is the Core Value" → "Governance is the Core Value of the Registry" (reframed as
    the Registry module's differentiator; review/governance actions move to the admin back-office)
Added sections:
  - Principle VIII — Two Surfaces: Employee App and Editor Back-Office
  - "Product Modules" subsection under the platform overview
Removed sections: none
Templates requiring updates:
  ✅ .specify/templates/plan-template.md (Constitution Check references gates generically — compatible)
  ✅ .specify/templates/spec-template.md (no mandatory-section conflict)
  ✅ .specify/templates/tasks-template.md (task categories compatible)
  ⚠ README.md (still describes KI Hub as an AI-artifact catalog; update when the portal reframing
    reaches user-facing docs — not blocking)
  ⚠ CLAUDE.md (managed SPECKIT block points at the active feature; refresh when the next module
    phase starts)
Follow-up TODOs: none
-->

# KI Hub Constitution

KI Hub is an internal employee portal for Digdir. It brings together, in one place for all
employees, an **AI-tool Registry** (a catalog and governance layer over Git-based AI artifacts),
**News**, and a **Calendar** of events. Its differentiating value in the AI space is structured
governance of AI tools; its everyday value is being the internal home employees actually visit.

KI Hub is delivered as **two surfaces**: an employee-facing web app for everyone, and a Payload CMS
admin back-office for a small set of editors and admins (see Principle VIII).

## Product Modules

- **Registry** — the AI-artifact catalog: discovery, indexed technical metadata, governance
  (lifecycle, typed reviews, approvals, audit), and search. A catalog/governance layer on top of
  Git-based artifacts; it never becomes the store of artifact content (Principle I).
- **News** — internal articles authored in KI Hub. First-class native platform content (Principle
  II); not an "artifact" and not sourced from Git.
- **Calendar / Events** — internal events authored in KI Hub. First-class native platform content
  (Principle II); not an "artifact".

New modules are added as new Payload collections + employee-facing pages + admin authoring, reusing
the shared foundation (auth, roles, Designsystemet, the two-surface split) — not as parallel apps.

## Core Principles

### I. Git is the Source of Truth for AI Artifacts (NON-NEGOTIABLE)

For the **Registry** module, KI Hub MUST NOT store actual AI-artifact content (skill bodies, prompt
text, workflow definitions, MCP server code) inside the web application or its database. Git
repositories own artifact content. KI Hub indexes, enriches, reviews, and exposes that content but
never becomes its canonical home. Any feature that would require KI Hub to be the primary store of
AI-artifact content is out of scope and MUST be rejected at design time.

This principle governs **AI artifacts specifically**. It does NOT apply to native platform content
(News, Events), which has no Git source and is authored in KI Hub — see Principle II.

Rationale: Keeping artifact content in Git preserves versioning, review history, and tooling
compatibility (APM, CI) while letting KI Hub focus on enterprise context.

### II. Payload Owns Enterprise Context and Native Content

Payload CMS is KI Hub's data layer. It stores two kinds of data:

1. **Enterprise metadata around AI artifacts** — indexed technical metadata (manifest, readme
   snapshot, versions, install command) and governance metadata (approvals, owners, review status,
   risk level, visibility, lifecycle state, usage). It MUST NOT store AI-artifact bodies (Principle
   I). The dividing line is explicit and enforced in every artifact-related collection design:

   ```
   Git owns the AI artifact.     Payload owns the enterprise context around it.
   ```

2. **Native platform content** — News articles and calendar Events are authored in KI Hub, have no
   external source of truth, and are correctly and fully owned by Payload (content and all).

Rationale: A clean data-ownership boundary prevents drift and keeps the Registry rebuildable from
Git, while native content (news/events) legitimately lives in Payload as its home.

### III. Every AI Asset is an Artifact

Within the **Registry**, all AI asset types — skill, prompt pack, workflow, MCP server, template,
policy, playbook, evaluation dataset, agent definition — MUST be modeled as a single generic
`Artifact` concept differentiated by a `type` field. Building separate subsystems per AI asset type
is prohibited; new AI asset types are added as new `type` values, not new collections or services.

This principle is scoped to **AI assets**. News and Events are NOT artifacts and MUST NOT be forced
into the artifact model — they are their own collections/entities.

Rationale: A unified model keeps the Registry future-proof and avoids combinatorial complexity as AI
asset types grow, without over-generalizing unrelated content types.

### IV. Stable Artifact Identity

Artifact identity MUST be based on a stable artifact ID (e.g. `digdir.security-review`), never on
repository URL or filesystem path. Governance history, approvals, usage data, and internal links
MUST key off the artifact ID. An artifact MUST be able to move between repositories without breaking
any KI Hub state.

Rationale: Physical repository structure will change; enterprise governance history must not.

### V. Git-Centric, APM-Compatible Distribution

KI Hub MUST NOT reimplement installation. APM (or equivalent) is the installation mechanism; KI Hub
surfaces install commands and dependency blocks and makes packages discoverable and governable. The
separation of concerns is fixed:

```
APM = installation   |   GitHub = artifact source   |   KI Hub = catalog, governance, discovery, approvals
```

Rationale: Interoperating with existing tooling beats replacing it and speeds adoption.

### VI. Governance is the Core Value of the Registry

The Registry's differentiating value is structured governance: lifecycle states (Draft,
Experimental, In Review, Approved, Recommended, Deprecated, Archived), typed reviews (security,
GDPR/privacy, technical, accessibility, responsible AI, operational), owners, risk levels, and
visibility rules. Every Registry feature MUST reinforce, not bypass, the governance model.

Governance and review **actions** (recording reviews, approvals, lifecycle transitions) are
performed primarily in the editor back-office (Principle VIII); the employee-facing app MAY surface
governance **state** read-only. Wherever governance is exercised, role gating MUST be enforced
server-side, not only in the UI.

Rationale: Discovery without governance is just a file browser; governance is why the Registry
exists.

### VII. Start Simple, Design for Growth

Ship the simplest thing that satisfies current phase requirements while keeping seams for known
future needs: one `ai-artifacts` monorepo (splittable later via stable IDs), PostgreSQL full-text
search first (semantic search / Qdrant later), on-demand discovery first (webhooks / scheduled scans
later), and new portal modules added incrementally on the shared foundation. Speculative complexity
MUST be justified against a concrete near-term phase; otherwise defer it (YAGNI).

Rationale: Momentum comes from shipping phases; the identity, artifact-model, and two-surface
principles preserve the ability to grow without rewrites.

### VIII. Two Surfaces: Employee App and Editor Back-Office

KI Hub MUST be built as exactly two surfaces with distinct audiences:

1. **Employee-facing web app** — for ALL employees. Browsing and reading News, the Calendar, and the
   Registry, plus light interaction (search, filters, copy install commands, view governance state).
   This surface MUST be built with Digdir Designsystemet (see Technology & Architecture Constraints).

2. **Editor back-office (Payload admin)** — for a small set of editors and admins. Authoring News,
   creating calendar Events, performing tool reviews/governance, and administering the platform. It
   is the Payload CMS admin UI and is EXEMPT from the Designsystemet requirement — it is a vendor
   editor tool for an internal editorial audience, and its off-brand look is acceptable.

Both surfaces share one auth model (Entra), one role model, and one Payload data layer. Editorial
and administrative actions belong in the back-office; the employee app MUST NOT be extended into a
general-purpose admin. Role gating MUST be enforced server-side on both surfaces.

Rationale: Separating a branded, read-first employee experience from a powerful editor back-office
lets each optimize for its audience, and leverages Payload's admin instead of rebuilding CRUD UI.

## Technology & Architecture Constraints

- **Stack**: Next.js (App Router) + Payload CMS in a single `apps/web` application, backed by
  PostgreSQL and Azure Blob Storage. The employee-facing app and the Payload admin back-office are
  the two surfaces of this one application. Shared logic lives in `packages/` (e.g.
  `artifact-schema`, `discovery-core`, `github-client`, `governance-core`).
- **Design System (MANDATORY for the employee-facing app)**: All **employee-facing** UI MUST be
  built with Digdir's Designsystemet (https://github.com/digdir/designsystemet) — its React
  components and design tokens/theme. Custom components are permitted only to fill genuine gaps the
  design system does not cover, MUST reuse its tokens, and MUST NOT restyle or fork its primitives.
  The **Payload admin back-office is explicitly EXEMPT** from this requirement (Principle VIII); it
  uses Payload's own admin UI.
- **Repositories**: Two-repo model — `kihub` (this platform) and `ai-artifacts` (AI-artifact
  content). The platform repo MUST contain zero real AI artifacts. (News/Events content lives in
  Payload, not in a Git content repo.)
- **Discovery Service** (Registry): Scans AI-artifact repositories, finds `artifact.yaml` manifests,
  validates schema, extracts metadata, reads README, checks versions/install config, and updates
  Payload. Runs on demand, and via scheduled/webhook/GitHub-Action triggers.
- **Manifest Schema** (Registry): The `artifact.yaml` schema (id, type, name, version, description,
  owner, source, install, tags, visibility, lifecycle) is a versioned contract shared between
  `ai-artifacts` and KI Hub; changes require a schema version bump.
- **Deployment**: Azure Container Apps / App Service → Next.js + Payload → Azure PostgreSQL →
  Azure Blob Storage. Terraform is introduced only when stable dev/test/prod environments are
  needed.

## Security, Governance & Compliance

- **Authentication**: Azure Entra ID from day one, for both surfaces. Only employees may sign in,
  enforced via tenant restrictions and group-based access.
- **Authorization**: Role model — Reader, Contributor, Reviewer, Approver, Admin — mapped from Entra
  groups. Access to the editor back-office and all governance/editorial actions MUST be gated by
  role and enforced server-side (including through Payload collection/field access control).
- **Reviews** (Registry): Typed reviews carry reviewer, status, date, comments, decision, required
  changes, risk level, and expiry. Approval state MUST be auditable.
- **Data ownership**: Per Principles I & II, no AI-artifact content is persisted in KI Hub (only
  metadata and governance records); News/Events content is native Payload-owned data.

## Development Workflow & Quality Gates

- **Spec-driven**: Features follow the spec-kit flow — constitution → specify → clarify → plan →
  tasks → analyze → implement. Plans MUST include a Constitution Check that verifies the principles
  above.
- **Contract-first**: The artifact manifest schema and Payload collection shapes are contracts;
  changes to them require explicit versioning and updates to dependent packages.
- **Testing**: Discovery/validation logic, manifest schema validation, and governance
  state-transition rules MUST have automated tests. Integration tests cover manifest parsing and
  Payload write paths. New modules (News, Events) MUST test their access control and any
  state/validation rules.
- **Reviews**: All PRs MUST verify constitution compliance; any added complexity MUST be justified
  against a concrete phase requirement.

## Governance

This constitution supersedes other practices where they conflict. Amendments require a documented
change (what and why), an approval, and a version bump per the policy below, plus propagation to
dependent spec-kit templates and any runtime guidance (`CLAUDE.md`, docs).

Versioning policy (semantic):
- **MAJOR**: Backward-incompatible governance/principle removal or redefinition.
- **MINOR**: New principle or materially expanded section.
- **PATCH**: Clarifications, wording, non-semantic refinements.

Compliance: Plans and reviews MUST check against these principles. Use `CLAUDE.md` and `.specify/`
templates for runtime development guidance.

**Version**: 2.0.0 | **Ratified**: 2026-07-02 | **Last Amended**: 2026-07-14
