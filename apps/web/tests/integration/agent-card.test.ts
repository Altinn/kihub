import config from '@payload-config';
import type { RepoReader } from '@kihub/discovery-core';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runDiscovery } from '@/lib/discovery';
import { wipeArtifacts } from '../helpers/wipe';

/**
 * 015 US3 — the agent-card lifecycle end-to-end (FR-011/012, SC-005): valid card stored →
 * malformed card clears it without blocking the artifact (run carries cardIssues) → removed
 * card stays cleared. A card next to a non-agent is ignored entirely.
 */
let payload: Payload;
let sourceId: number;

const AGENT_ID = 'digdir.itest-carded-agent';

const AGENT_MANIFEST = `id: ${AGENT_ID}
type: agent
name: Carded Agent
version: 1.0.0
description: Agent with a card under test.
owner:
  team: AI Enablement
  contact: ai-team@digdir.no
source:
  provider: github
  repository: digdir/agents-test
  path: agents/carded
visibility: internal
lifecycle:
  status: experimental
`;

const SKILL_MANIFEST = `id: digdir.itest-carded-skill
type: skill
name: Skill With Stray Card
version: 1.0.0
description: Non-agent whose stray card file must be ignored.
owner:
  team: AI Enablement
  contact: ai-team@digdir.no
source:
  provider: github
  repository: digdir/agents-test
  path: skills/stray
visibility: internal
lifecycle:
  status: experimental
`;

const VALID_CARD = JSON.stringify({
  name: 'Carded Agent',
  version: '1.0.0',
  capabilities: { streaming: true },
  skills: [{ id: 'answer', name: 'Answer questions', tags: ['support'] }],
});

/** Reader whose card file content is swappable between scans. */
function reader(cardText: string | undefined): RepoReader {
  return {
    async listArtifactDirs() {
      return ['agents/carded', 'skills/stray'];
    },
    async readFile(relPath) {
      if (relPath === 'agents/carded/artifact.yaml') return AGENT_MANIFEST;
      if (relPath === 'agents/carded/agent-card.json') return cardText;
      if (relPath === 'skills/stray/artifact.yaml') return SKILL_MANIFEST;
      if (relPath === 'skills/stray/agent-card.json') return JSON.stringify({ name: 'Ignore me' });
      return undefined;
    },
  };
}

const scanWith = (cardText: string | undefined) =>
  runDiscovery(payload, sourceId, 'manual', { createReader: () => reader(cardText) });

async function artifactByStableId(artifactId: string) {
  const res = await payload.find({
    collection: 'artifacts',
    where: { artifactId: { equals: artifactId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return res.docs[0] as unknown as Record<string, unknown> | undefined;
}

async function wipeDiscovery() {
  await payload.delete({ collection: 'discovery-runs', where: { id: { exists: true } }, overrideAccess: true });
  await payload.delete({ collection: 'discovery-sources', where: { name: { equals: 'card-src' } }, overrideAccess: true });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await wipeArtifacts(payload);
  await wipeDiscovery();
  const source = await payload.create({
    collection: 'discovery-sources',
    data: {
      name: 'card-src',
      repo: 'digdir/agents-test',
      tokenEnvVar: 'ITEST_UNUSED_TOKEN',
      webhookSecret: 'itest-secret',
      enabled: true,
    },
    overrideAccess: true,
  });
  sourceId = source.id;
}, 120000);

afterAll(async () => {
  if (payload) {
    await wipeArtifacts(payload);
    await wipeDiscovery();
  }
});

describe('agent card lifecycle (015 US3)', () => {
  it('stores a valid card verbatim on scan; the stray non-agent card is ignored', async () => {
    const result = await scanWith(VALID_CARD);
    expect(result.outcome).toBe('success');
    expect(result.report?.cardIssues).toEqual([]);

    const agent = await artifactByStableId(AGENT_ID);
    expect(agent?.agentCard).toEqual(JSON.parse(VALID_CARD));

    const skill = await artifactByStableId('digdir.itest-carded-skill');
    expect(skill?.active).toBe(true);
    expect(skill?.agentCard ?? null).toBeNull();
  });

  it('a malformed card clears the stored one, never blocks the artifact, and is reported on the run', async () => {
    const result = await scanWith('{broken json');
    expect(result.outcome).toBe('success');
    expect(result.report?.updated).toContain(AGENT_ID);
    expect(result.report?.cardIssues).toHaveLength(1);
    expect(result.report?.cardIssues[0]?.path).toBe('agents/carded');

    const agent = await artifactByStableId(AGENT_ID);
    expect(agent?.active).toBe(true);
    expect(agent?.agentCard ?? null).toBeNull();

    const runs = await payload.find({
      collection: 'discovery-runs',
      where: { source: { equals: sourceId } },
      sort: '-startedAt',
      limit: 1,
      overrideAccess: true,
    });
    const run = runs.docs[0]!;
    expect(run.summary?.cardIssues).toBe(1);
    expect(run.cardIssues?.[0]?.path).toBe('agents/carded');
    expect((run.cardIssues?.[0]?.errors ?? []).length).toBeGreaterThan(0);
  });

  it('a removed card stays cleared with no issues reported', async () => {
    const result = await scanWith(undefined);
    expect(result.outcome).toBe('success');
    expect(result.report?.cardIssues).toEqual([]);

    const agent = await artifactByStableId(AGENT_ID);
    expect(agent?.agentCard ?? null).toBeNull();
    expect(agent?.active).toBe(true);
  });
});
