# Artifact Manifest (`artifact.yaml`)

Every artifact in `ai-artifacts` is described by an `artifact.yaml` manifest. This is the
versioned contract KI Hub relies on. The machine-readable schema lives at
[`schema/artifact.schema.json`](../schema/artifact.schema.json) (generated from the Zod source in
[`src/schema.ts`](../src/schema.ts)). **Schema version: 1.0.0.**

## Example

```yaml
id: digdir.security-review
type: skill
name: Security Review Skill
version: 1.0.0
description: Helps review architecture, infrastructure, and code from a security perspective.
owner:
  team: AI Enablement
  contact: ai-team@digdir.no
source:
  provider: github
  repository: digdir/ai-artifacts
  path: skills/security-review
install:
  apm:
    package: digdir/security-review
tags:
  - security
  - review
visibility: internal
lifecycle:
  status: experimental
```

## Fields

| Field | Required | Type / allowed values | Notes |
|-------|----------|-----------------------|-------|
| `id` | ✅ | reverse-DNS `org.slug` | Lowercase, globally unique, **stable** and independent of repository/path. Pattern: `^[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+(-[a-z0-9]+)*$`. Governance history keys off this — never reuse or change it when moving repos. |
| `type` | ✅ | `skill` \| `prompt` \| `workflow` \| `mcp` \| `template` \| `policy` \| `playbook` | The single generic artifact is differentiated by this field. |
| `name` | ✅ | string (non-empty) | Human-readable display name. |
| `version` | ✅ | semver `MAJOR.MINOR.PATCH` | e.g. `1.0.0`. |
| `description` | ✅ | string (non-empty) | One-line summary. |
| `owner.team` | ✅ | string | Owning team. |
| `owner.contact` | ✅ | email | Contact address. |
| `source.provider` | ✅ | `github` | Only value this phase. |
| `source.repository` | ✅ | string | e.g. `digdir/ai-artifacts`. |
| `source.path` | ✅ | string | Path within the repo, e.g. `skills/security-review`. |
| `install.apm.package` | ⬜ | string | APM package id (Principle V). The `install` block and its `apm` are optional. |
| `tags` | ⬜ | string[] (lowercase kebab) | Optional keywords. |
| `visibility` | ✅ | `internal` \| `public` \| `restricted` | Only `internal` is used in Phase 1; others reserved. |
| `lifecycle.status` | ✅ | `draft` \| `experimental` \| `in-review` \| `approved` \| `recommended` \| `deprecated` \| `archived` | Governance lifecycle state. |
| `schemaVersion` | ⬜ | semver | Manifest schema version targeted; defaults to `1.0.0`. |

Unknown/extra fields are rejected (the schema is strict) — this catches typos early.

## Validating a manifest

```bash
# From the kihub repo:
pnpm --filter @kihub/artifact-schema validate path/to/artifact.yaml
```

Exit code `0` = all valid, `1` = one or more invalid (with per-field errors), `2` = usage error.
