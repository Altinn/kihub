import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listArtifacts } from '@/lib/catalog';

/**
 * T015b — filter correctness for `listArtifacts` (SC-007) against live Payload. Seeds a small,
 * known set (including an inactive record) and asserts each filter returns exactly the right ids.
 */
let payload: Payload;

const seed: Array<{
  artifactId: string;
  type: 'skill' | 'prompt';
  name: string;
  description: string;
  version: string;
  tags: string[];
  active: boolean;
}> = [
  { artifactId: 'digdir.ft-skill-a', type: 'skill', name: 'A', description: 'x', version: '1.0.0', tags: ['security', 'review'], active: true },
  { artifactId: 'digdir.ft-skill-b', type: 'skill', name: 'B', description: 'x', version: '1.0.0', tags: ['review'], active: true },
  { artifactId: 'digdir.ft-prompt-c', type: 'prompt', name: 'C', description: 'x', version: '1.0.0', tags: ['security'], active: true },
  { artifactId: 'digdir.ft-inactive-d', type: 'skill', name: 'D', description: 'x', version: '1.0.0', tags: ['security'], active: false },
];

async function wipe() {
  await payload.delete({ collection: 'artifacts', where: { id: { exists: true } }, overrideAccess: true });
}

const ids = (docs: Array<{ artifactId: string }>) => docs.map((d) => d.artifactId).sort();

beforeAll(async () => {
  payload = await getPayload({ config });
  await wipe();
  for (const data of seed) await payload.create({ collection: 'artifacts', data, overrideAccess: true });
}, 120000);

afterAll(async () => {
  if (payload) await wipe();
});

describe('listArtifacts filter correctness (T015b / SC-007)', () => {
  it('lists all active artifacts (excludes inactive) with no filters', async () => {
    expect(ids(await listArtifacts())).toEqual(['digdir.ft-prompt-c', 'digdir.ft-skill-a', 'digdir.ft-skill-b']);
  });

  it('filters by type', async () => {
    expect(ids(await listArtifacts({ type: 'skill' }))).toEqual(['digdir.ft-skill-a', 'digdir.ft-skill-b']);
    expect(ids(await listArtifacts({ type: 'prompt' }))).toEqual(['digdir.ft-prompt-c']);
  });

  it('filters by a single tag', async () => {
    expect(ids(await listArtifacts({ tags: ['security'] }))).toEqual(['digdir.ft-prompt-c', 'digdir.ft-skill-a']);
  });

  it('combines type + tag (AND)', async () => {
    expect(ids(await listArtifacts({ type: 'skill', tags: ['security'] }))).toEqual(['digdir.ft-skill-a']);
  });

  it('requires all tags when multiple are given (AND)', async () => {
    expect(ids(await listArtifacts({ tags: ['security', 'review'] }))).toEqual(['digdir.ft-skill-a']);
  });

  it('treats category as type-derived (alias of type)', async () => {
    expect(ids(await listArtifacts({ category: 'prompt' }))).toEqual(['digdir.ft-prompt-c']);
  });

  it('returns empty for a no-match combination (not an error)', async () => {
    expect(await listArtifacts({ type: 'prompt', tags: ['review'] })).toEqual([]);
  });
});
