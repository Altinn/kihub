import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Payload's packages peer-depend on each other at the EXACT same version. Renovate PR #161 bumped
 * only `@payloadcms/next` (3.85.2 → 3.88.0), which bundled two copies of `@payloadcms/ui` and took
 * /cms down in prod ("useUploadHandlers must be used within UploadHandlersProvider"). Renovate's
 * security PRs ignore `groupName`, so this test is the guard: any lone Payload bump fails CI.
 */
describe('Payload package versions', () => {
  it('pins payload and every @payloadcms/* dependency to one identical version', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    const payloadDeps = Object.entries(all).filter(
      ([name]) => name === 'payload' || name.startsWith('@payloadcms/'),
    );

    expect(payloadDeps.length).toBeGreaterThan(1);
    expect(new Set(payloadDeps.map(([, version]) => version)), JSON.stringify(payloadDeps)).toHaveProperty('size', 1);
  });
});
