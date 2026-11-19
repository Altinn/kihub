import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Next's standalone output does not include `public/`, so the production image must copy it itself.
 * Without that, `/brand/kitt-logo.svg` and `/brand/hero-design-element.svg` return 404 in production
 * (the files exist in the repo and locally, so nothing else catches it).
 */
const WEB = fileURLToPath(new URL('../../', import.meta.url));
const SRC = join(WEB, 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|css)$/.test(name) ? [full] : [];
  });
}

describe('production image ships public/', () => {
  const dockerfile = readFileSync(join(WEB, 'Dockerfile'), 'utf8');

  it('the Dockerfile copies public/ next to the standalone server', () => {
    expect(dockerfile).toMatch(
      /^COPY --from=builder\b.*\s\/repo\/apps\/web\/public\s+\.\/apps\/web\/public\s*$/m,
    );
  });

  it('every /brand/* file the app references exists in public/', () => {
    const refs = new Set<string>();
    for (const file of sourceFiles(SRC)) {
      for (const m of readFileSync(file, 'utf8').matchAll(/['"`(](\/brand\/[A-Za-z0-9._-]+)/g)) {
        if (m[1]) refs.add(m[1]);
      }
    }
    expect(refs.size).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(existsSync(join(WEB, 'public', ref)), `${ref} is referenced but missing`).toBe(true);
    }
  });
});
