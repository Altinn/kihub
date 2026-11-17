import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** 028 shared fixture table: one definition drives the local scan AND the local↔GitHub parity tests. */

export const FIXTURE_REPOSITORY = 'digdir/ai-artifacts';

export interface ArtifactFixture {
  name: string;
  /** Repo-relative file path → content. Includes `kihub.yaml`. */
  files: Record<string, string>;
  /** Expected scan results, sorted by path. `errors` are substrings that must appear. */
  expected: { path: string; valid: boolean; type?: string; errors?: string[] }[];
}

export function manifest(opts: { slug: string; type: string; sourcePath: string; repository?: string }): string {
  return `id: digdir.${opts.slug}
type: ${opts.type}
name: ${opts.slug}
version: 1.0.0
description: Fixture artifact ${opts.slug}.
owner:
  team: AI Enablement
  contact: ai-team@digdir.no
source:
  provider: github
  repository: ${opts.repository ?? FIXTURE_REPOSITORY}
  path: ${opts.sourcePath}
visibility: internal
lifecycle:
  status: experimental
`;
}

/** An artifact folder: manifest + a content file (like SKILL.md) + README. */
export function artifactFolder(
  dir: string,
  slug: string,
  type: string,
  overrides: { sourcePath?: string } = {},
): Record<string, string> {
  const folder = `${dir}/${slug}`;
  return {
    [`${folder}/artifact.yaml`]: manifest({ slug, type, sourcePath: overrides.sourcePath ?? folder }),
    [`${folder}/CONTENT.md`]: `# ${slug}\n`,
    [`${folder}/README.md`]: `readme ${slug}\n`,
  };
}

export const ARTIFACT_DIRS_FIXTURES: ArtifactFixture[] = [
  {
    name: 'dirs-only skills in a custom folder',
    files: {
      'kihub.yaml': 'schemaVersion: 1\ndiscovery:\n  artifactDirs:\n    skill:\n      - agents/_skills\n',
      ...artifactFolder('agents/_skills', 'alpha', 'skill'),
      ...artifactFolder('agents/_skills', 'beta', 'skill'),
      'agents/_skills/gamma/CONTENT.md': 'no manifest here\n', // ignored: no artifact.yaml
      'agents/_skills/group/inner/artifact.yaml': manifest({
        slug: 'too-deep',
        type: 'skill',
        sourcePath: 'agents/_skills/group/inner',
      }), // ignored: one level too deep
      ...artifactFolder('skills', 'unlisted-root', 'skill'), // ignored: root "." is not listed
    },
    expected: [
      { path: 'agents/_skills/alpha', valid: true, type: 'skill' },
      { path: 'agents/_skills/beta', valid: true, type: 'skill' },
    ],
  },
  {
    name: 'roots and per-type dirs combined',
    files: {
      'kihub.yaml':
        'schemaVersion: 1\ndiscovery:\n  artifactRoots: [src]\n  artifactDirs:\n    agent: [custom/bots]\n    skill: [agents/_skills]\n',
      ...artifactFolder('src/skills', 'rooted', 'skill'),
      ...artifactFolder('custom/bots', 'helper', 'agent'),
      ...artifactFolder('agents/_skills', 'alpha', 'skill'),
    },
    expected: [
      { path: 'agents/_skills/alpha', valid: true, type: 'skill' },
      { path: 'custom/bots/helper', valid: true, type: 'agent' },
      { path: 'src/skills/rooted', valid: true, type: 'skill' },
    ],
  },
  {
    name: 'the same container reached through a root and a listed dir is reported once',
    files: {
      'kihub.yaml':
        'schemaVersion: 1\ndiscovery:\n  artifactRoots: [.]\n  artifactDirs:\n    skill: [skills]\n',
      ...artifactFolder('skills', 'one', 'skill'),
    },
    expected: [{ path: 'skills/one', valid: true, type: 'skill' }],
  },
  {
    name: 'manifest type must equal the type the folder is listed under',
    files: {
      'kihub.yaml': 'schemaVersion: 1\ndiscovery:\n  artifactDirs:\n    skill: [agents/_skills]\n',
      ...artifactFolder('agents/_skills', 'good', 'skill'),
      ...artifactFolder('agents/_skills', 'wrong-type', 'agent'),
    },
    expected: [
      { path: 'agents/_skills/good', valid: true, type: 'skill' },
      {
        path: 'agents/_skills/wrong-type',
        valid: false,
        errors: ["type 'agent' does not match the type 'skill' configured for 'agents/_skills'"],
      },
    ],
  },
  {
    name: 'source.path must be the full real folder',
    files: {
      'kihub.yaml': 'schemaVersion: 1\ndiscovery:\n  artifactDirs:\n    skill: [agents/_skills]\n',
      ...artifactFolder('agents/_skills', 'moved', 'skill', { sourcePath: 'skills/moved' }),
    },
    expected: [
      {
        path: 'agents/_skills/moved',
        valid: false,
        errors: ["source.path: 'skills/moved' does not match discovered path 'agents/_skills/moved'"],
      },
    ],
  },
];

/** Write `files` to a fresh temp dir that is a Git checkout (tracked files drive the digest). */
export function writeCheckout(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'kihub-028-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['add', '-A'], { cwd: root });
  return root;
}

/** Whole-scan failures: both readers must refuse, with a message carrying the fixed fragment. */
export interface FailureFixture {
  name: string;
  files: Record<string, string>;
  /** Fixed fragment from src/messages.ts (plus optional extra substrings) the message must contain. */
  fragments: string[];
}

const cfg = (discoveryBody: string) => `schemaVersion: 1\ndiscovery:\n${discoveryBody}`;

export const ARTIFACT_DIRS_FAILURE_FIXTURES: FailureFixture[] = [
  {
    name: 'plural type key',
    files: { 'kihub.yaml': cfg('  artifactDirs:\n    skills: [agents/_skills]\n'), ...artifactFolder('agents/_skills', 'a', 'skill') },
    fragments: ['artifactDirs: unknown type', "did you mean 'skill'"],
  },
  {
    name: 'same directory under two types',
    files: {
      'kihub.yaml': cfg('  artifactDirs:\n    skill: [shared]\n    agent: [shared]\n'),
      ...artifactFolder('shared', 'a', 'skill'),
    },
    fragments: ['is listed for both', "'shared'"],
  },
  {
    name: 'listed directory that the root layout reads as another type',
    files: {
      'kihub.yaml': cfg('  artifactRoots: [.]\n  artifactDirs:\n    agent: [skills]\n'),
      ...artifactFolder('skills', 'a', 'skill'),
    },
    fragments: ['but the root layout reads it as', "'skills'", "'agent'", "'skill'"],
  },
  {
    name: 'listed directory that does not exist',
    files: {
      'kihub.yaml': cfg('  artifactDirs:\n    skill: [agents/_skils]\n'),
      ...artifactFolder('agents/_skills', 'a', 'skill'),
    },
    fragments: ['Configured artifact directory does not exist', 'agents/_skils'],
  },
  {
    name: 'listed path is a file, not a directory',
    files: { 'kihub.yaml': cfg('  artifactDirs:\n    skill: [agents]\n'), agents: 'just a file\n' },
    fragments: ['Configured artifact directory does not exist', 'agents'],
  },
  {
    name: 'artifact folder nested inside another artifact folder',
    files: {
      'kihub.yaml': cfg('  artifactDirs:\n    skill: [lib, lib/outer]\n'),
      ...artifactFolder('lib', 'outer', 'skill'),
      ...artifactFolder('lib/outer', 'inner', 'skill'),
    },
    fragments: ['Artifact folders overlap', "'lib/outer'", "'lib/outer/inner'"],
  },
  {
    name: 'discovery names neither key',
    files: { 'kihub.yaml': cfg('  {}\n'), ...artifactFolder('skills', 'a', 'skill') },
    fragments: ['set artifactRoots, artifactDirs or both'],
  },
];
