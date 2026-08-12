import { ARTIFACT_TYPES } from '@kihub/artifact-schema';

/**
 * 015 — pure view constants for the Registry (the lib/events-view.ts pattern): the single source
 * for artifact-type display labels, feeding both the employee-facing UI (filter chips, cards,
 * detail page) and the Payload admin select. No Payload imports — unit-testable in isolation.
 */

export type ArtifactTypeValue = (typeof ARTIFACT_TYPES)[number];

/** Norwegian display labels for every artifact type (FR-010). */
export const ARTIFACT_TYPE_LABELS: Record<ArtifactTypeValue, string> = {
  skill: 'Ferdighet',
  prompt: 'Prompt',
  workflow: 'Arbeidsflyt',
  mcp: 'MCP-server',
  template: 'Mal',
  policy: 'Retningslinje',
  playbook: 'Dreiebok',
  agent: 'Agent',
};

/** The label for a type value; unknown values (defensive) fall back to the raw value. */
export function artifactTypeLabel(type: string): string {
  return (ARTIFACT_TYPE_LABELS as Record<string, string>)[type] ?? type;
}

/** `{ value, label }` options for Payload selects (the events-collection pattern). */
export function artifactTypeOptions(): { value: ArtifactTypeValue; label: string }[] {
  return ARTIFACT_TYPES.map((value) => ({ value, label: ARTIFACT_TYPE_LABELS[value] }));
}
