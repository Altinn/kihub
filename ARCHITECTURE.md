# Architecture

KI Hub is a **file-based catalogue** of GitHub Copilot resources (agents,
instructions, skills, hooks, agentic workflows, plugins), published to the
`kitt_ki_hub` plugin marketplace. A Node.js build layer in `eng/*.mjs` generates
`README.md`, `docs/`, and `.github/plugin/marketplace.json` from the source tree.

Start with the hub: **[AGENTS.md](AGENTS.md)**.

## Deep-dive docs

Detailed topic docs live in [`.agents/`](.agents/):

| Topic | File |
|---|---|
| Plugin materialization & marketplace build | [`.agents/plugin-architecture.md`](.agents/plugin-architecture.md) |
| Hook event model & install | [`.agents/hooks-events.md`](.agents/hooks-events.md) |
| Copilot SDK cookbook | [`.agents/cookbook.md`](.agents/cookbook.md) |
| CI validation workflows | [`.agents/ci-validation.md`](.agents/ci-validation.md) |
| MCP server setup | [`.agents/mcp-setup.md`](.agents/mcp-setup.md) |

## High-level flow

1. Contributors add source files under `agents/`, `instructions/`, `skills/`,
   `hooks/`, `workflows/`, and `plugins/`.
2. `npm run build` regenerates `README.md`, `docs/`, and `marketplace.json`.
3. CI validates structure, plugin manifests, skills, and line endings
   (see [`.agents/ci-validation.md`](.agents/ci-validation.md)).
4. The `website/` Astro app renders the catalogue from generated data.
