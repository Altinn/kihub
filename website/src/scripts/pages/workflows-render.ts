import {
  escapeHtml,
  getActionButtonsHtml,
  getGitHubUrl,
  getLastUpdatedHtml,
} from '../utils';

export interface RenderableWorkflow {
  title: string;
  description?: string;
  path: string;
  triggers: string[];
  lastUpdated?: string | null;
}

export type WorkflowSortOption = 'title' | 'lastUpdated';

export function sortWorkflows<T extends RenderableWorkflow>(
  items: T[],
  sort: WorkflowSortOption
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

export function renderWorkflowsHtml(
  items: RenderableWorkflow[],
  options: {
    query?: string;
    highlightTitle?: (title: string, query: string) => string;
  } = {}
): string {
  const { query = '', highlightTitle } = options;

  if (items.length === 0) {
    return `
      <div class="ds-card empty-state" data-color="neutral">
        <h3>No workflows found</h3>
        <p>Try a different search term or adjust filters</p>
      </div>
    `;
  }

  return items
    .map((item) => {
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
                ${item.triggers.map((trigger) => `<span class="ds-tag resource-tag tag-trigger" data-color="accent">${escapeHtml(trigger)}</span>`).join('')}
                ${getLastUpdatedHtml(item.lastUpdated)}
              </div>
            </div>
          </button>
          <div class="resource-actions">
            ${getActionButtonsHtml(item.path)}
            <a href="${getGitHubUrl(item.path)}" class="ds-button" data-variant="secondary" data-size="sm" target="_blank" onclick="event.stopPropagation()" title="View on GitHub">GitHub</a>
          </div>
        </article>
      `;
    })
    .join('');
}
