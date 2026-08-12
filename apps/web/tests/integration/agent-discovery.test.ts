import config from '@payload-config';
import type { RepoReader } from '@kihub/discovery-core';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listArtifacts } from '@/lib/catalog';
import { runDiscovery } from '@/lib/discovery';
import { searchArtifacts } from '@/lib/search';
import { wipeArtifacts } from '../helpers/wipe';

/**
 * 015 US2 — an agent under agents/<slug>/ registers like every other artifact type: active with
 * type 'agent', listable via the type filter, findable in full-text search (SC-004), and a
 * type↔directory mismatch is reported per path without blocking the rest of the scan.
 */
let payload: Payload;
let sourceId: number;

const AGENT_ID = 'digdir.itest-support-agent';

const AGENT_MANIFEST = `id: ${AGENT_ID}
type: agent
name: Support Copilot
version: 1.0.0
description: Resolves internal support tickets and escalates unresolved issues.
owner:
  team: AI Enablement
  contact: ai-team@digdir.no
source:
  provider: github
  repository: digdir/agents-test
  path: agents/support-copilot
visibility: internal
lifecycle:
  status: experimental
`;

/** Declares agent but lives under skills/ — must be reported invalid, not registered. */
const MISPLACED = AGENT_MANIFEST.replace(`id: ${AGENT_ID}`, 'id: digdir.itest-misplaced');

const reader: RepoReader = {
  async listArtifactDirs() {
    return ['agents/support-copilot', 'skills/misplaced'];
  },
  async readFile(relPath) {
    if (relPath === 'agents/support-copilot/artifact.yaml') return AGENT_MANIFEST;
    if (relPath === 'skills/misplaced/artifact.yaml') return MISPLACED;
    return undefined;
  },
};

async function wipeDiscovery() {
  await payload.delete({ collection: 'discovery-runs', where: { id: { exists: true } }, overrideAccess: true });
  await payload.delete({ collection: 'discovery-sources', where: { name: { equals: 'agent-src' } }, overrideAccess: true });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await wipeArtifacts(payload);
  await wipeDiscovery();
  const source = await payload.create({
    collection: 'discovery-sources',
    data: {
      name: 'agent-src',
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

describe('agent artifacts are first-class registry citizens (015 US2)', () => {
  it('registers an agent from agents/<slug>/ and reports the misplaced manifest per path', async () => {
    const result = await runDiscovery(payload, sourceId, 'manual', { createReader: () => reader });
    expect(result.outcome).toBe('success');
    expect(result.report?.created).toEqual([AGENT_ID]);
    expect(result.report?.skippedInvalid).toHaveLength(1);
    expect(result.report?.skippedInvalid[0]?.path).toBe('skills/misplaced');
    expect(result.report?.skippedInvalid[0]?.errors[0]).toContain("'agent'");
  });

  it('is active with type agent and appears under the type filter', async () => {
    const agents = await listArtifacts({ type: 'agent' });
    expect(agents.map((a) => (a as { artifactId?: string }).artifactId)).toEqual([AGENT_ID]);
    const doc = agents[0] as { type?: string; active?: boolean };
    expect(doc.type).toBe('agent');
    expect(doc.active).toBe(true);
  });

  it('is findable in full-text search by name and description terms', async () => {
    const byName = await searchArtifacts('copilot');
    expect(byName.map((a) => a.artifactId)).toContain(AGENT_ID);
    // English stemming: "escalates" in the description should match an "escalate" query.
    const byDescription = await searchArtifacts('escalate');
    expect(byDescription.map((a) => a.artifactId)).toContain(AGENT_ID);
  });
});
