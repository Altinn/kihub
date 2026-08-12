import { describe, expect, it } from 'vitest';
import type { ArtifactManifest } from '@kihub/artifact-schema';
import { reconcile, type PayloadLike } from '../src/reconcile';
import type { RawArtifact } from '../src/scan';

function manifest(id: string): ArtifactManifest {
  return {
    id,
    type: 'skill',
    name: id,
    version: '1.0.0',
    description: 'x',
    owner: { team: 't', contact: 'a@b.no' },
    source: { provider: 'github', repository: 'digdir/ai-artifacts', path: `skills/${id}` },
    visibility: 'internal',
    lifecycle: { status: 'draft' },
    schemaVersion: '1.1.0',
  };
}

const valid = (id: string): RawArtifact => ({ path: `skills/${id}`, manifest: manifest(id), valid: true });

const SRC_A = 1;
const SRC_B = 2;

/** Recursive where-matcher for the two shapes reconcile uses: `{field:{equals}}` and `{and:[…]}`. */
function rowMatches(row: Record<string, unknown>, where: unknown): boolean {
  const w = (where ?? {}) as Record<string, unknown>;
  if (Array.isArray(w.and)) return w.and.every((clause) => rowMatches(row, clause));
  for (const [field, cond] of Object.entries(w)) {
    if (cond && typeof cond === 'object' && 'equals' in (cond as object)) {
      if (row[field] !== (cond as { equals: unknown }).equals) return false;
    }
  }
  return true;
}

/** In-memory fake of the Payload Local API surface reconcile uses (incl. and:/depth). */
function fakePayload(seed: Array<Record<string, unknown>> = []) {
  const rows: Array<Record<string, unknown> & { id: number }> = [];
  let seq = 1;
  for (const s of seed) rows.push({ id: seq++, ...s });
  const payload: PayloadLike = {
    async find({ where }: any) {
      return { docs: rows.filter((r) => rowMatches(r, where)) };
    },
    async create({ data }: any) {
      const row = { id: seq++, ...(data as object) } as any;
      rows.push(row);
      return row;
    },
    async update({ id, data }: any) {
      const row = rows.find((r) => r.id === id);
      if (row) Object.assign(row, data);
      return row;
    },
  };
  return { payload, rows };
}

const byId = (rows: Array<Record<string, unknown>>, artifactId: string) =>
  rows.find((r) => r.artifactId === artifactId);

describe('reconcile (source-scoped)', () => {
  it('creates new records on first run, stamped with the scanned source', async () => {
    const { payload, rows } = fakePayload();
    const report = await reconcile(payload, [valid('digdir.a'), valid('digdir.b')], { sourceId: SRC_A });
    expect(report.created.sort()).toEqual(['digdir.a', 'digdir.b']);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.active)).toBe(true);
    expect(rows.every((r) => r.discoverySource === SRC_A)).toBe(true);
  });

  it('updates in place on re-run (no duplicates)', async () => {
    const { payload, rows } = fakePayload();
    await reconcile(payload, [valid('digdir.a')], { sourceId: SRC_A });
    const report = await reconcile(payload, [valid('digdir.a')], { sourceId: SRC_A });
    expect(report.updated).toEqual(['digdir.a']);
    expect(report.created).toEqual([]);
    expect(report.adopted).toEqual([]);
    expect(report.reassigned).toEqual([]);
    expect(rows).toHaveLength(1);
  });

  it('soft-deactivates artifacts removed from the repo — but only its own source’s', async () => {
    const { payload, rows } = fakePayload();
    await reconcile(payload, [valid('digdir.a'), valid('digdir.b')], { sourceId: SRC_A });
    await reconcile(payload, [valid('digdir.other')], { sourceId: SRC_B });
    const report = await reconcile(payload, [valid('digdir.a')], { sourceId: SRC_A });
    expect(report.deactivated).toEqual(['digdir.b']);
    expect(byId(rows, 'digdir.b')?.active).toBe(false);
    expect(byId(rows, 'digdir.a')?.active).toBe(true);
    // Source B's artifact is untouched by A's scan (FR-002).
    expect(byId(rows, 'digdir.other')?.active).toBe(true);
  });

  it('never deactivates unowned (legacy) rows', async () => {
    const { payload, rows } = fakePayload([
      { artifactId: 'digdir.legacy', active: true, discoverySource: null },
    ]);
    const report = await reconcile(payload, [valid('digdir.a')], { sourceId: SRC_A });
    expect(report.deactivated).toEqual([]);
    expect(byId(rows, 'digdir.legacy')?.active).toBe(true);
    expect(byId(rows, 'digdir.legacy')?.discoverySource).toBeNull();
  });

  it('adopts a previously-unowned row when its id is found (reported in `adopted`)', async () => {
    const { payload, rows } = fakePayload([
      { artifactId: 'digdir.a', active: true, discoverySource: null },
    ]);
    const report = await reconcile(payload, [valid('digdir.a')], { sourceId: SRC_A });
    expect(report.updated).toEqual(['digdir.a']);
    expect(report.adopted).toEqual(['digdir.a']);
    expect(report.reassigned).toEqual([]);
    expect(byId(rows, 'digdir.a')?.discoverySource).toBe(SRC_A);
  });

  it('reassigns a row owned by another source (reported in `reassigned`, ownership-by-last-sighting)', async () => {
    const { payload, rows } = fakePayload([
      { artifactId: 'digdir.a', active: true, discoverySource: SRC_B },
    ]);
    const report = await reconcile(payload, [valid('digdir.a')], { sourceId: SRC_A });
    expect(report.reassigned).toEqual(['digdir.a']);
    expect(report.adopted).toEqual([]);
    expect(byId(rows, 'digdir.a')?.discoverySource).toBe(SRC_A);
    // …and B's next empty scan no longer touches it (it is A's now).
    const bReport = await reconcile(payload, [], { sourceId: SRC_B });
    expect(bReport.deactivated).toEqual([]);
    expect(byId(rows, 'digdir.a')?.active).toBe(true);
  });

  it('reads populated relationship values (object with id) as the owner', async () => {
    const { payload, rows } = fakePayload([
      { artifactId: 'digdir.a', active: true, discoverySource: { id: SRC_A } },
    ]);
    const report = await reconcile(payload, [valid('digdir.a')], { sourceId: SRC_A });
    expect(report.adopted).toEqual([]);
    expect(report.reassigned).toEqual([]);
    expect(byId(rows, 'digdir.a')?.discoverySource).toBe(SRC_A);
  });

  it('break-glass mode (sourceId: null): leaves ownership untouched and deactivates nothing', async () => {
    const { payload, rows } = fakePayload([
      { artifactId: 'digdir.owned', active: true, discoverySource: SRC_B },
      { artifactId: 'digdir.gone', active: true, discoverySource: SRC_B },
    ]);
    const report = await reconcile(payload, [valid('digdir.owned'), valid('digdir.new')], {
      sourceId: null,
    });
    expect(report.created).toEqual(['digdir.new']);
    expect(report.deactivated).toEqual([]);
    expect(report.adopted).toEqual([]);
    expect(report.reassigned).toEqual([]);
    // Existing ownership is preserved; the new row is unowned.
    expect(byId(rows, 'digdir.owned')?.discoverySource).toBe(SRC_B);
    expect(byId(rows, 'digdir.new')?.discoverySource ?? null).toBeNull();
    expect(byId(rows, 'digdir.gone')?.active).toBe(true);
  });

  it('detects duplicate ids in one run (first wins)', async () => {
    const { payload, rows } = fakePayload();
    const report = await reconcile(payload, [valid('digdir.a'), valid('digdir.a')], { sourceId: SRC_A });
    expect(report.created).toEqual(['digdir.a']);
    expect(report.duplicates).toEqual(['digdir.a']);
    expect(rows).toHaveLength(1);
  });

  it('stores, clears, and reports agent cards through the full lifecycle (015 US3)', async () => {
    const { payload, rows } = fakePayload();
    const agent = (card?: Record<string, unknown>, cardErrors?: string[]): RawArtifact => ({
      path: 'agents/a',
      manifest: { ...manifest('digdir.agent'), type: 'agent' },
      valid: true,
      ...(card ? { agentCard: card } : {}),
      ...(cardErrors ? { agentCardErrors: cardErrors } : {}),
    });

    // Valid card → stored.
    let report = await reconcile(payload, [agent({ name: 'A' })], { sourceId: SRC_A });
    expect(report.cardIssues).toEqual([]);
    expect(byId(rows, 'digdir.agent')?.agentCard).toEqual({ name: 'A' });

    // Invalid card → cleared + reported per path; the artifact stays registered/active.
    report = await reconcile(payload, [agent(undefined, ['name: required'])], { sourceId: SRC_A });
    expect(report.updated).toEqual(['digdir.agent']);
    expect(report.cardIssues).toEqual([{ path: 'agents/a', errors: ['name: required'] }]);
    expect(byId(rows, 'digdir.agent')?.agentCard).toBeNull();
    expect(byId(rows, 'digdir.agent')?.active).toBe(true);

    // Card restored, then file removed → cleared again, no issues.
    await reconcile(payload, [agent({ name: 'A2' })], { sourceId: SRC_A });
    expect(byId(rows, 'digdir.agent')?.agentCard).toEqual({ name: 'A2' });
    report = await reconcile(payload, [agent()], { sourceId: SRC_A });
    expect(report.cardIssues).toEqual([]);
    expect(byId(rows, 'digdir.agent')?.agentCard).toBeNull();
  });

  it('a type change away from agent clears any stale card (analyze C2)', async () => {
    const { payload, rows } = fakePayload();
    await reconcile(
      payload,
      [{ path: 'agents/x', manifest: { ...manifest('digdir.x'), type: 'agent' }, valid: true, agentCard: { name: 'X' } }],
      { sourceId: SRC_A },
    );
    expect(byId(rows, 'digdir.x')?.agentCard).toEqual({ name: 'X' });

    // Same id re-registered as a skill (from skills/) — the card must not survive.
    await reconcile(payload, [valid('digdir.x')], { sourceId: SRC_A });
    expect(byId(rows, 'digdir.x')?.agentCard).toBeNull();
  });

  it('passes through invalid manifests as skipped', async () => {
    const { payload } = fakePayload();
    const report = await reconcile(
      payload,
      [valid('digdir.a'), { path: 'prompts/bad', valid: false, errors: ['type: invalid'] }],
      { sourceId: SRC_A },
    );
    expect(report.created).toEqual(['digdir.a']);
    expect(report.skippedInvalid).toEqual([{ path: 'prompts/bad', errors: ['type: invalid'] }]);
  });
});
