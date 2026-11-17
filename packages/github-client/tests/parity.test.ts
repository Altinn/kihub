import { rmSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  createLocalReader,
  gitBlobOid,
  type RawArtifact,
  scan,
  scanRepoDetailed,
} from '@kihub/discovery-core';
import {
  ARTIFACT_DIRS_FAILURE_FIXTURES,
  ARTIFACT_DIRS_FIXTURES,
  FIXTURE_REPOSITORY,
  writeCheckout,
} from '../../discovery-core/tests/fixtures/artifact-dirs-fixtures';
import { createGithubRepoReader } from '../src/client';

/** A GitHub reader over an in-memory tree built from the same files the local checkout holds. */
function githubReaderFor(files: Record<string, string>) {
  const contentBySha = new Map<string, string>();
  const tree = Object.entries(files).map(([path, content]) => {
    const sha = gitBlobOid(content);
    contentBySha.set(sha, content);
    return { path, type: 'blob', sha };
  });
  const fetchImpl = vi.fn(async (url: string | URL | Request) => {
    const href = String(url);
    if (href.includes('/git/trees/')) return new Response(JSON.stringify({ tree }));
    const sha = href.split('/git/blobs/')[1] ?? '';
    return new Response(contentBySha.get(sha) ?? '', { status: contentBySha.has(sha) ? 200 : 404 });
  });
  return createGithubRepoReader({ repo: FIXTURE_REPOSITORY, token: 't', fetchImpl });
}

const summary = (artifacts: RawArtifact[]) =>
  artifacts.map((a) => ({
    path: a.path,
    valid: a.valid,
    type: a.manifest?.type,
    errors: a.errors,
    contentDigest: a.contentDigest,
  }));

describe('local ↔ GitHub reader parity for artifactDirs (028, FR-017)', () => {
  it.each(ARTIFACT_DIRS_FIXTURES.map((f) => [f.name, f] as const))('%s', async (_name, fixture) => {
    const repo = writeCheckout(fixture.files);
    try {
      const options = { expectedRepository: FIXTURE_REPOSITORY };
      const local = await scanRepoDetailed(createLocalReader(repo), options);
      const github = await scanRepoDetailed(githubReaderFor(fixture.files), options);

      expect(summary(github.artifacts)).toEqual(summary(local.artifacts));
      expect(github.config).toEqual(local.config);
      // the synchronous break-glass scan agrees with both
      expect(summary(scan(repo, options))).toEqual(summary(local.artifacts));
      expect(local.artifacts.map((a) => a.path)).toEqual(fixture.expected.map((e) => e.path));
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it.each(ARTIFACT_DIRS_FAILURE_FIXTURES.map((f) => [f.name, f] as const))(
    'both readers refuse the whole scan: %s',
    async (_name, fixture) => {
      const repo = writeCheckout(fixture.files);
      try {
        for (const reader of [createLocalReader(repo), githubReaderFor(fixture.files)]) {
          let message = '';
          try {
            await scanRepoDetailed(reader, { expectedRepository: FIXTURE_REPOSITORY });
          } catch (error) {
            message = (error as Error).message;
          }
          expect(message, 'scan must throw').not.toBe('');
          for (const fragment of fixture.fragments) expect(message).toContain(fragment);
        }
      } finally {
        rmSync(repo, { recursive: true, force: true });
      }
    },
  );
});
