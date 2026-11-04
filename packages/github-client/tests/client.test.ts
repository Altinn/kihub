import { describe, expect, it, vi } from 'vitest';
import { artifactDirectoryDigest, gitBlobOid } from '@kihub/discovery-core';
import { createGithubRepoReader, GithubClientError } from '../src/client';

const TREE = {
  tree: [
    { path: 'skills', type: 'tree' },
    { path: 'skills/security-review', type: 'tree' },
    { path: 'skills/security-review/artifact.yaml', type: 'blob', sha: gitBlobOid('manifest') },
    { path: 'skills/security-review/README.md', type: 'blob', sha: gitBlobOid('readme') },
    { path: 'prompts/tone/artifact.yaml', type: 'blob', sha: gitBlobOid('prompt') },
    { path: 'src', type: 'tree' },
    { path: 'src/skills', type: 'tree' },
    { path: 'src/skills/nested', type: 'tree' },
    { path: 'src/skills/nested/artifact.yaml', type: 'blob', sha: gitBlobOid('nested') },
    { path: 'src/deeper/skills/ignored/artifact.yaml', type: 'blob', sha: gitBlobOid('ignored') },
    { path: 'docs/notes.md', type: 'blob', sha: gitBlobOid('notes') }, // outside TYPE_DIRS → ignored
    { path: 'skills/wip/notes.txt', type: 'blob', sha: gitBlobOid('wip') }, // no artifact.yaml → ignored
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('createGithubRepoReader', () => {
  it('listArtifactDirs keeps only TYPE_DIRS dirs that contain an artifact.yaml', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => jsonResponse(TREE));
    const reader = createGithubRepoReader({ repo: 'digdir/ai-artifacts', token: 't', fetchImpl });

    const dirs = (await reader.listArtifactDirs()).sort();
    expect(dirs).toEqual(['prompts/tone', 'skills/security-review']);
    // recursive tree fetched once
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0]![0])).toContain('/git/trees/main?recursive=1');
  });

  it('enumerates exact configured roots, ignores arbitrary deeper manifests, and caches the tree for digesting', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request) => jsonResponse(TREE));
    const reader = createGithubRepoReader({ repo: 'digdir/ai-artifacts', token: 't', fetchImpl });

    expect(await reader.listArtifactDirs(['src'])).toEqual(['src/skills/nested']);
    expect(await reader.artifactDigest?.('src/skills/nested')).toBe(
      artifactDirectoryDigest([{ path: 'artifact.yaml', blobOid: gitBlobOid('nested') }]),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('digests every blob recursively and detects a SKILL.md-only revision change', async () => {
    const treeFor = (skillText: string) => ({
      tree: [
        { path: 'src', type: 'tree' },
        { path: 'src/skills', type: 'tree' },
        { path: 'src/skills/nested', type: 'tree' },
        { path: 'src/skills/nested/artifact.yaml', type: 'blob', sha: gitBlobOid('manifest') },
        { path: 'src/skills/nested/SKILL.md', type: 'blob', sha: gitBlobOid(skillText) },
        { path: 'src/skills/nested/instructions/notes.txt', type: 'blob', sha: gitBlobOid('notes') },
      ],
    });
    const readerFor = (skillText: string) =>
      createGithubRepoReader({
        repo: 'digdir/ai-artifacts',
        token: 't',
        fetchImpl: vi.fn(async () => jsonResponse(treeFor(skillText))),
      });

    const first = await readerFor('# First\n').artifactDigest?.('src/skills/nested');
    expect(first).toBe(
      artifactDirectoryDigest([
        { path: 'artifact.yaml', blobOid: gitBlobOid('manifest') },
        { path: 'instructions/notes.txt', blobOid: gitBlobOid('notes') },
        { path: 'SKILL.md', blobOid: gitBlobOid('# First\n') },
      ]),
    );
    expect(await readerFor('# Second\n').artifactDigest?.('src/skills/nested')).not.toBe(first);
  });

  it('rejects a configured root missing from the tree', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(TREE));
    const reader = createGithubRepoReader({ repo: 'digdir/ai-artifacts', token: 't', fetchImpl });
    await expect(reader.listArtifactDirs(['missing'])).rejects.toThrow('does not exist');
  });

  it('fails closed when GitHub reports a truncated recursive tree', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ...TREE, truncated: true }));
    const reader = createGithubRepoReader({ repo: 'digdir/ai-artifacts', token: 't', fetchImpl });
    await expect(reader.listArtifactDirs()).rejects.toThrow('truncated');
  });

  it('readFile fetches the blob sha from the tree snapshot, and is undefined for paths not in it', async () => {
    const readmeSha = gitBlobOid('readme');
    const fetchImpl = vi.fn(async (url: string | URL | Request) =>
      String(url).includes(`/git/blobs/${readmeSha}`) ? new Response('# Hello', { status: 200 }) : jsonResponse(TREE),
    );
    const reader = createGithubRepoReader({ repo: 'digdir/ai-artifacts', token: 't', fetchImpl });

    expect(await reader.readFile('skills/security-review/README.md')).toBe('# Hello');
    expect(await reader.readFile('skills/security-review/MISSING.md')).toBeUndefined();
    // One tree request + one blob request; the missing file needs no network call.
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('reads every file from the single tree snapshot even if the branch moves mid-scan', async () => {
    let treeCalls = 0;
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes('/git/trees/')) {
        treeCalls += 1;
        return jsonResponse(TREE);
      }
      if (u.includes(`/git/blobs/${gitBlobOid('manifest')}`)) return new Response('manifest');
      return new Response('unexpected', { status: 500 });
    });
    const reader = createGithubRepoReader({ repo: 'digdir/ai-artifacts', token: 't', fetchImpl });

    await reader.listArtifactDirs();
    expect(await reader.readFile('skills/security-review/artifact.yaml')).toBe('manifest');
    expect(fetchImpl.mock.calls.some(([url]) => String(url).includes('/contents/'))).toBe(false);
    expect(treeCalls).toBe(1);
  });

  it('digests a nested artifact into its enclosing artifact too, like a prefix filter', async () => {
    const tree = {
      tree: [
        { path: 'skills/outer/artifact.yaml', type: 'blob', sha: gitBlobOid('outer') },
        { path: 'skills/outer/skills/inner/artifact.yaml', type: 'blob', sha: gitBlobOid('inner') },
      ],
    };
    const reader = createGithubRepoReader({
      repo: 'digdir/ai-artifacts',
      token: 't',
      fetchImpl: vi.fn(async () => jsonResponse(tree)),
    });
    await reader.listArtifactDirs(['.', 'skills/outer']);
    expect(await reader.artifactDigest?.('skills/outer')).toBe(
      artifactDirectoryDigest([
        { path: 'artifact.yaml', blobOid: gitBlobOid('outer') },
        { path: 'skills/inner/artifact.yaml', blobOid: gitBlobOid('inner') },
      ]),
    );
  });

  it('throws GithubClientError on a non-404 error, without leaking the token', async () => {
    const token = 'super-secret-token-value';
    const fetchImpl = vi.fn(async () => new Response('boom', { status: 500 }));
    const reader = createGithubRepoReader({ repo: 'digdir/ai-artifacts', token, fetchImpl });

    await expect(reader.listArtifactDirs()).rejects.toBeInstanceOf(GithubClientError);
    try {
      await reader.readFile('skills/x/artifact.yaml');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(GithubClientError);
      expect((err as GithubClientError).status).toBe(500);
      expect((err as Error).message).not.toContain(token);
    }
  });

  it('sends a Bearer auth header derived from the token', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => jsonResponse(TREE));
    const reader = createGithubRepoReader({ repo: 'digdir/ai-artifacts', token: 'abc', fetchImpl });
    await reader.listArtifactDirs();
    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });

  it('rejects a malformed repo string', () => {
    expect(() => createGithubRepoReader({ repo: 'no-slash', token: 't' })).toThrow(GithubClientError);
  });
});
