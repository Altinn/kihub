import { z } from 'zod';

/** Allowed artifact types — the single generic artifact is differentiated by `type` (Principle III). */
export const ARTIFACT_TYPES = [
  'skill',
  'prompt',
  'workflow',
  'mcp',
  'template',
  'policy',
  'playbook',
] as const;

/** Allowed lifecycle states (Principle VI / governance). */
export const LIFECYCLE_STATUSES = [
  'draft',
  'experimental',
  'in-review',
  'approved',
  'recommended',
  'deprecated',
  'archived',
] as const;

/** Allowed visibility values. Only `internal` is used in Phase 1; others reserved. */
export const VISIBILITIES = ['internal', 'public', 'restricted'] as const;

/** Reverse-DNS `org.slug` identity (Principle IV) — lowercase, repository-independent. */
export const ARTIFACT_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const TAG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The `artifact.yaml` manifest contract (schema version 1.0.0). See docs/artifact-manifest.md. */
export const artifactManifestSchema = z
  .object({
    id: z
      .string()
      .regex(
        ARTIFACT_ID_PATTERN,
        'must be a reverse-DNS org.slug id, lowercase (e.g. "digdir.security-review")',
      ),
    type: z.enum(ARTIFACT_TYPES),
    name: z.string().min(1),
    version: z
      .string()
      .regex(SEMVER_PATTERN, 'must be a semantic version MAJOR.MINOR.PATCH (e.g. "1.0.0")'),
    description: z.string().min(1),
    owner: z
      .object({
        team: z.string().min(1),
        contact: z.email(),
      })
      .strict(),
    source: z
      .object({
        provider: z.enum(['github']),
        repository: z.string().min(1),
        path: z.string().min(1),
      })
      .strict(),
    install: z
      .object({
        apm: z
          .object({
            package: z.string().min(1),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    tags: z.array(z.string().regex(TAG_PATTERN)).optional(),
    visibility: z.enum(VISIBILITIES),
    lifecycle: z
      .object({
        status: z.enum(LIFECYCLE_STATUSES),
      })
      .strict(),
    schemaVersion: z.string().regex(SEMVER_PATTERN).default('1.0.0'),
  })
  .strict();

export type ArtifactManifest = z.infer<typeof artifactManifestSchema>;
