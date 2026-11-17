import { describe, expect, it } from 'vitest';
import { DiscoveryConfigError } from '../src/config';
import {
  assertNoNestedArtifacts,
  buildLayout,
  layoutForRoots,
  listedArtifactDirs,
  locateArtifact,
  matchArtifactDirs,
} from '../src/layout';

const containerDirs = (layout: ReturnType<typeof buildLayout>) => layout.containers.map((c) => c.dir);

describe('buildLayout', () => {
  it('derives the eight type directories below every root', () => {
    const layout = buildLayout({ artifactRoots: ['.', 'src'] });
    expect(containerDirs(layout)).toContain('skills');
    expect(containerDirs(layout)).toContain('src/agents');
    expect(layout.containers).toHaveLength(16);
    expect(layout.containers.find((c) => c.dir === 'src/skills')?.type).toBe('skill');
    expect(layout.containers.find((c) => c.dir === 'policies')?.type).toBe('policy');
    // only non-"." roots must exist; type subdirectories are optional
    expect(layout.requiredDirs).toEqual(['src']);
  });

  it('turns every artifactDirs entry into a required container of its type', () => {
    const layout = buildLayout({
      artifactRoots: [],
      artifactDirs: { skill: ['agents/_skills'], agent: ['custom/bots'] },
    });
    expect(layout.containers).toEqual([
      { dir: 'agents/_skills', type: 'skill', listed: true },
      { dir: 'custom/bots', type: 'agent', listed: true },
    ]);
    expect(layout.requiredDirs).toEqual(['agents/_skills', 'custom/bots']);
  });

  it('sorts containers by UTF-8 bytes and collapses identical {dir,type} pairs', () => {
    const layout = buildLayout({ artifactRoots: ['.'], artifactDirs: { skill: ['skills', 'b-dir', 'a-dir'] } });
    const skillsEntries = layout.containers.filter((c) => c.dir === 'skills');
    // the same {dir,type} reached through the root layout AND artifactDirs is one container, listed
    expect(skillsEntries).toEqual([{ dir: 'skills', type: 'skill', listed: true }]);
    expect(layout.containers.find((c) => c.dir === 'agents')?.listed).toBe(false);
    expect(containerDirs(layout)).toEqual([...containerDirs(layout)].sort());
    expect(layout.requiredDirs).toEqual(['a-dir', 'b-dir', 'skills']);
  });

  it('fails when the same directory is listed for two types', () => {
    expect(() =>
      buildLayout({ artifactRoots: [], artifactDirs: { skill: ['shared'], agent: ['shared'] } }),
    ).toThrow(DiscoveryConfigError);
    expect(() =>
      buildLayout({ artifactRoots: [], artifactDirs: { skill: ['shared'], agent: ['shared'] } }),
    ).toThrow(/'shared'.*'skill'.*'agent'|'shared'.*'agent'.*'skill'/);
  });

  it('fails when a listed directory is read as another type by the root layout', () => {
    expect(() => buildLayout({ artifactRoots: ['.'], artifactDirs: { agent: ['skills'] } })).toThrow(
      /'skills'.*'agent'.*root layout.*'skill'/,
    );
    expect(() => buildLayout({ artifactRoots: ['src'], artifactDirs: { skill: ['src/agents'] } })).toThrow(
      /root layout/,
    );
  });
});

describe('layoutForRoots', () => {
  it('defaults to the repository root', () => {
    expect(layoutForRoots()).toEqual(buildLayout({ artifactRoots: ['.'] }));
    expect(layoutForRoots(['src']).requiredDirs).toEqual(['src']);
  });
});

describe('matchArtifactDirs', () => {
  const layout = buildLayout({
    artifactRoots: ['src'],
    artifactDirs: { skill: ['agents/_skills'] },
  });

  it('returns only <container>/<slug> folders, exactly one level deep', () => {
    const paths = [
      'agents/_skills/alpha/artifact.yaml',
      'agents/_skills/beta/artifact.yaml',
      'agents/_skills/artifact.yaml', // too shallow: container itself
      'agents/_skills/group/alpha/artifact.yaml', // too deep
      'agents/_skills/gamma/SKILL.md', // no manifest
      'src/skills/rooted/artifact.yaml',
      'skills/not-configured/artifact.yaml', // root "." not listed
      'other/place/artifact.yaml',
    ];
    expect(matchArtifactDirs(layout, paths)).toEqual([
      'agents/_skills/alpha',
      'agents/_skills/beta',
      'src/skills/rooted',
    ]);
  });

  it('dedupes and sorts', () => {
    expect(
      matchArtifactDirs(layout, [
        'agents/_skills/b/artifact.yaml',
        'agents/_skills/a/artifact.yaml',
        'agents/_skills/a/artifact.yaml',
      ]),
    ).toEqual(['agents/_skills/a', 'agents/_skills/b']);
  });
});

describe('locateArtifact', () => {
  const layout = buildLayout({ artifactRoots: ['src'], artifactDirs: { skill: ['agents/_skills'] } });

  it('returns the path and the type configured for its container', () => {
    expect(locateArtifact(layout, 'agents/_skills/alpha')).toEqual({
      path: 'agents/_skills/alpha',
      expectedType: 'skill',
      containerDir: 'agents/_skills',
      listed: true,
    });
    expect(locateArtifact(layout, 'src/agents/helper')).toEqual({
      path: 'src/agents/helper',
      expectedType: 'agent',
      containerDir: 'src/agents',
      listed: false,
    });
  });

  it.each(['elsewhere/alpha', 'agents/_skills/a/b', 'agents/_skills', '/abs/skills/x', 'src\\skills\\x'])(
    'rejects a folder outside every container: %s',
    (rel) => {
      expect(() => locateArtifact(layout, rel)).toThrow(DiscoveryConfigError);
    },
  );
});

describe('assertNoNestedArtifacts', () => {
  it('accepts siblings, including names that merely share a prefix', () => {
    expect(() => assertNoNestedArtifacts(['a', 'a-b', 'a.b', 'a_b', 'b/a'])).not.toThrow();
  });

  it('fails and names both paths when one artifact folder is inside another', () => {
    expect(() => assertNoNestedArtifacts(['agents/_skills', 'agents/_skills/alpha'])).toThrow(
      /'agents\/_skills'.*'agents\/_skills\/alpha'/,
    );
    expect(() => assertNoNestedArtifacts(['a', 'a-b', 'a/b'])).toThrow(/'a'.*'a\/b'/);
  });

  it('only rejects nesting that involves a folder found through artifactDirs when `listed` is given', () => {
    const layout = buildLayout({ artifactRoots: ['.', 'skills/outer'], artifactDirs: { agent: ['custom'] } });
    // 026 allowed root-layout artifacts to contain each other; that must stay true (FR-013)
    const rootsOnly = ['skills/outer', 'skills/outer/skills/inner'];
    expect(() => assertNoNestedArtifacts(rootsOnly, listedArtifactDirs(layout, rootsOnly))).not.toThrow();
    // ...but strict mode and anything touching a listed container still fails
    expect(() => assertNoNestedArtifacts(rootsOnly)).toThrow();
    const withListed = buildLayout({
      artifactRoots: [],
      artifactDirs: { agent: ['custom', 'custom/x'] },
    });
    const nested = ['custom/x', 'custom/x/sub'];
    expect(() => assertNoNestedArtifacts(nested, listedArtifactDirs(withListed, nested))).toThrow(/overlap/);
  });
});
