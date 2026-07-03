#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { artifactManifestSchema } from '../src/schema';

/**
 * Generate the published, language-agnostic JSON Schema contract from the Zod schema
 * (single source of truth). Run: pnpm --filter @kihub/artifact-schema generate:jsonschema
 */
const dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(dirname, '../schema');
const outFile = path.join(outDir, 'artifact.schema.json');

const jsonSchema = z.toJSONSchema(artifactManifestSchema, { target: 'draft-2020-12' });
const withMeta = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://kihub.digdir.no/schemas/artifact-1.0.0.json',
  title: 'KI Hub Artifact Manifest',
  ...jsonSchema,
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, `${JSON.stringify(withMeta, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
