import {
  escapeHtml,
  getActionButtonsHtml,
  getGitHubUrl,
  getInstallDropdownHtml,
  getLastUpdatedHtml,
} from '../utils';

export interface RenderableInstruction {
  title: string;
  description?: string;
  path: string;
  applyTo?: string | string[] | null;
  extensions?: string[];
  lastUpdated?: string | null;
}

export type InstructionSortOption = 'title' | 'lastUpdated';

export function sortInstructions<T extends RenderableInstruction>(
  items: T[],
  sort: InstructionSortOption
): T[] {
  return [...items].sort((a, b) => {
    if (sort === 'lastUpdated') {
      const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return dateB - dateA;
    }

    return a.title.localeCompare(b.title);
  });
}

export function renderInstructionsHtml(
  items: RenderableInstruction[],
  options: {
    query?: string;
    highlightTitle?: (title: string, query: string) => string;
  } = {}
): string {
  const { query = '', highlightTitle } = options;

  if (items.length === 0) {
    return `
      <div class="ds-card empty-state" data-color="neutral">
        <h3>No instructions found</h3>
        <p>Try a different search term or adjust filters</p>
      </div>
    `;
  }

  return items
    .map((item) => {
      const applyToText = Array.isArray(item.applyTo)
        ? item.applyTo.join(', ')
        : item.applyTo;
      const titleHtml =
        query && highlightTitle
          ? highlightTitle(item.title, query)
          : escapeHtml(item.title);

      return `
        <article class="ds-card resource-item" data-color="neutral" data-path="${escapeHtml(item.path)}" role="listitem">
          <button type="button" class="resource-preview">
            <div class="resource-info">
              <div class="resource-title">${titleHtml}</div>
              <div class="resource-description">${escapeHtml(item.description || 'No description')}</div>
              <div class="resource-meta">
                ${applyToText ? `<span class="ds-tag resource-tag" data-variant="outline">applies to: ${escapeHtml(applyToText)}</span>` : ''}
                ${item.extensions?.slice(0, 4).map((extension) => `<span class="ds-tag resource-tag tag-extension" data-color="success">${escapeHtml(extension)}</span>`).join('') || ''}
                ${item.extensions && item.extensions.length > 4 ? `<span class="ds-tag resource-tag" data-variant="outline">+${item.extensions.length - 4} more</span>` : ''}
                ${getLastUpdatedHtml(item.lastUpdated)}
              </div>
            </div>
          </button>
          <div class="resource-actions">
            ${getInstallDropdownHtml('instructions', item.path, true)}
            ${getActionButtonsHtml(item.path, true)}
            <a href="${getGitHubUrl(item.path)}" class="ds-button" data-variant="secondary" data-size="sm" target="_blank" onclick="event.stopPropagation()" title="View on GitHub">
              GitHub
            </a>
          </div>
        </article>
      `;
    })
    .join('');
}
