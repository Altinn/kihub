import { describe, expect, it } from 'vitest';
import type { ArtifactManifest } from '@kihub/artifact-schema';
import { buildRecord, deriveInstallCommand } from '../src/record';

const base: ArtifactManifest = {
  id: 'digdir.security-review',
  type: 'skill',
  name: 'Security Review Skill',
  version: '1.0.0',
  description: 'Reviews security.',
  owner: { team: 'AI Enablement', contact: 'ai-team@digdir.no' },
  source: { provider: 'github', repository: 'digdir/ai-artifacts', path: 'skills/security-review' },
  install: { apm: { package: 'digdir/security-review' } },
  tags: ['security', 'review'],
  visibility: 'internal',
  lifecycle: { status: 'experimental' },
  schemaVersion: '1.0.0',
};

describe('deriveInstallCommand', () => {
  it('derives an apm install command from the manifest', () => {
    expect(deriveInstallCommand(base)).toBe('apm install digdir/security-review');
  });

  it('returns empty when there is no install block', () => {
    const { install, ...rest } = base;
    void install;
    expect(deriveInstallCommand(rest as ArtifactManifest)).toBe('');
  });
});

describe('buildRecord', () => {
  it('maps manifest fields and README to the catalog record', () => {
    const record = buildRecord(base, '# Readme');
    expect(record).toMatchObject({
      artifactId: 'digdir.security-review',
      type: 'skill',
      name: 'Security Review Skill',
      version: '1.0.0',
      installCommand: 'apm install digdir/security-review',
      readme: '# Readme',
      tags: ['security', 'review'],
      visibility: 'internal',
      lifecycleStatus: 'experimental',
    });
    expect(record.source).toEqual({
      provider: 'github',
      repository: 'digdir/ai-artifacts',
      path: 'skills/security-review',
    });
  });

  it('defaults readme to empty and tags to []', () => {
    const { tags, ...noTags } = base;
    void tags;
    const record = buildRecord(noTags as ArtifactManifest);
    expect(record.readme).toBe('');
    expect(record.tags).toEqual([]);
  });
});
