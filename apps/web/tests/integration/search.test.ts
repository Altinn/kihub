import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { searchArtifacts } from '@/lib/search';
import { wipeArtifacts } from '../helpers/wipe';

/**
 * T003 / T008 — full-text search behavior against live Payload + Postgres. Seeds artifacts with
 * distinctive terms in each searchable field, then asserts: matches in name/description/README,
 * no-match empty, deactivated exclusion (governance-safe), English stemming, query safety, filter
 * combination, and freshness after an in-place edit.
 */
let payload: Payload;

const seed: Array<{
  artifactId: string;
  type: 'skill' | 'prompt';
  name: string;
  description: string;
  readme?: string;
  version: string;
  tags: string[];
  active: boolean;
}> = [
  // Distinctive term in exactly one field each:
  { artifactId: 'digdir.ft-name', type: 'skill', name: 'Quokka Analyzer', description: 'd', readme: 'r', version: '1.0.0', tags: ['alpha'], active: true },
  { artifactId: 'digdir.ft-desc', type: 'skill', name: 'N2', description: 'a platypus workflow', readme: 'r2', version: '1.0.0', tags: ['alpha'], active: true },
  { artifactId: 'digdir.ft-readme', type: 'skill', name: 'N3', description: 'd3', readme: 'the narwhal appears only here', version: '1.0.0', tags: ['alpha'], active: true },
  // Deactivated but would match "wombat":
  { artifactId: 'digdir.ft-inactive', type: 'skill', name: 'Wombat', description: 'd', version: '1.0.0', tags: ['alpha'], active: false },
  // English stemming: content has "reviewing"/"reviews", a "review" query should match:
  { artifactId: 'digdir.ft-stem', type: 'skill', name: 'PR helper', description: 'assists with reviewing and reviews of pull requests', version: '1.0.0', tags: ['alpha'], active: true },
  // Shared term "gamma" across two types + tags, for filter-combination:
  { artifactId: 'digdir.ft-gamma-skill', type: 'skill', name: 'G1', description: 'gamma tooling', version: '1.0.0', tags: ['x'], active: true },
  { artifactId: 'digdir.ft-gamma-prompt', type: 'prompt', name: 'G2', description: 'gamma tooling', version: '1.0.0', tags: ['y'], active: true },
  // For the freshness test (edited in place below):
  { artifactId: 'digdir.ft-fresh', type: 'skill', name: 'Fresh', description: 'originalterm content', version: '1.0.0', tags: ['alpha'], active: true },
];

async function wipe() {
  await wipeArtifacts(payload);
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

describe('full-text search — US1 (T003)', () => {
  it('matches a term in the name (FR-001/003)', async () => {
    expect(ids(await searchArtifacts('quokka'))).toEqual(['digdir.ft-name']);
  });

  it('matches a term that appears only in the description (FR-003)', async () => {
    expect(ids(await searchArtifacts('platypus'))).toEqual(['digdir.ft-desc']);
  });

  it('matches a term that appears only in the README (FR-002/003)', async () => {
    expect(ids(await searchArtifacts('narwhal'))).toEqual(['digdir.ft-readme']);
  });

  it('returns [] for a query that matches nothing (FR-004, SC-002)', async () => {
    expect(await searchArtifacts('supercalifragilistic')).toEqual([]);
  });

  it('never returns a deactivated artifact even if it matches (FR-009/010, SC-003)', async () => {
    expect(await searchArtifacts('wombat')).toEqual([]);
  });

  it('matches English morphological variants via stemming (FR-018)', async () => {
    // content has "reviewing"/"reviews"; a "review" query should match.
    expect(ids(await searchArtifacts('review'))).toContain('digdir.ft-stem');
  });

  it('handles punctuation / operators / very long queries without error (FR-008)', async () => {
    await expect(searchArtifacts('"unterminated quote )( a:b:c -narwhal')).resolves.toBeInstanceOf(Array);
    await expect(searchArtifacts('quokka '.repeat(200))).resolves.toBeInstanceOf(Array);
  });

  it('returns each matching artifact at most once (FR-006)', async () => {
    const out = ids(await searchArtifacts('gamma'));
    expect(out).toEqual([...new Set(out)]);
    expect(out).toEqual(['digdir.ft-gamma-prompt', 'digdir.ft-gamma-skill']);
  });
});

describe('full-text search — US2 filters & freshness (T008)', () => {
  it('combines a query with a type filter (FR-012)', async () => {
    expect(ids(await searchArtifacts('gamma', { type: 'skill' }))).toEqual(['digdir.ft-gamma-skill']);
    expect(ids(await searchArtifacts('gamma', { type: 'prompt' }))).toEqual(['digdir.ft-gamma-prompt']);
  });

  it('combines a query with a tag filter (FR-012)', async () => {
    expect(ids(await searchArtifacts('gamma', { tags: ['y'] }))).toEqual(['digdir.ft-gamma-prompt']);
  });

  it('reflects an in-place content edit with no separate index step (FR-014, SC-004)', async () => {
    // Before: matches its original term, not the new one.
    expect(ids(await searchArtifacts('originalterm'))).toEqual(['digdir.ft-fresh']);
    expect(await searchArtifacts('deltaterm')).toEqual([]);

    // Simulate a discovery re-index updating the row in place.
    const existing = await payload.find({
      collection: 'artifacts',
      where: { artifactId: { equals: 'digdir.ft-fresh' } },
      overrideAccess: true,
    });
    await payload.update({
      collection: 'artifacts',
      id: existing.docs[0]!.id,
      data: { description: 'deltaterm content' },
      overrideAccess: true,
    });

    // After: matches the new term, no longer the old — no separate search-index build.
    expect(ids(await searchArtifacts('deltaterm'))).toEqual(['digdir.ft-fresh']);
    expect(await searchArtifacts('originalterm')).toEqual([]);
  });
});
