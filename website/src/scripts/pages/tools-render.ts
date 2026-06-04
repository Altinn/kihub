import { escapeHtml } from "../utils";

export interface RenderableTool {
  id: string;
  name: string;
  title: string;
  description: string;
  category: string;
  featured: boolean;
  version?: string | null;
  type?: string | null;
  license?: string | null;
  platforms?: string[];
  requirements: string[];
  features: string[];
  links: {
    blog?: string;
    vscode?: string;
    "vscode-insiders"?: string;
    "visual-studio"?: string;
    github?: string;
    documentation?: string;
    marketplace?: string;
    release?: string;
    npm?: string;
    pypi?: string;
  };
  downloads?: Array<{
    label: string;
    platform?: string;
    url: string;
  }>;
  privacy?: string | null;
  warnings?: string[];
  configuration?: {
    type: string;
    content: string;
  } | null;
  tags: string[];
}

function formatMultilineText(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, "<br>");
}

function sanitizeToolUrl(url: string): string {
  try {
    const protocol = new URL(url).protocol;
    if (
      protocol === "http:" ||
      protocol === "https:" ||
      protocol === "vscode:" ||
      protocol === "vscode-insiders:"
    ) {
      return escapeHtml(url);
    }
  } catch {
    return "#";
  }

  return "#";
}

function getToolActionLink(
  href: string | undefined,
  label: string,
  variant: "primary" | "secondary" = "secondary"
): string {
  if (!href) return "";
  const variantAttr = variant === "secondary" ? ' data-variant="secondary"' : "";
  return `<a href="${sanitizeToolUrl(
    href
  )}" class="ds-button"${variantAttr} data-size="sm" target="_blank" rel="noopener">${escapeHtml(
    label
  )}</a>`;
}

export function renderToolsHtml(
  tools: RenderableTool[],
  options: {
    query?: string;
    highlightTitle?: (title: string, query: string) => string;
  } = {}
): string {
  const { query = "", highlightTitle } = options;

  if (tools.length === 0) {
    return `
      <div class="ds-card empty-state" data-color="neutral">
        <h3>No tools found</h3>
        <p>Try a different search term or adjust filters</p>
      </div>
    `;
  }

  return tools
    .map((tool) => {
      const badges: string[] = [];
      if (tool.featured) {
        badges.push('<span class="ds-tag tool-badge featured" data-color="accent">Featured</span>');
      }
      badges.push(
        `<span class="ds-tag tool-badge category" data-variant="outline">${escapeHtml(tool.category)}</span>`
      );
      if (tool.version) {
        badges.push(
          `<span class="ds-tag tool-badge version" data-variant="outline">${escapeHtml(tool.version)}</span>`
        );
      }

      const features =
        tool.features && tool.features.length > 0
          ? `<div class="tool-section">
          <h3>Features</h3>
          <ul>${tool.features
            .map((feature) => `<li>${escapeHtml(feature)}</li>`)
            .join("")}</ul>
        </div>`
          : "";

      const requirements =
        tool.requirements && tool.requirements.length > 0
          ? `<div class="tool-section">
          <h3>Requirements</h3>
          <ul>${tool.requirements
            .map((requirement) => `<li>${escapeHtml(requirement)}</li>`)
            .join("")}</ul>
        </div>`
          : "";

      const platforms =
        tool.platforms && tool.platforms.length > 0
          ? `<div class="tool-section">
          <h3>Platforms</h3>
          <div class="tool-tags">
          ${tool.platforms
            .map(
              (platform) =>
                `<span class="ds-tag tool-tag" data-variant="outline">${escapeHtml(platform)}</span>`
            )
            .join("")}
          </div>
        </div>`
          : "";

      const privacy = tool.privacy
        ? `<div class="tool-section">
          <h3>Privacy</h3>
          <p class="tool-note">${formatMultilineText(tool.privacy)}</p>
        </div>`
        : "";

      const warnings =
        tool.warnings && tool.warnings.length > 0
          ? `<div class="tool-section">
          <h3>Notes</h3>
          <ul>${tool.warnings
            .map((warning) => `<li>${escapeHtml(warning)}</li>`)
            .join("")}</ul>
        </div>`
          : "";

      const tags =
        tool.tags && tool.tags.length > 0
          ? `<div class="tool-tags">
          ${tool.tags
            .map((tag) => `<span class="ds-tag tool-tag" data-variant="outline">${escapeHtml(tag)}</span>`)
            .join("")}
        </div>`
          : "";

      const config = tool.configuration
        ? `<div class="tool-config">
          <h3>Configuration</h3>
          <div class="tool-config-wrapper">
            <pre><code>${escapeHtml(tool.configuration.content)}</code></pre>
          </div>
          <button class="ds-button copy-config-btn" data-variant="secondary" data-size="sm" data-config="${encodeURIComponent(
            tool.configuration.content
          )}">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/>
              <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>
            </svg>
            Copy Configuration
          </button>
        </div>`
        : "";

      const releaseLabel = tool.version ? `Release ${tool.version}` : "Release";
      const downloadActions =
        tool.downloads && tool.downloads.length > 0
          ? tool.downloads
              .map((download) =>
                getToolActionLink(
                  download.url,
                  download.label,
                  "secondary"
                )
              )
              .filter(Boolean)
          : [];

      const actions = [
        getToolActionLink(tool.links.release, releaseLabel, "primary"),
        ...downloadActions,
        getToolActionLink(tool.links.blog, "Blog"),
        getToolActionLink(
          tool.links.marketplace,
          "Marketplace"
        ),
        getToolActionLink(tool.links.npm, "npm"),
        getToolActionLink(tool.links.pypi, "PyPI"),
        getToolActionLink(
          tool.links.documentation,
          "Docs"
        ),
        getToolActionLink(tool.links.github, "GitHub"),
        getToolActionLink(
          tool.links.vscode,
          "Install in VS Code",
          "primary"
        ),
        getToolActionLink(
          tool.links["vscode-insiders"],
          "VS Code Insiders"
        ),
        getToolActionLink(
          tool.links["visual-studio"],
          "Visual Studio"
        ),
      ].filter(Boolean);

      const actionsHtml =
        actions.length > 0
          ? `<div class="tool-actions">${actions.join("")}</div>`
          : "";

      const titleHtml =
        query && highlightTitle
          ? highlightTitle(tool.name, query)
          : escapeHtml(tool.name);

      return `
      <div class="ds-card tool-card" data-color="neutral">
        <div class="tool-header">
          <h2>${titleHtml}</h2>
          <div class="tool-badges">
            ${badges.join("")}
          </div>
        </div>
        <p class="tool-description">${formatMultilineText(tool.description)}</p>
        ${features}
        ${requirements}
        ${platforms}
        ${privacy}
        ${warnings}
        ${config}
        ${tags}
        ${actionsHtml}
      </div>
    `;
    })
    .join("");
}
