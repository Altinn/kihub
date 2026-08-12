import { existsSync } from 'node:fs';
import path from 'node:path';
import { reconcile, scan } from '@kihub/discovery-core';
import { getPayload } from 'payload';
// Relative import (not the @payload-config alias) so this runs under tsx outside Next.
import config from '../src/payload.config';

/**
 * Maintainer-run catalog indexer (contracts/indexer.md). Reads a local ai-artifacts checkout at
 * AI_ARTIFACTS_PATH, validates + reconciles into the Payload `artifacts` collection.
 * Exit: 0 = clean, 1 = duplicates/invalid encountered, 2 = usage/path error.
 * Run: pnpm --filter web index
 */
const root = process.env.AI_ARTIFACTS_PATH;
if (!root) {
  console.error('AI_ARTIFACTS_PATH is not set (e.g. AI_ARTIFACTS_PATH=../ai-artifacts).');
  process.exit(2);
}
const absRoot = path.resolve(process.cwd(), root);
if (!existsSync(absRoot)) {
  console.error(`AI_ARTIFACTS_PATH does not exist: ${absRoot}`);
  process.exit(2);
}

console.log(`Indexing artifacts from ${absRoot} …`);
const scanned = scan(absRoot);
const payload = await getPayload({ config });
// Break-glass mode (015 R12): this local indexer owns no discovery source, so `sourceId: null` —
// upserts leave ownership untouched (new rows stay unowned/adoptable) and nothing is deactivated.
const report = await reconcile(payload, scanned, { sourceId: null });

const line = (label: string, ids: string[]) =>
  console.log(`  ${label.padEnd(13)} ${ids.length}${ids.length ? `  (${ids.join(', ')})` : ''}`);

console.log('\nIndex report:');
line('created', report.created);
line('updated', report.updated);
line('deactivated', report.deactivated);
line('duplicates', report.duplicates);
console.log(`  skipped(inv)  ${report.skippedInvalid.length}`);
for (const s of report.skippedInvalid) console.log(`     - ${s.path}: ${s.errors.join('; ')}`);

const problems = report.duplicates.length + report.skippedInvalid.length;
console.log(problems ? `\nCompleted with ${problems} problem(s).` : '\nCompleted cleanly.');
process.exit(problems > 0 ? 1 : 0);
