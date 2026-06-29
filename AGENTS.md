# KI Hub — AGENTS.md Hub

> **Owner:** Digdir KITT team · **Marketplace:** `kitt_ki_hub`
> Deep-dive topics (plugin architecture, hooks, CI validation, MCP setup, cookbook) live in [`.agents/`](.agents/) — see the detail-file table at the bottom.

---

## What This Repo Does

KI Hub is Digdir's internal library of GitHub Copilot resources (agents, instructions, skills,
hooks, agentic workflows, plugins) published through the `kitt_ki_hub` plugin marketplace.
Everything is file-based; a Node.js build layer (`eng/*.mjs`) generates `README.md` and
`marketplace.json` from the source tree.

---

## Directory Map

| Path | Contains | Notes |
|---|---|---|
| `agents/` | `*.agent.md` | Copilot agents |
| `prompts/` | `*.prompt.md` | Reusable prompt templates for Copilot Chat and Claude Code |
| `instructions/` | `*.instructions.md` | File-pattern-scoped coding standards |
| `skills/<name>/` | `SKILL.md` + assets | Agent Skills (see [agentskills.io](https://agentskills.io/specification)) |
| `hooks/<name>/` | `README.md` + `hooks.json` + scripts | Session-event automation |
| `workflows/` | `*.md` | Agentic workflow definitions (source only — no `.yml`) |
| `plugins/<name>/` | `.github/plugin/plugin.json` + `README.md` | Installable bundles |
| `plugins/external.json` | External plugin registry | Merged into marketplace at build time |
| `eng/` | `*.mjs` build scripts | Do not edit generated output directly |
| `docs/` | `README.<type>.md` files | **Generated** — updated by `npm run build` |
| `cookbook/` | SDK recipes (Python, Node.js, Go, .NET) | Copy-paste patterns for Copilot SDK |
| `.github/agents/` | Repo-scoped Copilot agents | `accessibility.agent.md`, `agentic-workflows.agent.md` |

---

## CI Checks That Will Block Your PR

Run `npm run build && npm run plugin:validate && npm run skill:validate` before pushing.

| Workflow file | What it checks | Common fix |
|---|---|---|
| `validate-readme.yml` | `npm start` output matches committed `README.md` + `docs/` | Run `npm run build` and commit the diff |
| `check-plugin-structure.yml` | Every path in `plugin.json` resolves to a real file | Fix dangling references in `plugin.json` |
| `validate-agentic-workflows-pr.yml` | No `.yml`/`.yaml`/`.lock.yml` files in `workflows/` | Only commit the `.md` source; never commit compiled lock files |
| `check-line-endings.yml` | Consistent line endings repo-wide | Use LF; don't mix CRLF |

---

## Branch And Deployment Policy

`main` is the production branch. `staging` is the staging branch.

Never push directly to `main` or `staging`. Always create a new feature/fix branch,
push that branch, and open a GitHub pull request.

Regular contribution PRs should target `staging`. Production releases should be promoted
from `staging` to `main` through a GitHub pull request. Changes may be merged into
`staging` or `main` only after the required checks and reviews pass.

---

## Plugin Materialization (How Plugins Are Built)

Plugins are **declarative**: `plugin.json` lists relative paths to source files in top-level
directories (`agents/`, `skills/`, etc.). CI runs `eng/materialize-plugins.mjs` to bundle those
sources into each plugin folder. External plugins (other repos, npm, pip) are declared in
`plugins/external.json` and merged into `.github/plugin/marketplace.json` during `npm run build`.

Scaffold a new plugin: `npm run plugin:create -- --name <slug>`
Deep dive → [`.agents/plugin-architecture.md`](.agents/plugin-architecture.md)

---

## Hook Events (Quick Reference)

Available events: `sessionStart` · `sessionEnd` · `userPromptSubmitted` · `preToolUse` · `postToolUse` · `errorOccurred`

Install a hook: copy its folder to `.github/hooks/` in your target repo; `chmod +x` any scripts.
Example in this repo: `hooks/governance-audit/` — scans prompts for threat signals via `userPromptSubmitted`.

Deep dive → [`.agents/hooks-events.md`](.agents/hooks-events.md)

---

## Cookbook

`cookbook/copilot-sdk/<lang>/recipe/` has working SDK examples in four languages:

| Recipe | What it shows |
|---|---|
| `persisting-sessions.*` | Resuming a Copilot session across runs |
| `multiple-sessions.*` | Running parallel agent sessions |
| `ralph-loop.*` | RALPH (Review–Act–Learn–Plan–Handle) control loop |
| `pr-visualization.*` | Visualizing PR diffs with the Copilot SDK |
| `error-handling.*` | Retry and graceful-degradation patterns |
| `managing-local-files.*` | Safe local file I/O from an agent |

Deep dive → [`.agents/cookbook.md`](.agents/cookbook.md)

---

## Recommended `.agents/` Detail Files

| Slug | Purpose |
|---|---|
| [`.agents/plugin-architecture.md`](.agents/plugin-architecture.md) | Materialization pipeline, `external.json` spec, marketplace build |
| [`.agents/hooks-events.md`](.agents/hooks-events.md) | Full event schema, governance-audit hook walkthrough, install steps |
| [`.agents/cookbook.md`](.agents/cookbook.md) | SDK recipe index, language comparison, RALPH loop anatomy |
| [`.agents/ci-validation.md`](.agents/ci-validation.md) | Each CI workflow explained in depth; failure modes and fixes |
| [`.agents/mcp-setup.md`](.agents/mcp-setup.md) | MCP server catalogue; Docker vs CLI launch; per-agent requirements |
| [`.agents/contribution-checklists.md`](.agents/contribution-checklists.md) | Pre-commit and per-resource-type code review checklists |
