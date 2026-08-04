import config from '@payload-config';
import { getPayload } from 'payload';
import type { Artifact } from '@/payload-types';
import { type CatalogFilters, resolveByArtifactIds } from '@/lib/catalog';

/**
 * Phase 5 — Full-text search over the catalog.
 *
 * This phase adds NO new dependency, env var, collection, field, migration, or external service:
 * it runs a parameterized PostgreSQL full-text query over the live `artifacts` rows (built inline
 * from the existing `name`/`description`/`readme` columns) on the pg pool the app already reaches,
 * then resolves the ranked ids through the existing catalog governance rules. Semantic / embeddings
 * / Qdrant are deferred to a later phase (Constitution Principle VII: "full-text search first").
 */

/** Max candidate rows the SQL returns before governance resolution/filtering. */
export const SEARCH_RESULT_LIMIT = 50;

/**
 * Text-search configuration. The searched content (artifact name/description/README) is English —
 * all catalogued tools/artifacts are authored in English; the Norwegian application UI is chrome,
 * not searchable content. `english` gives stemming/stopwords for better English recall. See
 * research §3.
 */
export const TS_CONFIG = 'english';

export interface SearchQuery extends CatalogFilters {
  /** Raw free-text query from the `q` URL param. */
  q: string;
}

/** A candidate row from the full-text query: a stable artifact id and its `ts_rank`. */
export interface RankedId {
  artifactId: string;
  rank: number;
}

/** Runs a parameterized SQL query; returns the raw rows. Injectable for unit tests. */
export type QueryRunner = (
  text: string,
  values: unknown[],
) => Promise<{ rows: Array<Record<string, unknown>> }>;

export interface SearchDeps {
  /** Override the SQL runner (tests). Defaults to the Payload pg pool. */
  runner?: QueryRunner;
  /** Override id → docs resolution (tests). Defaults to the catalog governance resolver. */
  resolve?: (ids: string[], filters: CatalogFilters) => Promise<Artifact[]>;
}

// Built inline (no persisted tsvector column / GIN index this phase — a seq scan is instant at the
// catalog's scale; indexing is a documented later step). `websearch_to_tsquery` accepts arbitrary
// user text without ever raising a syntax error, and the text is bound as a parameter, so the query
// is injection-safe and syntax-error-safe (FR-008).
const DOC = `to_tsvector('${TS_CONFIG}', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(readme,''))`;
const SEARCH_SQL = `SELECT artifact_id,
       ts_rank(${DOC}, websearch_to_tsquery('${TS_CONFIG}', $1)) AS rank
FROM artifacts
WHERE active = true
  AND ${DOC} @@ websearch_to_tsquery('${TS_CONFIG}', $1)
ORDER BY rank DESC
LIMIT $2`;

async function defaultRunner(text: string, values: unknown[]) {
  const payload = await getPayload({ config });
  const pool = (payload.db as unknown as { pool: { query: QueryRunner } }).pool;
  return pool.query(text, values);
}

/**
 * Full-text search: find active artifacts whose name/description/README match `q`, ranked by
 * relevance, then resolve/authorize the ranked ids through the existing catalog rules (active +
 * visibility) and combine with the existing type/tag/category filters. Returns `[]` for an
 * empty/whitespace query (the caller shows browse). See contracts/fulltext-query.md.
 */
export async function searchArtifacts(
  q: string,
  filters: CatalogFilters = {},
  deps: SearchDeps = {},
): Promise<Artifact[]> {
  const query = q?.trim();
  if (!query) return [];

  const runner = deps.runner ?? defaultRunner;
  const resolve = deps.resolve ?? resolveByArtifactIds;

  const { rows } = await runner(SEARCH_SQL, [query, SEARCH_RESULT_LIMIT]);
  const ids = rows.map((r) => r.artifact_id as string);
  if (ids.length === 0) return [];

  return resolve(ids, filters);
}
