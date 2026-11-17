import { ARTIFACT_TYPES } from '@kihub/artifact-schema';

/** Manifest artifact type (`skill`, `agent`, …). */
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

/** Type directories of the root layout, walked below every configured artifact root. */
export const TYPE_DIRS = [
  'skills',
  'prompts',
  'workflows',
  'mcp',
  'templates',
  'policies',
  'playbooks',
  'agents',
] as const;

export type TypeDir = (typeof TYPE_DIRS)[number];

/** The type directory each artifact type lives under in the root layout (015 manifest rule 4). */
export const DIR_FOR_TYPE: Record<ArtifactType, TypeDir> = {
  skill: 'skills',
  prompt: 'prompts',
  workflow: 'workflows',
  mcp: 'mcp',
  template: 'templates',
  policy: 'policies',
  playbook: 'playbooks',
  agent: 'agents',
};

/** Inverse of {@link DIR_FOR_TYPE}: the type a root-layout type directory implies. */
export const TYPE_FOR_DIR: Record<TypeDir, ArtifactType> = {
  skills: 'skill',
  prompts: 'prompt',
  workflows: 'workflow',
  mcp: 'mcp',
  templates: 'template',
  policies: 'policy',
  playbooks: 'playbook',
  agents: 'agent',
};
