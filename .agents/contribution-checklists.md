# Contribution Checklists

> Per-resource-type checklists for PR reviews and self-review before submitting.
> Referenced from [AGENTS.md](../AGENTS.md).

---

## Pre-commit Checklist (all contribution types)

Before submitting your PR:

- [ ] Run `npm ci` to install dependencies
- [ ] Run `npm run build` to regenerate `README.md`, `docs/`, and `marketplace.json`
- [ ] Run `npm test` (`plugin:validate` + `skill:validate`) to catch manifest errors early
- [ ] Verify all new files have proper front matter
- [ ] Check that file names follow the lower-case-with-hyphens convention
- [ ] PR targets `staging` (not `main` directly)

---

## Code Review Checklists

### Prompt files (`*.prompt.md`)

- [ ] Has markdown front matter
- [ ] Has `name` field (human-readable name for the prompt)
- [ ] Has non-empty `description` field
- [ ] Has `mode` field: one of `agent`, `ask`, or `plan`
- [ ] File name is lower case with hyphens
- [ ] `model` field strongly recommended
- [ ] `tools` field encouraged if the prompt relies on specific tools

### Instruction files (`*.instructions.md`)

- [ ] Has markdown front matter
- [ ] Has non-empty `description` field wrapped in single quotes
- [ ] Has `applyTo` field with file patterns (e.g., `'**.js, **.ts'`)
- [ ] File name is lower case with hyphens

### Agent files (`*.agent.md`)

- [ ] Has markdown front matter
- [ ] Has non-empty `description` field wrapped in single quotes
- [ ] Has `name` field with human-readable name (e.g., `"Address Comments"` not `"address-comments"`)
- [ ] File name is lower case with hyphens
- [ ] Includes `model` field (strongly recommended)
- [ ] Considers using `tools` field

### Skills (`skills/*/`)

- [ ] Folder contains a `SKILL.md` file
- [ ] `SKILL.md` has markdown front matter
- [ ] Has `name` field matching the folder name (lowercase with hyphens, max 64 characters)
- [ ] Has non-empty `description` field wrapped in single quotes (10–1024 characters)
- [ ] Folder name is lower case with hyphens
- [ ] Any bundled assets are referenced in `SKILL.md`
- [ ] Bundled assets are under 5 MB per file

### Hook folders (`hooks/*/`)

- [ ] Folder contains a `README.md` file with markdown front matter
- [ ] Has `name` field with human-readable name
- [ ] Has non-empty `description` field wrapped in single quotes
- [ ] Has `hooks.json` file with valid hook configuration
- [ ] Folder name is lower case with hyphens
- [ ] Any bundled scripts are executable and referenced in `README.md`
- [ ] Follows the [GitHub Copilot hooks specification](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/use-hooks)
- [ ] Optionally includes `tags` array field for categorisation

### Workflow files (`workflows/*.md`)

- [ ] File has markdown front matter
- [ ] Has `name` field with human-readable name
- [ ] Has non-empty `description` field wrapped in single quotes
- [ ] File name is lower case with hyphens
- [ ] Contains `on` and `permissions` in frontmatter
- [ ] Workflow uses least-privilege permissions and safe outputs
- [ ] No `.yml`, `.yaml`, or `.lock.yml` files included
- [ ] Follows the [GitHub Agentic Workflows specification](https://github.github.com/gh-aw/reference/workflow-structure/)

### Plugins (`plugins/*/`)

- [ ] Directory contains a `.github/plugin/plugin.json` file
- [ ] Directory contains a `README.md` file
- [ ] `plugin.json` has `name` field matching the directory name (lowercase with hyphens)
- [ ] `plugin.json` has non-empty `description` field
- [ ] `plugin.json` has `version` field (semantic version, e.g., `"1.0.0"`)
- [ ] Directory name is lower case with hyphens
- [ ] If `keywords` is present, it is an array of lowercase hyphenated strings
- [ ] If `agents`, `commands`, or `skills` arrays are present, each entry is a valid relative path
- [ ] The plugin does not reference non-existent files
- [ ] Run `npm run build` to verify `marketplace.json` is updated correctly
