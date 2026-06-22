/**
 * Homepage data hydration.
 */
import { fetchData } from '../utils';

interface ProjectStat {
  id: string;
  label: string;
  value: number | null;
}

interface ProjectSummary {
  stats: ProjectStat[];
}

const numberFormatter = new Intl.NumberFormat('nb-NO');

function formatCount(value: number | null | undefined): string {
  return typeof value === 'number' ? numberFormatter.format(value) : '-';
}

function setText(selector: string, value: string): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    element.textContent = value;
  });
}

export async function initHomepage(): Promise<void> {
  const projectSummary = await fetchData<ProjectSummary>('project-summary.json');

  projectSummary?.stats?.forEach((stat) => {
    setText(`[data-project-stat-value="${stat.id}"]`, formatCount(stat.value));
  });
}

document.addEventListener('DOMContentLoaded', initHomepage);
