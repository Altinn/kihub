import { parse as parseYaml } from 'yaml';
import { type ArtifactManifest, artifactManifestSchema } from './schema';

export type ValidationResult =
  | { valid: true; data: ArtifactManifest }
  | { valid: false; errors: string[] };

/**
 * Validate an artifact manifest against the schema. Accepts either raw YAML text
 * (as read from an artifact.yaml file) or an already-parsed object.
 * Returns a clear valid/invalid result; errors identify the offending field and reason.
 */
export function validateManifest(source: string | unknown): ValidationResult {
  let raw: unknown = source;

  if (typeof source === 'string') {
    try {
      raw = parseYaml(source);
    } catch (err) {
      return { valid: false, errors: [`YAML parse error: ${(err as Error).message}`] };
    }
  }

  const result = artifactManifestSchema.safeParse(raw);
  if (result.success) {
    return { valid: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : '(root)';
    return `${path}: ${issue.message}`;
  });
  return { valid: false, errors };
}
