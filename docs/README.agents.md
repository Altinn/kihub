# 🤖 Custom Agents

Custom agents for GitHub Copilot, making it easy for users and organizations to "specialize" their Copilot coding agent (CCA) through simple file-based configuration.
### How to Contribute

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-agents) for guidelines on how to contribute new agents, improve existing ones, and share your use cases.

### How to Use Custom Agents

**To Install:**
- Click the **VS Code** or **VS Code Insiders** install button for the agent you want to use
- Download the `*.agent.md` file and add it to your repository

**MCP Server Setup:**
- Each agent may require one or more MCP servers to function
- Click the MCP server to view it on the GitHub MCP registry
- Follow the guide on how to add the MCP server to your repository

**To Activate/Use:**
- Access installed agents through the VS Code Chat interface, assign them in CCA, or through Copilot CLI (coming soon)
- Agents will have access to tools from configured MCP servers
- Follow agent-specific instructions for optimal usage

| Title | Description | MCP Servers |
| ----- | ----------- | ----------- |
| [Accessibility Expert](../agents/accessibility.agent.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/kihub/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2FAltinn%2Fkihub%2Fmain%2Fagents%2Faccessibility.agent.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/kihub/install/agent?url=vscode-insiders%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2FAltinn%2Fkihub%2Fmain%2Fagents%2Faccessibility.agent.md) | Expert assistant for web accessibility (WCAG 2.1/2.2), inclusive UX, and a11y testing |  |
