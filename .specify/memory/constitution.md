<!--
Sync Impact Report
Version change: 3.2.0 → 4.0.0
Bump rationale: MAJOR. Management decided (2026-10) to move ALL of KI Hub, both native content and
  the Registry's enterprise context, from Payload CMS + PostgreSQL to a headless Umbraco (.NET)
  instance. That REDEFINES the data-layer principle: Principle II no longer names Payload as the
  permanent home. It also changes the back-office surface (Principle VIII) and the stack and
  deployment constraints. These are backward-incompatible redefinitions, so the bump is MAJOR.
  Decisions recorded by Adi Dahl, 2026-10-15:
  - separate Umbraco instance (not shared with ki.norge.no);
  - KI Hub's own Azure Container Apps hosting for now (Altinn's dis-core platform later is
    allowed, not required);
  - the Registry moves too, last;
  - no coordination with other teams required.
  Step 1 (specs/023-content-source-seam, PR Altinn/kihub#160) already introduced the per-module
  content-source switch and the parity harness that the transition rules below rely on.
Modified principles:
  - II. "Payload Owns Enterprise Context and Native Content" → "The CMS Owns Enterprise Context
    and Native Content". It is now CMS-neutral, names Payload as the current CMS and Umbraco as
    the target, and requires exactly one source of truth per module at any time.
  - VII. Start Simple: "PostgreSQL full-text search first" generalised to "the CMS's built-in or
    database full-text search first". The Registry-on-Umbraco spec decides the successor to
    today's PostgreSQL search.
  - VIII. Two Surfaces: the editor back-office is the Payload admin today and the Umbraco
    backoffice as the target. Both are exempt from Designsystemet. "One Payload data layer"
    becomes "one auth model, one role model, one source of truth per module".
  - I, III, IV, V, VI: substance UNCHANGED. Only "Payload" → "the CMS" wording was touched, in
    I's scoping sentence and VI's back-office reference. Umbraco, like Payload, stores only
    enterprise context around AI artifacts, never their bodies.
Added sections:
  - IX. Reversible, Module-by-Module Migration (TRANSITIONAL — lapses when Payload is retired).
    It covers: strangler fig behind the 023 CONTENT_SOURCE_<MODULE> switch; parity goldens;
    reversibility by configuration; CMS-neutral employee app; Registry last; retirement only
    after a safety period.
  - Technology & Architecture Constraints → "Target CMS: Umbraco" block. It covers: separate
    instance; LTS line; headless only; Azure SQL + Azure Blob; Entra backoffice login; uSync owns
    the schema; no content written from startup code; Delivery API key + server-side only;
    non-public media; one replica unless load-balanced; reference implementation
    digdir/ki.norge.no (MIT).
  - Product Modules: a rule that new modules are built on Umbraco once its foundation is live.
Removed sections: none.
Templates requiring updates:
  ✅ .specify/templates/plan-template.md (generic Constitution Check, no Payload references)
  ✅ .specify/templates/spec-template.md (no mandatory-section conflict)
  ✅ .specify/templates/tasks-template.md (task categories compatible)
  ✅ README.md (Status block notes the v4.0.0 migration target; current-state sections stay
    accurate, since Payload is still the live CMS)
  ✅ CLAUDE.md (SPECKIT block points at this amendment)
Follow-up TODOs:
  - The Registry-on-Umbraco spec must decide content nodes vs custom tables per record type, the
    discovery runtime (C# port vs a Node job writing through an API), and the search successor.
  - Principle IX and the Payload clauses in II/VIII lapse via a PATCH/MINOR amendment once Payload
    and PostgreSQL are retired.
-->

# KI Hub Constitution

KI Hub is an internal employee portal for Digdir. It brings together, in one place for all
employees, an **AI-tool Registry** (a catalog and governance layer over Git-based AI artifacts),
**News**, a **Calendar** of events, **Learning** content that teaches employees how to work with
AI tooling, and **Projects** — an editorial list of AI projects underway in Digdir. Its
differentiating value in the AI space is structured governance of AI tools; its everyday value is
being the internal home employees actually visit.

KI Hub is delivered as **two surfaces**: an employee-facing web app for everyone, and an editor
back-office for a small set of editors and admins (see Principle VIII). The back-office is the
Payload CMS admin today and the Umbraco backoffice as KI Hub migrates to Umbraco (Principle IX).

## Product Modules

- **Registry** — the AI-artifact catalog: discovery, indexed technical metadata, governance
  (lifecycle, typed reviews, approvals, audit), and search. A catalog/governance layer on top of
  Git-based artifacts; it never becomes the store of artifact content (Principle I).
- **News** — internal articles authored in KI Hub. First-class native platform content (Principle
  II); not an "artifact" and not sourced from Git.
- **Calendar / Events** — internal events authored in KI Hub. First-class native platform content
  (Principle II); not an "artifact".
- **Learning** — structured internal learning content authored in KI Hub: an editor-curated library
  of categories, subcategories and learning pages that teach employees how to use AI tooling.
  First-class native platform content (Principle II); not an "artifact", and the Registry principles
  (I, III, IV, V, VI) do not apply to it.
- **Projects** — a flat, editor-authored list of AI projects underway in Digdir ("KI Prosjekter i
  Digdir"), each with a title, summary, and rich-text description. First-class native platform
  content (Principle II); not an "artifact" and unrelated to the Registry's `Artifact` model, and
  the Registry principles (I, III, IV, V, VI) do not apply to it.

New modules are added as new CMS content types + employee-facing pages + back-office authoring,
reusing the shared foundation (auth, roles, Designsystemet, the two-surface split, the CMS-neutral
content seam) — not as parallel apps. Once the Umbraco foundation is in production, new modules
MUST be built on Umbraco; adding a new Payload collection after that point requires an explicit
justification in the feature's plan.

## Core Principles

### I. Git is the Source of Truth for AI Artifacts (NON-NEGOTIABLE)

For the **Registry** module, KI Hub MUST NOT store actual AI-artifact content (skill bodies, prompt
text, workflow definitions, MCP server code) inside the web application or its CMS/database. Git
repositories own artifact content. KI Hub indexes, enriches, reviews, and exposes that content but
never becomes its canonical home. Any feature that would require KI Hub to be the primary store of
AI-artifact content is out of scope and MUST be rejected at design time.

This principle governs **AI artifacts specifically**. It does NOT apply to native platform content
(News, Events, Learning, Projects), which has no Git source and is authored in KI Hub — see
Principle II. It holds unchanged whichever CMS is in use (Payload today, Umbraco as the target).

Rationale: Keeping artifact content in Git preserves versioning, review history, and tooling
compatibility (APM, CI) while letting KI Hub focus on enterprise context.

### II. The CMS Owns Enterprise Context and Native Content

KI Hub's CMS is its content and data layer. **Payload CMS** (with PostgreSQL) is the current CMS;
**Umbraco** (with Azure SQL) is the target, and modules move to it one at a time under Principle
IX. The CMS stores two kinds of data:

1. **Enterprise metadata around AI artifacts** — indexed technical metadata (manifest, readme
   snapshot, versions, install command) and governance metadata (approvals, owners, review status,
   risk level, visibility, lifecycle state, usage). It MUST NOT store AI-artifact bodies (Principle
   I). The dividing line is explicit and enforced in every artifact-related data design:

   ```
   Git owns the AI artifact.     The CMS owns the enterprise context around it.
   ```

2. **Native platform content** — News articles, calendar Events, Learning content and Projects are
   authored in KI Hub, have no external source of truth, and are correctly and fully owned by the
   CMS (content and all), including any media assets uploaded for them.

At any moment each module has **exactly one** source of truth — Payload or Umbraco, never both.
Data MUST NOT be written to two CMSs in parallel, and a module's employee pages MUST read only from
the source its configuration names.

Rationale: A clean data-ownership boundary prevents drift and keeps the Registry rebuildable from
Git, while native content legitimately lives in the CMS as its home. One source of truth per
module keeps a two-CMS transition safe.

### III. Every AI Asset is an Artifact

Within the **Registry**, all AI asset types — skill, prompt pack, workflow, MCP server, template,
policy, playbook, evaluation dataset, agent definition — MUST be modeled as a single generic
`Artifact` concept differentiated by a `type` field. Building separate subsystems per AI asset type
is prohibited; new AI asset types are added as new `type` values, not new collections or services.

This principle is scoped to **AI assets**. News, Events, Learning and Projects content are NOT
artifacts and MUST NOT be forced into the artifact model — they are their own collections/entities.

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
server-side, not only in the UI. Moving the Registry to Umbraco MUST preserve every lifecycle
transition rule, review type, and audit guarantee.

Rationale: Discovery without governance is just a file browser; governance is why the Registry
exists.

### VII. Start Simple, Design for Growth

Ship the simplest thing that satisfies current phase requirements while keeping seams for known
future needs: one `ai-artifacts` monorepo (splittable later via stable IDs), the CMS's built-in or
database full-text search first (PostgreSQL today; the Registry-on-Umbraco spec decides its
successor; semantic search later), on-demand discovery first (webhooks / scheduled scans later),
and new portal modules added incrementally on the shared foundation. Speculative complexity MUST be
justified against a concrete near-term phase; otherwise defer it (YAGNI).

Rationale: Momentum comes from shipping phases; the identity, artifact-model, and two-surface
principles preserve the ability to grow without rewrites.

### VIII. Two Surfaces: Employee App and Editor Back-Office

KI Hub MUST be built as exactly two surfaces with distinct audiences:

1. **Employee-facing web app** — for ALL employees, and the ONLY surface that renders employee
   pages. Browsing and reading News, the Calendar, Learning content, Projects, and the Registry,
   plus light interaction (search, filters, copy install commands and code samples, view
   governance state). This surface MUST be built on the Designsystemet foundation with the KI Hub
   theme (see Technology & Architecture Constraints). It reads content through KI Hub's
   CMS-neutral content seam and MUST NOT import a CMS SDK or CMS-generated types in its pages and
   components.

2. **Editor back-office** — for a small set of editors and admins. Authoring News, creating
   calendar Events, curating Learning content and its media assets, authoring Projects, performing
   tool reviews/governance, and administering the platform. It is the **Payload admin** (`/cms`)
   for modules still on Payload and the **Umbraco backoffice** (with KI Hub extensions where
   needed) for modules that have moved. Both are vendor editor tools for an internal editorial
   audience, EXEMPT from the Designsystemet requirement; their off-brand look is acceptable.
   During the transition both back-offices may run, each authoritative only for the modules it
   owns (Principle II).

Both surfaces share one auth model (Entra) and one role model. Editorial and administrative
actions belong in the back-office; the employee app MUST NOT be extended into a general-purpose
admin. Role gating MUST be enforced server-side on both surfaces.

Rationale: Separating a branded, read-first employee experience from a powerful editor back-office
lets each optimize for its audience, and leverages the CMS's own back-office instead of rebuilding
CRUD UI.

### IX. Reversible, Module-by-Module Migration (TRANSITIONAL)

KI Hub moves from Payload to Umbraco **one module at a time** (strangler fig), without breaking
production. Until Payload is retired:

1. **Switch per module.** A module's source is chosen by its `CONTENT_SOURCE_<MODULE>` setting
   (introduced by specs/023-content-source-seam). Moving a module, and moving it back, MUST be a
   configuration change, not a code change. An invalid setting MUST stop the application.
2. **Parity before cutover.** A module MAY switch to Umbraco only when its pages, rendered from
   Umbraco, match the parity goldens (`apps/web/tests/unit/__parity__/`), or match deliberately
   updated goldens whose change is recorded with a reason in the module's spec.
3. **Reversible until retirement.** Each moved module MUST stay switchable back to Payload until
   the final retirement feature. Content migration scripts MUST be idempotent and re-runnable, and
   each cutover uses a short editing freeze on the module being moved.
4. **Order.** Editorial modules move first: Projects as the pilot, then News + media, Events,
   Frontpage/site chrome, and Learning. The **Registry moves last**, under its own spec(s), which
   decide per record type between Umbraco content nodes and custom tables with a backoffice
   extension, and preserve Principle VI in full.
5. **Retirement.** Payload and PostgreSQL are removed only after every module runs on Umbraco and a
   safety period has passed with the Payload switch unused. Their tables are dropped last.

This principle lapses, by amendment, when Payload and PostgreSQL are retired.

Rationale: KI Hub is in production. A reversible, per-module path with byte-level parity checks
lets the platform change underneath employees without them noticing, and keeps every step small
enough to roll back.

## Technology & Architecture Constraints

- **Stack**: Next.js (App Router) in `apps/web` is the employee-facing app and renders every
  employee page. The CMS behind it is **Payload CMS** (embedded in `apps/web`, PostgreSQL, the
  `/cms` admin) today and **Umbraco** (below) as the target, per Principle IX. Shared logic lives in
  `packages/` (e.g. `artifact-schema`, `discovery-core`, `github-client`, `governance-core`).
- **Target CMS: Umbraco** —
  1. A **separate KI Hub instance**, not shared with any other Digdir site, on the current Umbraco
     **LTS** line (17 at the time of this amendment), .NET.
  2. **Headless only**: content reaches the employee app through the Content Delivery API and
     KI Hub's own APIs; no employee page is rendered by Umbraco (no Razor employee pages).
  3. **Azure SQL** as its database (Umbraco does not support PostgreSQL) and **Azure Blob Storage**
     for media.
  4. **Entra ID** for backoffice login; role gating via Umbraco user groups, enforced server-side.
  5. **uSync owns the schema** in git (document/element types are code-reviewed files); content
     nodes MUST NOT be written from startup code.
  6. **Internal-only access**: the Delivery API MUST require an API key and MUST be called
     server-side only; media MUST NOT be publicly reachable — it is served through the employee
     app behind Entra.
  7. Runs as a **single instance** unless and until load balancing is explicitly configured.
  8. The public `digdir/ki.norge.no` repository (MIT) is the reference implementation; patterns MAY
     be reused freely, and copied files keep their license notice.
- **Design System (MANDATORY foundation for the employee-facing app)**: All **employee-facing**
  UI MUST build on Digdir's Designsystemet (https://github.com/digdir/designsystemet), used the
  way Designsystemet itself prescribes (designsystemet.no): as a shared foundation that an
  organization layers its own visual identity and components on top of. Concretely:
  1. **Theme**: KI Hub's visual profile MUST be defined through Designsystemet's official theming
     pipeline — `apps/web/designsystemet.config.json` → generated design tokens + theme CSS
     (regenerate with `pnpm --filter web theme:build`). The app loads the generated KI Hub theme,
     not the default digdir theme. Brand values in the config are pinned to (and kept in sync
     with) the "KIHub Design System" design project.
  2. **Token layer**: the kihub token/component layer (`apps/web/src/styles/kihub/`, synced from
     the design project) is the styling API for KI Hub's own components. Its color tokens MUST
     resolve through the generated Designsystemet theme (the `kihub-ds-bridge.css` mapping), so
     Designsystemet components and KI Hub components provably share one palette with one value
     source.
  3. **Components**: custom presentational components are sanctioned and MUST style themselves
     exclusively via the shared token layer (`--kihub-*` / `--ds-*` tokens — no hardcoded colors,
     type, or spacing values). Designsystemet React components remain the default choice for
     behavioral/interactive primitives (form controls, dialogs, complex widgets) unless the
     approved design requires a custom treatment.
  4. Restyling or forking Designsystemet primitives remains **PROHIBITED** — when a primitive
     cannot express the approved design, build a custom component on the tokens instead.
  The **editor back-offices (Payload admin, Umbraco backoffice) are explicitly EXEMPT** from this
  requirement (Principle VIII); they use their vendor's own UI.
- **Repositories**: Two-repo model — `kihub` (this platform, including the Umbraco project) and
  `ai-artifacts` (AI-artifact content). The platform repo MUST contain zero real AI artifacts.
  (News/Events/Learning/Projects content lives in the CMS, not in a Git content repo.)
- **Discovery Service** (Registry): Scans AI-artifact repositories, finds `artifact.yaml` manifests,
  validates schema, extracts metadata, reads README, checks versions/install config, and updates
  the CMS (Payload today; Umbraco once the Registry moves). Runs on demand, and via
  scheduled/webhook/GitHub-Action triggers.
- **Manifest Schema** (Registry): The `artifact.yaml` schema (id, type, name, version, description,
  owner, source, install, tags, visibility, lifecycle) is a versioned contract shared between
  `ai-artifacts` and KI Hub; changes require a schema version bump.
- **Deployment**: KI Hub's own Azure Container Apps environment: the Next.js app (`kihub-web`) and
  the Umbraco instance as separate container apps → Azure PostgreSQL (until Payload is retired) and
  Azure SQL (Umbraco) → Azure Blob Storage (private). Moving to Altinn's shared platform (dis-core)
  later is allowed but not required. Terraform is introduced only when stable dev/test/prod
  environments are needed.

## Security, Governance & Compliance

- **Authentication**: Azure Entra ID from day one, for both surfaces and both back-offices. Only
  employees may sign in, enforced via tenant restrictions and group-based access.
- **Authorization**: Role model — Reader, Contributor, Reviewer, Approver, Admin — mapped from Entra
  groups. Access to the editor back-office and all governance/editorial actions MUST be gated by
  role and enforced server-side (Payload collection/field access control today; Umbraco user groups
  and permissions, plus server-side checks in KI Hub's own APIs, after migration).
- **Internal-only content**: KI Hub content is for employees only. No CMS endpoint, API or media
  URL MAY be reachable without authentication from outside KI Hub's own servers.
- **Reviews** (Registry): Typed reviews carry reviewer, status, date, comments, decision, required
  changes, risk level, and expiry. Approval state MUST be auditable, and the audit trail MUST
  survive the move to Umbraco.
- **Data ownership**: Per Principles I & II, no AI-artifact content is persisted in KI Hub (only
  metadata and governance records); News, Events, Learning content and Projects — including media
  uploaded for them — is native CMS-owned data, owned by exactly one CMS at a time.

## Development Workflow & Quality Gates

- **Spec-driven**: Features follow the spec-kit flow — constitution → specify → clarify → plan →
  tasks → analyze → implement. Plans MUST include a Constitution Check that verifies the principles
  above.
- **Contract-first**: The artifact manifest schema, Payload collection shapes, Umbraco content
  types (the uSync schema files) and KI Hub's content-source contracts (view models and source
  ports) are contracts; changes to them require explicit versioning and updates to dependent code.
- **Testing**: Discovery/validation logic, manifest schema validation, and governance
  state-transition rules MUST have automated tests. Integration tests cover manifest parsing and
  CMS write paths. New modules (News, Events, Learning, Projects) MUST test their access control
  and any state/validation rules. Every content-source adapter MUST have mapping tests, and a
  module's cutover MUST pass the parity goldens (Principle IX).
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

**Version**: 4.0.0 | **Ratified**: 2026-07-02 | **Last Amended**: 2026-10-15
