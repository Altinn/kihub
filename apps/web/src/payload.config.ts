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
import { Event } from './collections/Event';
import { LearningCategory } from './collections/LearningCategory';
import { LearningPage } from './collections/LearningPage';
import { LearningSubcategory } from './collections/LearningSubcategory';
import { Media } from './collections/Media';
import { News } from './collections/News';
import { Review } from './collections/Review';
import { Users } from './collections/Users';
import { buildPoolConfig } from './lib/db-auth';
import { buildMediaStoragePlugins } from './lib/media-storage';
import { migrations } from './migrations';
import { Frontpage } from './globals/Frontpage';
import { SiteChrome } from './globals/SiteChrome';

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
  // 014: the KI Læring collections are appended, keeping the existing order stable.
  collections: [
    Users,
    Artifact,
    CatalogEntry,
    Review,
    AuditLog,
    DiscoverySource,
    DiscoveryRun,
    News,
    Event,
    LearningCategory,
    LearningSubcategory,
    LearningPage,
    Media,
  ],
  // 014: media storage is env-selected (MEDIA_STORAGE_MODE) — empty in `disk` mode, the Azure Blob
  // adapter in `azure` mode, throwing at startup when that mode is misconfigured (FR-024/025).
  // This is the config's first `plugins` entry.
  plugins: buildMediaStoragePlugins(),
  // 011: editor-managed chrome + frontpage content (contracts/site-content-globals.md).
  globals: [SiteChrome, Frontpage],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    // Pool auth is env-selected: password (local docker) or Entra token callback (Azure).
    // See src/lib/db-auth.ts and documentation/runtime-config.md.
    pool: buildPoolConfig(),
    migrationDir: path.resolve(dirname, 'migrations'),
    // Bundled migrations run automatically during init when NODE_ENV=production — the
    // standalone container image has no Payload CLI, so this replaces `payload migrate`
    // there (src/instrumentation.ts triggers init at boot). Local dev keeps push mode;
    // this list is inert outside production.
    prodMigrations: migrations,
  }),
  sharp,
});
