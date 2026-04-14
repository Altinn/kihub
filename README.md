# 🤖 KITT KI Hub

An internal collection of custom agents, instructions, skills, hooks, workflows, and plugins for GitHub Copilot.


Built for **Digdir**, and maintained by the **KITT** team.

## What's in this repo

| Resource | Description |
|----------|-------------|
| 🤖 [Agents](docs/README.agents.md) | Specialized Copilot agents that integrate with MCP servers |
| 📋 [Instructions](docs/README.instructions.md) | Coding standards applied automatically by file pattern |
| 🎯 [Skills](docs/README.skills.md) | Self-contained folders with instructions and bundled assets |
| 🔌 [Plugins](docs/README.plugins.md) | Curated bundles of agents and skills for specific workflows |
| 🪝 [Hooks](docs/README.hooks.md) | Automated actions triggered during Copilot agent sessions |
| ⚡ [Agentic Workflows](docs/README.workflows.md) | AI-powered GitHub Actions automations written in markdown |
| 🍳 [Cookbook](cookbook/README.md) | Copy-paste-ready recipes for working with Copilot APIs |

## Install a Plugin

For most users, the `kitt_ki_hub` marketplace is already registered in Copilot CLI/VS Code, so you can install a plugin directly:

```bash
copilot plugin install <plugin-name>@kitt_ki_hub
```

If you are using an older Copilot CLI version or a custom setup and see an error that the marketplace is unknown, register it once and then install:

```bash
copilot plugin marketplace add digdir/kitt_ki_hub
copilot plugin install <plugin-name>@kitt_ki_hub
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) · [AGENTS.md](AGENTS.md) for AI agent guidance · [Security](SECURITY.md) · [Code of Conduct](CODE_OF_CONDUCT.md)

> This repository is maintained by the Digdir KITT team. Contributions are handled internally.

## 📚 Additional Resources

- [VS Code Copilot Customization Documentation](https://code.visualstudio.com/docs/copilot/copilot-customization) - Official Microsoft documentation
- [GitHub Copilot Chat Documentation](https://code.visualstudio.com/docs/copilot/chat/copilot-chat) - Complete chat feature guide
- [VS Code Settings](https://code.visualstudio.com/docs/getstarted/settings) - General VS Code configuration guide

## ™️ Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
