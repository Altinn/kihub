# MCP Setup — Deep Dive

> **Covers:** MCP server catalogue, workspace config, agent frontmatter declarations, SDK integration, CLI vs Docker launch, install-badge pipeline, and per-agent requirements.

---

## What MCP Is in This Repo

MCP (Model Context Protocol) servers are lightweight processes that expose **tools** Copilot can invoke during a conversation. KI Hub uses MCP in three distinct layers:

| Layer | Where it lives | Who reads it |
|---|---|---|
| Workspace (VS Code) | `.vscode/mcp.json` | VS Code / GitHub Copilot Chat |
| Agent frontmatter | `agents/*.agent.md` YAML | Build pipeline + Copilot at runtime |
| SDK `SessionConfig` | `cookbook/` recipes | Copilot SDK (`CopilotClient`) |

---

## 1. Workspace Server — `.vscode/mcp.json`

The only server pre-configured for the repo itself is the GitHub Agentic Workflows CLI bridge:

```json
{
  "servers": {
    "github-agentic-workflows": {
      "command": "gh",
      "args": ["aw", "mcp-server"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

**Launch mode:** CLI (stdio). The `gh aw mcp-server` sub-command starts a local process; VS Code
manages its lifecycle automatically.

**Activation:** `.vscode/settings.json` sets `"chat.mcp.access": "all"`, so every Copilot Chat
session in this workspace sees all configured servers without extra opt-in.

---

## 2. Server Catalogue — Common Patterns

These server configurations appear in cookbook recipes and learning-hub docs and are the
reference patterns to copy when wiring up new agents.

### Playwright (browser automation / accessibility)
```json
{
  "playwright": {
    "type": "local",
    "command": "npx",
    "args": ["@playwright/mcp@latest"],
    "tools": ["*"]
  }
}
```
**Used by:** `accessibility_report.py` / `accessibility-report.ts` recipes.  
**Prerequisite:** Node.js + npm on PATH; no separate install needed (`npx` fetches on first run).

### GitHub MCP Server (PR/issue data)
```json
{
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": { "GITHUB_TOKEN": "${input:githubToken}" }
  }
}
```
**Used by:** `pr_visualization.py` / `pr-visualization.ts` recipes (implicit — agent is prompted
to use GitHub MCP tools; the server must be pre-configured in `.vscode/mcp.json`).

### PostgreSQL
```json
{
  "postgres": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-postgres"],
    "env": { "DATABASE_URL": "${input:databaseUrl}" }
  }
}
```

### HTTP (remote) servers
```json
{
  "my-remote-api": {
    "type": "http",
    "url": "https://api.example.com/mcp",
    "headers": { "Authorization": "Bearer ${input:token}" }
  }
}
```

---

## 3. CLI vs Docker Launch

| Mode | `command` field | When to use |
|---|---|---|
| **CLI / npx** | `"npx"` | npm-distributed servers; zero-install for teammates |
| **CLI / Python** | `"python"` or `"uvx"` | PyPI-distributed servers |
| **CLI / binary** | `"gh"`, `"docker"`, etc. | GitHub CLI extension or compiled binary |
| **Docker** | `"docker"` with `"args": ["run", "--rm", "-i", "<image>", ...]` | Hermetic environments, no local runtime needed |
| **HTTP remote** | N/A (`type: "http"`) | Hosted MCP endpoints; no local process |

**Docker example:**
```json
{
  "postgres-docker": {
    "command": "docker",
    "args": ["run", "--rm", "-i",
             "-e", "DATABASE_URL",
             "mcp/postgres:latest"],
    "env": { "DATABASE_URL": "postgresql://user:pass@host/db" }
  }
}
```

Use Docker when the MCP server has heavy dependencies or when you need reproducible environments
across the team. Use `npx`/CLI for lightweight servers where start-up speed matters.

---

## 4. Agent Frontmatter — `mcp-servers:` Block

Agents can declare the MCP servers they need directly in YAML frontmatter. The build pipeline
(`eng/yaml-parser.mjs → extractMcpServerConfigs()`) reads these and generates one-click
install badges in `README.md` and `docs/README.agents.md`.

```yaml
---
name: 'Database Administrator'
description: 'PostgreSQL performance tuning and schema design'
model: Claude Sonnet 4
tools: ['codebase', 'terminal', 'postgres']
mcp-servers:
  postgres:
    type: local
    command: npx
    args: ["-y", "@modelcontextprotocol/server-postgres"]
---
```

**Key rule:** The key under `mcp-servers:` must match the name used in `tools:`. The build
script encodes the config into a URL and renders badges like:

```
[![Install MCP](...)](https://aka.ms/kihub/install/mcp-vscode?name=postgres&config=<encoded>)
```

Badges are generated for VS Code, VS Code Insiders, and Visual Studio. Server names are also
matched against the GitHub MCP registry at `https://api.mcp.github.com/v0.1/servers/` (cached
per build) to link through to the canonical registry entry.

---

## 5. SDK `SessionConfig` — Runtime MCP Attachment

When using the Copilot SDK directly (cookbook recipes), attach MCP servers at session creation time:

**Python:**
```python
session = await client.create_session(SessionConfig(
    model="claude-opus-4.6",
    mcp_servers={
        "playwright": {
            "type": "local",
            "command": "npx",
            "args": ["@playwright/mcp@latest"],
            "tools": ["*"],
        }
    },
))
```

**TypeScript:**
```typescript
const session = await client.createSession({
    model: "claude-opus-4.6",
    mcpServers: {
        playwright: {
            type: "local",
            command: "npx",
            args: ["@playwright/mcp@latest"],
            tools: ["*"],
        },
    },
});
```

Note the naming difference: Python SDK uses `mcp_servers` (snake_case); TypeScript SDK uses
`mcpServers` (camelCase). The structure is identical.

---

## 6. Per-Agent Requirements

| Agent / Recipe | MCP Server | Launch mode | Notes |
|---|---|---|---|
| `agentic-workflows.agent.md` | `github-agentic-workflows` | CLI (`gh aw mcp-server`) | Pre-configured in `.vscode/mcp.json`; also available as `agentic-workflows` MCP tool in Copilot Cloud |
| `accessibility_report.py` / `accessibility-report.ts` | `playwright` | CLI (`npx @playwright/mcp@latest`) | Node.js required; `tools: ["*"]` grants full access |
| `pr_visualization.py` / `pr-visualization.ts` | GitHub MCP | CLI (`npx @modelcontextprotocol/server-github`) | Needs `GITHUB_TOKEN` env var; server must be in `.vscode/mcp.json` |
| `accessibility.agent.md` | None | — | Uses built-in tools only (`codebase`, `terminal`, etc.) |

---

## 7. Secrets & Security

- **Never hardcode tokens** in `.vscode/mcp.json`. Use `${input:variableName}` — VS Code prompts at runtime.
- **Commit `.vscode/mcp.json`** for shared server configurations (no credentials in file).
- **Least privilege:** Use read-only DB connections for analysis agents; scope GitHub tokens to needed repos only.
- **`tools: ["*"]`** grants the session access to all tools the server exposes — narrow this if the server has destructive capabilities.

---

## 8. Troubleshooting Checklist

1. **Server not starting?** Run the command manually in terminal first (`npx @playwright/mcp@latest`) to check for missing dependencies.
2. **Tool not visible to agent?** Verify the key in `mcp-servers:` frontmatter matches the name in `tools:`.
3. **`chat.mcp.access` not set?** Add `"chat.mcp.access": "all"` to `.vscode/settings.json`, or grant per-server access via the VS Code Copilot Chat UI.
4. **Install badges not rendering?** Run `npm run build` — badges are generated output, not source. Commit the `docs/` and `README.md` diff.
5. **Docker server slow to start?** Pull the image ahead of time (`docker pull <image>`) so Copilot doesn't wait on download mid-conversation.

---

## Related Detail Files

| File | What it adds |
|---|---|
| [`.agents/cookbook.md`](cookbook.md) | SDK recipe index; MCP attachment patterns per language |
| [`.agents/plugin-architecture.md`](plugin-architecture.md) | How `plugin.json` bundles MCP server configs for distribution |
| [`.agents/hooks-events.md`](hooks-events.md) | Hook events that fire around tool/MCP invocations |
| [`.agents/ci-validation.md`](ci-validation.md) | Why `npm run build` must be committed (badges are generated) |
| [`website/src/content/learning-hub/understanding-mcp-servers.md`](../website/src/content/learning-hub/understanding-mcp-servers.md) | User-facing MCP explainer (built-in vs MCP tools, FAQ) |
