import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { artifactDirectoryDigest, comparePaths, digestKnownFiles, gitBlobOid } from '../src/digest';

describe('gitBlobOid', () => {
  it('matches the documented Git blob oid for hello world', () => {
    expect(gitBlobOid('hello world\n')).toBe('3b18e512dba79e4c8300dd08aeb37f8e728b8dad');
  });
});

describe('artifactDirectoryDigest', () => {
  const manifest = { path: 'artifact.yaml', blobOid: gitBlobOid('id: digdir.test\n') };
  const skill = { path: 'SKILL.md', blobOid: gitBlobOid('# Test\n') };

  it('is deterministic and independent of enumeration order', () => {
    const a = artifactDirectoryDigest([manifest, skill]);
    const b = artifactDirectoryDigest([skill, manifest]);
    expect(a).toBe(b);
    expect(a).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('changes for content, add/remove, and rename changes', () => {
    const baseline = artifactDirectoryDigest([manifest, skill]);
    expect(artifactDirectoryDigest([manifest, { ...skill, blobOid: gitBlobOid('# Changed\n') }])).not.toBe(
      baseline,
    );
    expect(artifactDirectoryDigest([manifest])).not.toBe(baseline);
    expect(artifactDirectoryDigest([manifest, { ...skill, path: 'instructions/SKILL.md' }])).not.toBe(baseline);
  });

  it('uses paths relative to the artifact directory, so an outer directory move is irrelevant', () => {
    const digestAtRoot = artifactDirectoryDigest([manifest, skill]);
    const digestBelowSrc = artifactDirectoryDigest([manifest, skill]);
    expect(digestBelowSrc).toBe(digestAtRoot);
  });

  it('orders paths by UTF-8 bytes, not the host locale (nb collates "aa" after "z")', () => {
    expect(['z.md', 'aa.md', 'B.md'].sort(comparePaths)).toEqual(['B.md', 'aa.md', 'z.md']);
    const aa = { path: 'aa.md', blobOid: gitBlobOid('a') };
    const z = { path: 'z.md', blobOid: gitBlobOid('z') };
    const expected = createHash('sha256')
      .update(`aa.md\0${aa.blobOid}\nz.md\0${z.blobOid}\n`)
      .digest('hex');
    expect(artifactDirectoryDigest([z, aa])).toBe(`sha256:${expected}`);
  });

  it('rejects duplicate or unsafe relative paths', () => {
    expect(() => artifactDirectoryDigest([manifest, manifest])).toThrow('Duplicate');
    expect(() => artifactDirectoryDigest([{ path: '../secret', blobOid: manifest.blobOid }])).toThrow('Invalid');
    expect(() => artifactDirectoryDigest([{ path: 'artifact.yaml', blobOid: 'abc123' }])).toThrow(
      'Invalid Git blob oid',
    );
  });

  it('fallback digest uses the same blob aggregation for known files', () => {
    expect(digestKnownFiles({ 'artifact.yaml': 'id: digdir.test\n', 'SKILL.md': '# Test\n' })).toBe(
      artifactDirectoryDigest([manifest, skill]),
    );
  });
});
