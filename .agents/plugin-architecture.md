# Plugin Architecture — Deep Dive

> **Scope:** How plugins are declared, materialized at build time, and published to `marketplace.json`.
> **Key files:** `eng/materialize-plugins.mjs` · `eng/generate-marketplace.mjs` · `eng/validate-plugins.mjs` · `plugins/external.json` · `.github/plugin/marketplace.json`

---

## Anatomy of a Plugin

Each plugin lives under `plugins/<slug>/`. **Only two files are committed to the repo:**

```
plugins/<slug>/
  .github/plugin/plugin.json   ← declarative manifest
  README.md                    ← human-facing description
```

Agent and skill files are **never** committed inside plugin folders. CI blocks PRs that contain `plugins/<slug>/agents/`, `commands/`, or `skills/` subdirectories — those are generated artifacts, not source.

---

## plugin.json Schema

```jsonc
{
  "name": "my-plugin",           // must match folder name; [a-z0-9-] only, ≤50 chars
  "description": "...",          // 1–500 chars
  "version": "1.0.0",            // semver string
  "keywords": ["tag1", "tag2"],  // optional; ≤10 items; each [a-z0-9-], ≤30 chars
  "author": { "name": "..." },
  "repository": "https://github.com/Altinn/kihub",
  "license": "MIT",

  // Reference source files from the repo root — NOT copies:
  "agents": ["./agents/my-agent.md"],    // resolves → agents/my-agent.agent.md
  "skills": ["./skills/my-skill/"]       // resolves → skills/my-skill/ directory
}
```

Path conventions enforced by `validate-plugins.mjs`:
- `agents` entries **must** start with `./agents/` and end with `.md`; the source `agents/<name>.agent.md` must exist.
- `skills` entries **must** start with `./skills/` and end with `/`; the source `skills/<name>/SKILL.md` must exist.

---

## Materialization Pipeline (`eng/materialize-plugins.mjs`)

Run automatically via `npm run build`. Steps per plugin:

1. **Read** `plugins/<slug>/.github/plugin/plugin.json`
2. **Resolve** each `agents` path:
   `./agents/foo.md` → repo root `agents/foo.agent.md` → copy to `plugins/<slug>/agents/foo.md`
3. **Resolve** each `skills` path:
   `./skills/bar/` → repo root `skills/bar/` → recursively copy to `plugins/<slug>/skills/bar/`
4. **Rewrite** `plugin.json` in-place so individual file paths collapse to directory paths:
   - `["./agents/foo.md", "./agents/bar.md"]` → `["./agents"]`
   - `["./skills/baz/"]` → `["./skills/baz"]` (trailing slash stripped)

The rewrite only happens when content actually changes, so it's idempotent.

**To undo materialization locally:**
```bash
npm run plugin:clean      # runs eng/clean-materialized-plugins.mjs
```
This removes `agents/`, `commands/`, and `skills/` subdirs from every plugin folder.

---

## Marketplace Generation (`eng/generate-marketplace.mjs`)

Produces `.github/plugin/marketplace.json`. Steps:

1. **Local plugins** — iterate every `plugins/<slug>/` directory, read `plugin.json`, emit:
   ```json
   { "name": "kihub", "source": "kihub", "description": "...", "version": "1.1.0" }
   ```
2. **External plugins** — read `plugins/external.json`, validate each entry, merge as-is (full object preserved).
3. **Dedup check** — warns on name collision between local and external.
4. **Sort** all plugins alphabetically (case-insensitive) before writing.

Output structure:
```jsonc
{
  "name": "kihub",
  "metadata": { "pluginRoot": "./plugins", ... },
  "owner": { "name": "GitHub", "email": "copilot@github.com" },
  "plugins": [ /* local + external, sorted */ ]
}
```

---

## external.json Spec (`plugins/external.json`)

Array of plugin objects for plugins that live in other repositories. Every entry must have:

| Field | Type | Notes |
|---|---|---|
| `name` | string | Unique slug, no collision with local plugins |
| `description` | string | Required |
| `version` | string | Required |
| `source` | **object** | String values are rejected — no local paths allowed |
| `source.source` | string | `"github"` · `"url"` · `"npm"` · `"pip"` |

Example GitHub-hosted external plugin:
```json
{
  "name": "azure",
  "description": "Azure cloud resource management skills.",
  "version": "1.0.0",
  "source": {
    "source": "github",
    "repo": "microsoft/azure-skills",
    "path": ".github/plugins/azure-skills"
  }
}
```

---

## CI Enforcement

| Workflow | Trigger | What it blocks |
|---|---|---|
| `check-plugin-structure.yml` | PR touching `plugins/**` | PRs that contain materialized `agents/`, `commands/`, or `skills/` subdirs, or any symlinks inside a plugin folder |
| `validate-readme.yml` | PR touching any source | `marketplace.json` or `docs/` out of sync with sources |

**Fix for materialized-files rejection:**
```bash
find plugins/ -mindepth 2 -maxdepth 2 -type d \( -name agents -o -name commands -o -name skills \) -exec rm -rf {} +
git add -A && git commit -m "fix: remove materialized plugin files"
```

---

## Scaffold a New Plugin

```bash
npm run plugin:create -- --name <slug>
```

Interactive — prompts for display name, description, and keywords. Creates:
- `plugins/<slug>/.github/plugin/plugin.json`
- `plugins/<slug>/README.md`

After scaffolding, add `"agents"` and/or `"skills"` arrays to `plugin.json` pointing at existing repo sources, then run `npm run build && npm run plugin:validate` to verify.

---

## Quick Reference: Build Commands

| Command | Script | Purpose |
|---|---|---|
| `npm run build` | `eng/update-readme.mjs` + others | Full build: materialize → validate → marketplace → README |
| `npm run plugin:validate` | `eng/validate-plugins.mjs` | Validate all `plugin.json` files |
| `npm run plugin:create` | `eng/create-plugin.mjs` | Scaffold new plugin interactively |
| `npm run plugin:clean` | `eng/clean-materialized-plugins.mjs` | Strip materialized copies from plugin dirs |
