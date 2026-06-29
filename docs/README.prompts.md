# 💬 Reusable Prompts

Ready-to-use prompt templates for GitHub Copilot Chat and Claude Code. Each prompt is a `.prompt.md` file with frontmatter that configures the mode, model, and tools.
### How to Contribute

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-prompts) for guidelines on how to contribute new prompts.

### How to Use Prompts

**To Install:**
- Download the `.prompt.md` file and add it to your repository's `.github/prompts/` directory
- VS Code will automatically discover prompts in that location

**To Use in VS Code with Copilot:**
- Open Copilot Chat and type `/` to see available prompt templates
- Select the prompt you want to use, or reference it with its name

**To Use with Claude Code:**
- Reference the prompt file directly, or copy its content as a starting point for your session

| Name | Description | Mode |
| ---- | ----------- | ---- |
| [Review KI Hub Contribution](../prompts/review-ki-hub-contribution.prompt.md) | Review a new agent, skill, instruction, hook, workflow, or plugin contribution for KI Hub quality standards | `ask` |
