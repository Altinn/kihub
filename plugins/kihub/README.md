# DigDir KI HUB Plugin

Meta prompts that help you discover and generate curated GitHub Copilot agents, collections, instructions, prompts, and skills.

## Installation

```bash
# Using Copilot CLI
copilot plugin install kihub@kihub
```

## What's Included

### Commands (Slash Commands)

| Command | Description |
|---------|-------------|
| `/kihub:suggest-kihub-collections` | Suggest relevant GitHub Copilot collections from the kihub repository based on current repository context and chat history, providing automatic download and installation of collection assets, and identifying outdated collection assets that need updates. |
| `/kihub:suggest-kihub-instructions` | Suggest relevant GitHub Copilot instruction files from the kihub repository based on current repository context and chat history, avoiding duplicates with existing instructions in this repository, and identifying outdated instructions that need updates. |
| `/kihub:suggest-kihub-agents` | Suggest relevant GitHub Copilot Custom Agents files from the kihub repository based on current repository context and chat history, avoiding duplicates with existing custom agents in this repository, and identifying outdated agents that need updates. |
| `/kihub:suggest-kihub-skills` | Suggest relevant GitHub Copilot skills from the kihub repository based on current repository context and chat history, avoiding duplicates with existing skills in this repository, and identifying outdated skills that need updates. |

### Agents

| Agent | Description |
|-------|-------------|
| `meta-agentic-project-scaffold` | Meta agentic project creation assistant to help users create and manage project workflows effectively. |

## Source

This plugin is part of [DigDir KI HUB](https://github.com/Altinn/kihub), a community-driven collection of GitHub Copilot extensions.

## License

MIT
