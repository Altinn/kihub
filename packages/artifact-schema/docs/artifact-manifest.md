# Artifact Manifest (`artifact.yaml`)

Every artifact in `ai-artifacts` is described by an `artifact.yaml` manifest. This is the
versioned contract KI Hub relies on. The machine-readable schema lives at
[`schema/artifact.schema.json`](../schema/artifact.schema.json) (generated from the Zod source in
[`src/schema.ts`](../src/schema.ts)). **Schema version: 1.1.0.**

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
| `type` | ✅ | `skill` \| `prompt` \| `workflow` \| `mcp` \| `template` \| `policy` \| `playbook` \| `agent` | The single generic artifact is differentiated by this field. Must match the type directory the manifest lives under (see below). |
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
| `schemaVersion` | ⬜ | semver | Manifest schema version targeted; defaults to `1.1.0`. |

Unknown/extra fields are rejected (the schema is strict) — this catches typos early.

## Type directories

Discovery only looks two levels deep under a fixed set of type directories, and the manifest's
`type` must match the directory it lives under — a mismatch (e.g. `type: agent` under `skills/`)
is reported as an invalid manifest and not registered:

`skills/` → `skill` · `prompts/` → `prompt` · `workflows/` → `workflow` · `mcp/` → `mcp` ·
`templates/` → `template` · `policies/` → `policy` · `playbooks/` → `playbook` · `agents/` → `agent`

## Agent card (`agent-card.json`) — agents only

An agent MAY ship an [A2A (Agent2Agent) v1.0 Agent Card](https://a2a-protocol.org/) as a sibling
file: `agents/<slug>/agent-card.json`. KI Hub fetches it during discovery, validates it, stores a
verbatim snapshot with the artifact, and renders it on the agent's detail page (skills,
capabilities, interfaces, authentication schemes).

- The card is **optional enrichment**: a missing or invalid card never blocks registration of a
  valid agent — validation problems are reported to the editors in the discovery run instead,
  and no (stale) card is kept.
- Validation is **tolerant**, unlike the manifest: only `name` (non-empty string) is required;
  known A2A fields (`description`, `version`, `provider`, `supportedInterfaces`, `capabilities`,
  `defaultInputModes`/`defaultOutputModes`, `skills` — each skill needs a `name` —
  `securitySchemes`, `security`) are type-checked when present; unknown fields are preserved.
  Maximum size 256 KB.
- The manifest remains the sole registration contract — the card never creates, identifies, or
  governs an artifact. Card files next to non-agent artifacts are ignored.
- Validate locally with `validateAgentCard` from `@kihub/artifact-schema`.

## Validating a manifest

```bash
# From the kihub repo:
pnpm --filter @kihub/artifact-schema validate path/to/artifact.yaml
```

Exit code `0` = all valid, `1` = one or more invalid (with per-field errors), `2` = usage error.
