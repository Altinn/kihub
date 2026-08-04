import { describe, expect, it, vi } from 'vitest';
import { AZURE_PG_SCOPE, buildPoolConfig, resolveDbAuthMode } from '@/lib/db-auth';

/** Deployment Phase B — env-selected pool auth (password local / Entra token in Azure). */

const URI = 'postgres://kihub@db.example:5432/kihub?sslmode=require';

describe('resolveDbAuthMode', () => {
  it('defaults to password when DB_AUTH_MODE is unset', () => {
    expect(resolveDbAuthMode({})).toBe('password');
  });

  it('accepts the two supported modes', () => {
    expect(resolveDbAuthMode({ DB_AUTH_MODE: 'password' })).toBe('password');
    expect(resolveDbAuthMode({ DB_AUTH_MODE: 'entra' })).toBe('entra');
  });

  it('rejects anything else loudly (fail at boot, not at first query)', () => {
    expect(() => resolveDbAuthMode({ DB_AUTH_MODE: 'managed' })).toThrow(
      /DB_AUTH_MODE/,
    );
  });
});

describe('buildPoolConfig', () => {
  it('password mode: connection string only, no password override', () => {
    const pool = buildPoolConfig({ DATABASE_URI: URI });
    expect(pool).toEqual({ connectionString: URI });
  });

  it('entra mode: discrete fields (never connectionString) + async token callback', async () => {
    const fetchToken = vi.fn(async () => 'entra-token');
    const pool = buildPoolConfig(
      { DATABASE_URI: URI, DB_AUTH_MODE: 'entra' },
      fetchToken,
    );
    // pg ignores a function `password` when connectionString is present (it sends the
    // URI's empty password instead), so entra mode must decompose the URI.
    expect(pool.connectionString).toBeUndefined();
    expect(pool.host).toBe('db.example');
    expect(pool.port).toBe(5432);
    expect(pool.database).toBe('kihub');
    expect(pool.user).toBe('kihub');
    expect(pool.ssl).toBe(true);
    expect(typeof pool.password).toBe('function');
    await expect((pool.password as () => Promise<string>)()).resolves.toBe('entra-token');
    expect(fetchToken).toHaveBeenCalledTimes(1);
  });

  it('entra mode defaults the port and decodes an encoded user', () => {
    const pool = buildPoolConfig(
      {
        DATABASE_URI: 'postgres://adi.dahl%40digdir.no@db.example/kihub?sslmode=require',
        DB_AUTH_MODE: 'entra',
      },
      async () => 'entra-token',
    );
    expect(pool.port).toBe(5432);
    expect(pool.user).toBe('adi.dahl@digdir.no');
  });

  it('entra mode does not eagerly fetch a token (only per connection)', () => {
    const fetchToken = vi.fn(async () => 'entra-token');
    buildPoolConfig({ DATABASE_URI: URI, DB_AUTH_MODE: 'entra' }, fetchToken);
    expect(fetchToken).not.toHaveBeenCalled();
  });
});

describe('AZURE_PG_SCOPE', () => {
  it('targets Azure Database for PostgreSQL', () => {
    expect(AZURE_PG_SCOPE).toBe('https://ossrdbms-aad.database.windows.net/.default');
  });
});
