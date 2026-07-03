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
    schemaVersion: '1.0.0',
  };
}

const valid = (id: string): RawArtifact => ({ path: `skills/${id}`, manifest: manifest(id), valid: true });

/** In-memory fake of the Payload Local API surface reconcile uses. */
function fakePayload() {
  const rows: Array<Record<string, unknown> & { id: number; artifactId: string; active: boolean }> = [];
  let seq = 1;
  const payload: PayloadLike = {
    async find({ where }: any) {
      let docs = rows as any[];
      const w = where ?? {};
      if (w.artifactId?.equals) docs = docs.filter((r) => r.artifactId === w.artifactId.equals);
      if (w.active?.equals !== undefined) docs = docs.filter((r) => r.active === w.active.equals);
      return { docs };
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

describe('reconcile', () => {
  it('creates new records on first run', async () => {
    const { payload, rows } = fakePayload();
    const report = await reconcile(payload, [valid('digdir.a'), valid('digdir.b')]);
    expect(report.created.sort()).toEqual(['digdir.a', 'digdir.b']);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.active)).toBe(true);
  });

  it('updates in place on re-run (no duplicates)', async () => {
    const { payload, rows } = fakePayload();
    await reconcile(payload, [valid('digdir.a')]);
    const report = await reconcile(payload, [valid('digdir.a')]);
    expect(report.updated).toEqual(['digdir.a']);
    expect(report.created).toEqual([]);
    expect(rows).toHaveLength(1);
  });

  it('soft-deactivates artifacts removed from the repo', async () => {
    const { payload, rows } = fakePayload();
    await reconcile(payload, [valid('digdir.a'), valid('digdir.b')]);
    const report = await reconcile(payload, [valid('digdir.a')]);
    expect(report.deactivated).toEqual(['digdir.b']);
    expect(rows.find((r) => r.artifactId === 'digdir.b')?.active).toBe(false);
    expect(rows.find((r) => r.artifactId === 'digdir.a')?.active).toBe(true);
  });

  it('detects duplicate ids in one run (first wins)', async () => {
    const { payload, rows } = fakePayload();
    const report = await reconcile(payload, [valid('digdir.a'), valid('digdir.a')]);
    expect(report.created).toEqual(['digdir.a']);
    expect(report.duplicates).toEqual(['digdir.a']);
    expect(rows).toHaveLength(1);
  });

  it('passes through invalid manifests as skipped', async () => {
    const { payload } = fakePayload();
    const report = await reconcile(payload, [
      valid('digdir.a'),
      { path: 'prompts/bad', valid: false, errors: ['type: invalid'] },
    ]);
    expect(report.created).toEqual(['digdir.a']);
    expect(report.skippedInvalid).toEqual([{ path: 'prompts/bad', errors: ['type: invalid'] }]);
  });
});
