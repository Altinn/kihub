import { describe, expect, it, vi } from 'vitest';
import { createGithubRepoReader, GithubClientError } from '../src/client';

const TREE = {
  tree: [
    { path: 'skills', type: 'tree' },
    { path: 'skills/security-review', type: 'tree' },
    { path: 'skills/security-review/artifact.yaml', type: 'blob' },
    { path: 'skills/security-review/README.md', type: 'blob' },
    { path: 'prompts/tone/artifact.yaml', type: 'blob' },
    { path: 'docs/notes.md', type: 'blob' }, // outside TYPE_DIRS → ignored
    { path: 'skills/wip/notes.txt', type: 'blob' }, // no artifact.yaml → ignored
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

  it('readFile returns blob contents, and undefined on 404', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      return String(url).includes('README.md')
        ? new Response('# Hello', { status: 200 })
        : new Response('not found', { status: 404 });
    });
    const reader = createGithubRepoReader({ repo: 'digdir/ai-artifacts', token: 't', fetchImpl });

    expect(await reader.readFile('skills/security-review/README.md')).toBe('# Hello');
    expect(await reader.readFile('skills/security-review/MISSING.md')).toBeUndefined();
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
