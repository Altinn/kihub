#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';
import { validateManifest } from '../src/validate';

/**
 * On-demand manifest validation CLI (no CI wiring this phase).
 * Usage: pnpm --filter @kihub/artifact-schema validate <artifact.yaml> [...more]
 */
const files = process.argv.slice(2);

if (files.length === 0) {
  console.error('usage: validate-file <artifact.yaml> [<artifact.yaml> ...]');
  process.exit(2);
}

let failed = false;
for (const file of files) {
  try {
    const result = validateManifest(readFileSync(file, 'utf8'));
    if (result.valid) {
      console.log(`✓ ${file}  (${result.data.id}, type=${result.data.type})`);
    } else {
      failed = true;
      console.log(`✗ ${file}`);
      for (const err of result.errors) console.log(`    - ${err}`);
    }
  } catch (err) {
    failed = true;
    console.log(`✗ ${file}: ${(err as Error).message}`);
  }
}

process.exit(failed ? 1 : 0);
