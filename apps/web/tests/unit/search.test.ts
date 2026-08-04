import { describe, expect, it, vi } from 'vitest';
import { type QueryRunner, searchArtifacts, SEARCH_RESULT_LIMIT, TS_CONFIG } from '@/lib/search';

/**
 * T005 — unit tests for `searchArtifacts` query building + mapping, with the SQL runner and the
 * governance resolver injected so no database is needed. Asserts injection-safe parameter binding,
 * the `english` full-text config, empty-query short-circuit, and row→id mapping in rank order.
 */
describe('searchArtifacts (unit, injected deps)', () => {
  it('short-circuits an empty/whitespace query to [] without touching the runner or resolver', async () => {
    const runner = vi.fn();
    const resolve = vi.fn();
    expect(await searchArtifacts('', {}, { runner, resolve })).toEqual([]);
    expect(await searchArtifacts('   ', {}, { runner, resolve })).toEqual([]);
    expect(runner).not.toHaveBeenCalled();
    expect(resolve).not.toHaveBeenCalled();
  });

  it('binds the user text as a parameter (never interpolated) and uses websearch_to_tsquery/english', async () => {
    const runner = vi.fn<QueryRunner>(async () => ({ rows: [] }));
    const resolve = vi.fn(async () => []);
    const evil = "'; DROP TABLE artifacts; --";
    await searchArtifacts(evil, {}, { runner, resolve });

    const [sql, values] = runner.mock.calls[0]!;
    expect(sql).toContain('websearch_to_tsquery');
    expect(sql).toContain(`'${TS_CONFIG}'`); // english
    expect(sql).not.toContain(evil); // the query text is NOT in the SQL string
    expect(values[0]).toBe(evil); // it is bound as $1
    expect(values[1]).toBe(SEARCH_RESULT_LIMIT); // $2
  });

  it('maps result rows to ranked artifact ids (in order) and forwards filters to the resolver', async () => {
    const runner = vi.fn(async () => ({
      rows: [
        { artifact_id: 'digdir.b', rank: 0.9 },
        { artifact_id: 'digdir.a', rank: 0.4 },
      ],
    }));
    const resolve = vi.fn(async (ids: string[]) => ids.map((artifactId) => ({ artifactId })) as never);

    const filters = { type: 'skill', tags: ['security'] };
    const out = await searchArtifacts('security', filters, { runner, resolve });

    expect(resolve).toHaveBeenCalledWith(['digdir.b', 'digdir.a'], filters);
    expect(out.map((d) => (d as { artifactId: string }).artifactId)).toEqual(['digdir.b', 'digdir.a']);
  });

  it('returns [] when the query matches no rows (no resolver call)', async () => {
    const runner = vi.fn(async () => ({ rows: [] }));
    const resolve = vi.fn(async () => []);
    expect(await searchArtifacts('nomatch', {}, { runner, resolve })).toEqual([]);
    expect(resolve).not.toHaveBeenCalled();
  });
});
