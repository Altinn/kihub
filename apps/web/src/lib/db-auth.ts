import type { postgresAdapter } from '@payloadcms/db-postgres';

/**
 * Database auth seam (deployment Phase B).
 *
 * Two modes, selected by DB_AUTH_MODE:
 * - "password" (default): credentials live in DATABASE_URI — local docker-compose Postgres.
 * - "entra": DATABASE_URI carries no password; the pool's `password` becomes an async
 *   callback that fetches a short-lived Entra token per connection via DefaultAzureCredential
 *   (managed identity in Azure, `az login` locally). Azure PG Flexible Server requires TLS —
 *   keep `sslmode=require` in DATABASE_URI for this mode.
 */

export type DbAuthMode = 'password' | 'entra';

/** Env shape this seam reads (DATABASE_URI, DB_AUTH_MODE) — loose so tests pass plain objects. */
export type DbEnv = Record<string, string | undefined>;

/** Entra scope for Azure Database for PostgreSQL. */
export const AZURE_PG_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default';

type PoolConfig = NonNullable<Parameters<typeof postgresAdapter>[0]['pool']>;

export function resolveDbAuthMode(env: DbEnv = process.env): DbAuthMode {
  const mode = env.DB_AUTH_MODE ?? 'password';
  if (mode !== 'password' && mode !== 'entra') {
    throw new Error(`DB_AUTH_MODE must be "password" or "entra", got "${mode}"`);
  }
  return mode;
}

// One credential for the process; the identity SDK caches tokens internally, so the
// per-connection callback is a cache hit until the token nears expiry.
let credentialTokenFetcher: (() => Promise<string>) | undefined;

async function fetchEntraToken(): Promise<string> {
  if (!credentialTokenFetcher) {
    // Lazy import: password mode (local dev, tests, CI) never loads the Azure SDK.
    const { DefaultAzureCredential } = await import('@azure/identity');
    const credential = new DefaultAzureCredential();
    credentialTokenFetcher = async () => {
      const token = await credential.getToken(AZURE_PG_SCOPE);
      if (!token?.token) throw new Error('DefaultAzureCredential returned no token for Azure PG');
      return token.token;
    };
  }
  return credentialTokenFetcher();
}

export function buildPoolConfig(
  env: DbEnv = process.env,
  fetchToken: () => Promise<string> = fetchEntraToken,
): PoolConfig {
  const connectionString = env.DATABASE_URI ?? '';
  if (resolveDbAuthMode(env) === 'password') {
    return { connectionString };
  }
  // pg 8.x never invokes a function `password` when the config also carries
  // `connectionString` — it authenticates with the (empty) password parsed from the URI.
  // Entra mode therefore decomposes the URI into discrete fields (verified against
  // Azure PG Flexible Server; deployment Phase C).
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    database: url.pathname.replace(/^\//, ''),
    user: decodeURIComponent(url.username),
    // Azure PG requires TLS; its chain is publicly trusted, so full verification works.
    ssl: true,
    // node-postgres resolves a function `password` per new connection.
    password: fetchToken,
  };
}
