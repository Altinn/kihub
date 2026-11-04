/**
 * Shared `status: published` filter for native-content read layers (News, Learning, Projects,
 * ...). Every read-layer function that lists or resolves employee-facing content ANDs this in,
 * so a draft can never leak through — the collection's own `access.read` rule is the second line
 * of defense.
 */
export const PUBLISHED = { status: { equals: 'published' } } as const;

/** The id of a relationship value, whether Payload hands it over as a scalar or populated `{ id }`. */
export function relationshipId(value: unknown): number | string | undefined {
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'number' || typeof id === 'string') return id;
  }
  return undefined;
}
