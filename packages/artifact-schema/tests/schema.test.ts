import { describe, expect, it } from 'vitest';
import { validateManifest } from '../src/validate';

const VALID_YAML = `
id: digdir.security-review
type: skill
name: Security Review Skill
version: 1.0.0
description: Helps review architecture and code from a security perspective.
owner:
  team: AI Enablement
  contact: ai-team@digdir.no
source:
  provider: github
  repository: digdir/ai-artifacts
  path: skills/security-review
install:
  apm:
    package: digdir/security-review
tags:
  - security
  - review
visibility: internal
lifecycle:
  status: experimental
`;

describe('artifact manifest schema', () => {
  it('accepts a well-formed manifest and defaults schemaVersion', () => {
    const result = validateManifest(VALID_YAML);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.id).toBe('digdir.security-review');
      expect(result.data.type).toBe('skill');
      expect(result.data.schemaVersion).toBe('1.0.0');
    }
  });

  it('rejects a non-reverse-DNS id', () => {
    const result = validateManifest({
      id: 'SecurityReview',
      type: 'skill',
      name: 'x',
      version: '1.0.0',
      description: 'x',
      owner: { team: 't', contact: 'a@b.no' },
      source: { provider: 'github', repository: 'r', path: 'p' },
      visibility: 'internal',
      lifecycle: { status: 'draft' },
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some((e) => e.startsWith('id:'))).toBe(true);
  });

  it('rejects an unknown artifact type', () => {
    const result = validateManifest({
      id: 'digdir.thing',
      type: 'banana',
      name: 'x',
      version: '1.0.0',
      description: 'x',
      owner: { team: 't', contact: 'a@b.no' },
      source: { provider: 'github', repository: 'r', path: 'p' },
      visibility: 'internal',
      lifecycle: { status: 'draft' },
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some((e) => e.startsWith('type:'))).toBe(true);
  });

  it('rejects a missing required field (description)', () => {
    const result = validateManifest({
      id: 'digdir.thing',
      type: 'skill',
      name: 'x',
      version: '1.0.0',
      owner: { team: 't', contact: 'a@b.no' },
      source: { provider: 'github', repository: 'r', path: 'p' },
      visibility: 'internal',
      lifecycle: { status: 'draft' },
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some((e) => e.startsWith('description'))).toBe(true);
  });

  it('rejects a non-semver version', () => {
    const result = validateManifest({
      id: 'digdir.thing',
      type: 'skill',
      name: 'x',
      version: 'v1',
      description: 'x',
      owner: { team: 't', contact: 'a@b.no' },
      source: { provider: 'github', repository: 'r', path: 'p' },
      visibility: 'internal',
      lifecycle: { status: 'draft' },
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some((e) => e.startsWith('version:'))).toBe(true);
  });

  it('rejects unknown extra fields (strict)', () => {
    const result = validateManifest({
      id: 'digdir.thing',
      type: 'skill',
      name: 'x',
      version: '1.0.0',
      description: 'x',
      owner: { team: 't', contact: 'a@b.no' },
      source: { provider: 'github', repository: 'r', path: 'p' },
      visibility: 'internal',
      lifecycle: { status: 'draft' },
      bogus: true,
    });
    expect(result.valid).toBe(false);
  });

  it('reports a clear error for invalid YAML', () => {
    const result = validateManifest('id: [unclosed');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors[0]).toContain('YAML parse error');
  });
});
