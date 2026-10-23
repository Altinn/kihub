import type { Color, SeverityColors } from '@digdir/designsystemet-types';
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

/* ---------- 026 — Norwegian governance labels (FR-016) ---------- */

export type LifecycleValue =
  | 'draft'
  | 'experimental'
  | 'in-review'
  | 'approved'
  | 'recommended'
  | 'deprecated'
  | 'archived';

/** A `ds-tag`'s `data-color`: one of the theme's colours (typed by design-tokens-build/types.d.ts). */
export type TagColor = Color | SeverityColors;

export const LIFECYCLE_LABELS: Record<LifecycleValue, string> = {
  draft: 'Utkast',
  experimental: 'Eksperimentell',
  'in-review': 'Til vurdering',
  approved: 'Godkjent',
  recommended: 'Anbefalt',
  deprecated: 'Utfaset',
  archived: 'Arkivert',
};

const LIFECYCLE_COLORS: Record<LifecycleValue, TagColor> = {
  draft: 'neutral',
  experimental: 'info',
  'in-review': 'info',
  approved: 'success',
  recommended: 'success',
  deprecated: 'warning',
  archived: 'danger',
};

export const APPROVAL_LABELS: Record<'not-approved' | 'approved' | 'rejected', string> = {
  'not-approved': 'Ikke godkjent',
  approved: 'Godkjent',
  rejected: 'Avvist',
};

export const REVIEW_STATUS_LABELS: Record<'not-submitted' | 'in-review', string> = {
  'not-submitted': 'Ikke sendt inn',
  'in-review': 'Til vurdering',
};

export const RISK_LABELS: Record<string, string> = { low: 'Lav', medium: 'Middels', high: 'Høy' };

export const REVIEW_TYPE_LABELS: Record<string, string> = {
  security: 'Sikkerhet',
  'privacy-gdpr': 'Personvern (GDPR)',
  technical: 'Teknisk',
  accessibility: 'Universell utforming',
  'responsible-ai': 'Ansvarlig KI',
  operational: 'Drift',
};

export const REVIEW_DECISION_LABELS: Record<string, string> = {
  approved: 'Godkjent',
  'changes-requested': 'Endringer ønsket',
  rejected: 'Avvist',
};

export const VISIBILITY_LABELS: Record<string, string> = {
  internal: 'Intern',
  public: 'Offentlig',
  restricted: 'Begrenset',
};

/** A label from one of the maps above; unknown values (defensive) fall back to the raw value. */
export function labelFor(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return '—';
  return map[value] ?? value;
}

/**
 * The lifecycle tags for an artifact: its lifecycle state, plus "Godkjent"/"Anbefalt" when approval
 * or the recommended flag adds information. Never the same label twice (an approved artifact with
 * approval state `approved` shows one "Godkjent", not two).
 */
export function lifecycleTags(governance: {
  lifecycleState: LifecycleValue;
  approvalState: 'not-approved' | 'approved' | 'rejected';
  recommended?: boolean | null;
}): { label: string; color: TagColor }[] {
  const tags = [
    { label: LIFECYCLE_LABELS[governance.lifecycleState], color: LIFECYCLE_COLORS[governance.lifecycleState] },
  ];
  if (governance.approvalState === 'approved') tags.push({ label: APPROVAL_LABELS.approved, color: 'success' });
  if (governance.recommended) tags.push({ label: LIFECYCLE_LABELS.recommended, color: 'success' });
  return tags.filter((tag, index) => tags.findIndex((t) => t.label === tag.label) === index);
}

/* ---------- 026 — registry search-param contract (GET filter + search forms) ---------- */

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * `?type=&tag=…&tag=…&q=` as the filter and search forms submit it: one type (the "Alle" radio
 * submits an empty value, meaning none), any number of tags (deduplicated, blanks dropped), and a
 * trimmed query.
 */
export function parseRegistrySearchParams(sp: SearchParams): {
  type?: string;
  tags: string[];
  query: string;
} {
  const type = first(sp.type)?.trim() || undefined;
  const rawTags = Array.isArray(sp.tag) ? sp.tag : sp.tag ? [sp.tag] : [];
  const tags = [...new Set(rawTags.map((t) => t.trim()).filter(Boolean))];
  const query = (first(sp.q) ?? '').trim();
  return { type, tags, query };
}
