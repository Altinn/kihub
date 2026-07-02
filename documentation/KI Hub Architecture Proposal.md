# KI Hub Architecture Proposal

## 1. Purpose

KI Hub should become an internal AI enablement and governance platform for discovering, managing, reviewing, and distributing AI-related assets such as skills, workflows, prompt packs, MCP servers, templates, policies, and playbooks.

The platform should not store these assets directly inside the web application. Instead, KI Hub should act as an enterprise catalog and governance layer on top of Git-based artifacts.

The core idea is:

```text
Git repositories contain artifacts.
KI Hub indexes, enriches, reviews, and exposes them.
APM or similar tooling installs them.
```

---

## 2. High-Level Architecture

```text
┌──────────────────────────────┐
│        AI Artifacts Repo      │
│                              │
│  skills/                     │
│  prompts/                    │
│  workflows/                  │
│  mcp/                        │
│  templates/                  │
│  playbooks/                  │
│                              │
│  Each artifact has:          │
│  - artifact.yaml             │
│  - README.md                 │
│  - examples                  │
│  - assets                    │
└───────────────┬──────────────┘
                │
                │ scanned by
                ▼
┌──────────────────────────────┐
│      Discovery Service        │
│                              │
│  - reads repositories         │
│  - validates manifests        │
│  - extracts metadata          │
│  - checks versions            │
│  - updates Payload            │
└───────────────┬──────────────┘
                │
                │ writes metadata
                ▼
┌──────────────────────────────┐
│          Payload CMS          │
│                              │
│  Stores enterprise metadata:  │
│  - approvals                  │
│  - owners                     │
│  - review status              │
│  - risk level                 │
│  - visibility                 │
│  - tags                       │
│  - lifecycle state            │
└───────────────┬──────────────┘
                │
                │ exposed through
                ▼
┌──────────────────────────────┐
│          Next.js UI           │
│                              │
│  - browse artifacts           │
│  - search                     │
│  - view install commands      │
│  - request review             │
│  - approve/reject             │
│  - governance dashboard       │
└──────────────────────────────┘
```

---

## 3. Repository Strategy

The recommended starting point is two repositories:

```text
kihub
ai-artifacts
```

### 3.1 `kihub`

This repository contains the platform itself:

```text
kihub/

apps/
  web/
    Next.js
    Payload CMS
    API routes
    Admin UI

packages/
  artifact-schema/
  discovery-core/
  github-client/
  apm-utils/
  ui/

infra/
  docker/
  terraform/ later

.github/
  workflows/
```

Responsibilities:

* Web application
* Authentication
* Payload CMS
* Artifact catalog UI
* Governance metadata
* Review workflows
* Discovery service
* Search
* APIs
* Azure deployment

The KI Hub platform should not contain actual skills, prompts, workflows, or MCP servers.

---

### 3.2 `ai-artifacts`

This repository contains the actual reusable AI assets:

```text
ai-artifacts/

skills/
  security-review/
  azure-architecture/
  accessibility-review/

prompts/
  code-review/
  documentation/
  threat-modeling/

workflows/
  onboarding/
  ai-risk-review/
  deployment-review/

mcp/
  lovdata/
  github/
  azure-devops/

templates/
  policy-template/
  architecture-decision-record/

playbooks/
  responsible-ai/
  mcp-security/
```

Each folder is one artifact.

Example:

```text
skills/security-review/

artifact.yaml
README.md
examples/
assets/
tests/
```

This gives us one central place for internal AI assets without creating hundreds of repositories too early.

Later, individual artifacts can be moved into separate repositories without changing the KI Hub architecture.

---

## 4. Artifact Model

An Artifact is a generic package-like concept.

It can represent:

* Skill
* Prompt pack
* Workflow
* MCP server
* Template
* Policy
* Playbook
* Evaluation dataset
* Agent definition

Instead of building separate systems for each type, KI Hub should treat all of them as artifacts.

```text
Artifact
  ├── skill
  ├── prompt
  ├── workflow
  ├── mcp
  ├── template
  ├── policy
  └── playbook
```

This makes the platform more future-proof.

---

## 5. Artifact Manifest

Each artifact should include a manifest file, for example:

```yaml
id: digdir.security-review
type: skill
name: Security Review Skill
version: 1.0.0
description: Helps review architecture, infrastructure, and code from a security perspective.

owner:
  team: AI Enablement
  contact: ai-team@example.no

source:
  provider: github
  repository: digdir/ai-artifacts
  path: skills/security-review

install:
  apm:
    package: digdir/security-review

tags:
  - security
  - architecture
  - review
  - ai-enablement

visibility: internal

lifecycle:
  status: experimental
```

Important principle:

```text
Artifact identity should be based on the artifact ID, not the repository URL.
```

Example:

```text
digdir.security-review
```

This means the artifact can later move from one repository to another without breaking governance history, approvals, usage data, or links inside KI Hub.

---

## 6. Payload CMS Role

Payload should not be the source of truth for artifact content.

Payload should store the enterprise metadata around artifacts.

Payload collections could include:

```text
Artifacts
Catalog Entries
Reviews
Approvals
Owners
Tags
Risk Assessments
Usage Metrics
Lifecycle States
```

### 6.1 Artifact Collection

Stores indexed technical metadata:

```text
id
artifactId
type
name
description
version
sourceProvider
sourceRepository
sourcePath
manifest
readme
lastScannedAt
latestVersion
installCommand
```

### 6.2 Catalog Entry Collection

Stores governance metadata:

```text
artifactId
approved
status
businessOwner
technicalOwner
riskLevel
visibility
reviewStatus
securityReview
gdprReview
accessibilityReview
recommended
featured
internalNotes
```

This separation is important:

```text
Git owns the artifact.
Payload owns the enterprise context.
```

---

## 7. Discovery Service

The Discovery Service is responsible for scanning artifact repositories and updating Payload.

Flow:

```text
GitHub repository
      │
      ▼
Discovery Service
      │
      ├── find artifact.yaml files
      ├── validate schema
      ├── read README.md
      ├── extract metadata
      ├── check version
      ├── check install config
      └── update Payload
```

The Discovery Service can run:

* On demand
* On a schedule
* Triggered by GitHub Actions
* Triggered by webhook when `ai-artifacts` changes

Recommended starting point:

```text
GitHub Action runs on merge to main
      │
      ▼
Calls KI Hub discovery endpoint
      │
      ▼
KI Hub updates catalog
```

---

## 8. APM Compatibility

KI Hub should not replace Microsoft APM.

Instead, KI Hub should make APM packages discoverable and governable.

A user should be able to open an artifact in KI Hub and see:

```bash
apm install digdir/security-review
```

or a dependency block:

```yaml
dependencies:
  apm:
    - digdir/security-review#1.0.0
```

KI Hub becomes similar to an internal marketplace:

```text
APM = installation mechanism
GitHub = artifact source
KI Hub = catalog, governance, discovery, approvals
```

---

## 9. Authentication and Access Control

KI Hub should integrate with Azure Entra ID from the beginning.

Authentication flow:

```text
User opens KI Hub
      │
      ▼
Redirect to Microsoft login
      │
      ▼
Azure Entra ID authenticates user
      │
      ▼
KI Hub receives identity token
      │
      ▼
User is mapped to Payload user
      │
      ▼
Role and permissions are applied
```

Recommended roles:

```text
Reader
Contributor
Reviewer
Approver
Admin
```

Example group mapping:

```text
Entra group: KI-Hub-Admins       → Admin
Entra group: KI-Hub-Reviewers    → Reviewer
Entra group: KI-Hub-Contributors → Contributor
All employees                    → Reader
```

At the start, only employees should be allowed to log in.

This can be enforced through Entra ID tenant restrictions and group-based access.

---

## 10. Lifecycle States

Each artifact should have a lifecycle state.

Suggested states:

```text
Draft
Experimental
In Review
Approved
Recommended
Deprecated
Archived
```

Example:

```text
Experimental
  Artifact is visible internally but not officially recommended.

In Review
  Artifact is being assessed by security/governance/technical reviewers.

Approved
  Artifact is accepted for internal use.

Recommended
  Artifact is considered a preferred solution.

Deprecated
  Artifact should no longer be used for new work.

Archived
  Artifact is hidden from normal browsing but kept for history.
```

---

## 11. Review and Governance Model

KI Hub should support structured reviews.

Possible review types:

```text
Security review
Privacy/GDPR review
Technical quality review
Accessibility review
Responsible AI review
Operational review
```

Each review can have:

```text
Reviewer
Status
Date
Comments
Decision
Required changes
Risk level
Expiry date
```

This is where KI Hub adds enterprise value beyond GitHub and APM.

---

## 12. Search

Phase 1 search can use PostgreSQL full-text search.

Search fields:

```text
name
description
tags
type
owner
README content
lifecycle status
```

Later, semantic search can be added using Qdrant or another vector database.

Future semantic search examples:

```text
"Find artifacts for reviewing Terraform security"
"Show approved MCP servers for legal data"
"Find prompt packs related to GDPR"
```

Recommended approach:

```text
Phase 1: PostgreSQL search
Phase 2: Add embeddings and Qdrant when semantic search becomes important
```

---

## 13. Deployment Architecture

Recommended Azure setup for early phase:

```text
Azure Entra ID
      │
      ▼
Azure Container Apps or App Service
      │
      ▼
Next.js + Payload
      │
      ▼
Azure PostgreSQL
      │
      ▼
Azure Blob Storage
```

Optional later components:

```text
Azure Key Vault
Azure Container Registry
Azure Application Insights
Log Analytics
Redis
Qdrant
Azure OpenAI
```

Initial deployment can be simple.

Terraform should be introduced when the platform is ready for stable dev/test/prod environments.

---

## 14. Suggested Implementation Phases

### Phase 1 — Foundation

```text
Create kihub repo
Create ai-artifacts repo
Set up Next.js + Payload
Set up PostgreSQL
Set up Azure Entra ID login
Define artifact manifest schema
Create first artifact examples
```

### Phase 2 — Catalog

```text
Build artifact listing
Build artifact detail page
Show install command
Index artifacts from ai-artifacts repo
Store metadata in Payload
Add tags and categories
```

### Phase 3 — Governance

```text
Add lifecycle states
Add review workflows
Add approval metadata
Add owner metadata
Add reviewer roles
Add internal visibility rules
```

### Phase 4 — Automation

```text
GitHub Action scans artifacts
Discovery service updates Payload
Manifest validation in PRs
Automatic changelog/version detection
Broken artifact detection
```

### Phase 5 — Advanced AI Features

```text
Semantic search
Qdrant
Azure OpenAI integration
Artifact recommendations
Usage analytics
Shadow AI discovery
Policy-based recommendations
```

---

## 15. Recommended Starting Architecture

The recommended starting architecture is:

```text
Repository 1: kihub
  - Next.js
  - Payload
  - Auth
  - Discovery
  - Governance
  - UI

Repository 2: ai-artifacts
  - Skills
  - Prompts
  - Workflows
  - MCP servers
  - Templates
  - Playbooks
```

This gives us a clean separation:

```text
Platform != Content
Catalog != Package source
Governance != Installation
```

---

## 16. Main Architectural Principles

1. KI Hub should not store actual artifacts inside the web app.
2. Git should remain the source of truth for artifact content.
3. Payload should store metadata, governance, reviews, and catalog state.
4. All asset types should be modeled as artifacts.
5. Artifact identity should be stable and independent of repository location.
6. APM should be used as the installation mechanism where relevant.
7. KI Hub should become the internal enterprise catalog and governance layer.
8. Start with one `ai-artifacts` monorepo, but allow future splitting into multiple repositories.
9. Use Azure Entra ID from the beginning.
10. Start simple, but design for future semantic search, automation, and governance.

---

## 17. Final Recommendation

Start with a two-repository model:

```text
kihub
ai-artifacts
```

Use the `ai-artifacts` repository as a structured monorepo for all internal AI artifacts.

Use KI Hub as the catalog, governance, review, and discovery platform.

This gives the team a simple starting point while preserving flexibility for future growth. If some artifacts later become important enough to have their own lifecycle, they can be moved into separate repositories without changing the platform model.

The key is to make KI Hub depend on stable artifact IDs, not physical repository structure.
