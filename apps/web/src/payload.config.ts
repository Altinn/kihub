import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig } from 'payload';
import sharp from 'sharp';
import { Artifact } from './collections/Artifact';
import { AuditLog } from './collections/AuditLog';
import { CatalogEntry } from './collections/CatalogEntry';
import { DiscoveryRun } from './collections/DiscoveryRun';
import { DiscoverySource } from './collections/DiscoverySource';
import { Review } from './collections/Review';
import { Users } from './collections/Users';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
  },
  // Phase 6: mount the editor back-office (Payload admin) on non-colliding base paths.
  // The employee app owns `/admin/roles`, `/admin/discovery` and `/api/auth`, `/api/discovery`,
  // so the admin UI lives at `/cms` and the Payload REST/GraphQL API at `/payload-api`
  // (the `(payload)` route-group folders mirror these paths). See contracts/admin-mount.md.
  routes: {
    admin: '/cms',
    api: '/payload-api',
  },
  collections: [Users, Artifact, CatalogEntry, Review, AuditLog, DiscoverySource, DiscoveryRun],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI ?? '',
    },
  }),
  sharp,
});
