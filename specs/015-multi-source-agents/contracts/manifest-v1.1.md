# Contract: Artifact Manifest Schema 1.1.0

**Status**: proposed by feature 015 | supersedes 1.0.0 (strict superset — every valid 1.0.0
manifest is a valid 1.1.0 manifest)

## Changes from 1.0.0

1. **New `type` value**: `agent`. Full enum:
   `skill | prompt | workflow | mcp | template | policy | playbook | agent`.
2. **New type directory**: agents live at `agents/<slug>/artifact.yaml` (two levels deep, same
   rule as all types; `TYPE_DIRS` gains `agents`).
3. **New optional sibling file convention** (agents only): `agents/<slug>/agent-card.json` — an
   A2A v1.0 Agent Card (see [agent-card.md](agent-card.md)). The manifest remains the sole
   registration contract; the card never creates, identifies, or governs an artifact. Card
   files next to non-agent manifests are ignored.
4. `schemaVersion` default becomes `1.1.0`. Manifests declaring `1.0.0` (or omitting the field)
   remain valid.

## Unchanged

Everything else: required fields (`id`, `type`, `name`, `version`, `description`, `owner.team`,
`owner.contact`, `source.provider`, `source.repository`, `source.path`, `visibility`,
`lifecycle.status`), strictness (unknown manifest fields rejected), patterns (reverse-DNS id,
strict semver), `source.provider` enum (`github` only).

## Example agent manifest

```yaml
id: digdir.support-agent
type: agent
name: Support Agent
version: 1.0.0
description: Svarer på interne supportspørsmål og eskalerer uløste saker.
owner:
  team: AI Enablement
  contact: ai-team@digdir.no
source:
  provider: github
  repository: digdir/ai-artifacts
  path: agents/support-agent
tags: [support, agent]
visibility: internal
lifecycle:
  status: experimental
```

## Propagation checklist (contract-first gate)

- [ ] `packages/artifact-schema/src/schema.ts` — `ARTIFACT_TYPES` + `schemaVersion` default
- [ ] `packages/artifact-schema/scripts/generate-json-schema.ts` — `$id` → `…/artifact-1.1.0.json`
- [ ] `packages/artifact-schema/schema/artifact.schema.json` — regenerated and committed
- [ ] `packages/artifact-schema/docs/artifact-manifest.md` — version line, `type` row,
      new "Agent card" section
- [ ] `packages/discovery-core/src/scan.ts` — `TYPE_DIRS` + `agents`
- [ ] `apps/web` — enum migration + regenerated `payload-types.ts`
- [ ] Validate CLI (`pnpm --filter @kihub/artifact-schema validate`) accepts the example above
