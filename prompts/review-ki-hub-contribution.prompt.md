---
name: 'Review KI Hub Contribution'
description: 'Review a new agent, skill, instruction, hook, workflow, or plugin contribution for KI Hub quality standards'
mode: ask
model: claude-sonnet-4-6
tools: ['codebase']
---

Review the changed files in this PR or workspace against KI Hub contribution standards.

For each changed resource, work through the relevant checklist from `.agents/contribution-checklists.md`:

1. **Frontmatter completeness** — required fields present and correctly formatted
2. **Naming convention** — lowercase with hyphens, matching folder/file name where applicable
3. **Description quality** — non-empty, wrapped in single quotes, within length limits
4. **Resource-specific rules:**
   - `.agent.md` — `model` field strongly recommended, `tools` field encouraged
   - `SKILL.md` — `name` matches folder name, description 10–1024 chars, assets referenced and under 5 MB
   - `hooks.json` — valid event names, bash/powershell command present, scripts are executable
   - `workflows/*.md` — no `.yml` or `.lock.yml` files included
   - `plugin.json` — `agents` and `skills` arrays use correct path format, no dangling references

5. **Build check** — has the contributor run `npm run build` and committed the updated `docs/` output?

Output a structured review:
- ✅ Pass — requirement met
- ⚠️ Warning — not required but strongly recommended
- ❌ Fail — requirement not met, PR should not merge until fixed
