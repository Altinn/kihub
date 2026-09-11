/**
 * Shared `status: published` filter for native-content read layers (News, Learning, Projects,
 * ...). Every read-layer function that lists or resolves employee-facing content ANDs this in,
 * so a draft can never leak through — the collection's own `access.read` rule is the second line
 * of defense.
 */
export const PUBLISHED = { status: { equals: 'published' } } as const;
