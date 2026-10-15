/**
 * Next.js instrumentation — runs once when the server process starts.
 *
 * 023: in every environment, the per-module content-source settings (`CONTENT_SOURCE_*`) are
 * validated first; a bad value prints one message and exits the process, so a misconfigured module
 * never starts serving (it exits explicitly rather than throwing — see `lib/content/boot-check.ts`).
 *
 * In production we then initialize Payload immediately so the adapter's prodMigrations
 * (see payload.config.ts) run at container boot, before traffic, instead of on the
 * first request. A migration failure crashes the boot loudly rather than serving a
 * broken app. No-op in dev/test.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { assertContentSourceConfig } = await import('./lib/content/boot-check');
  assertContentSourceConfig();

  if (process.env.NODE_ENV !== 'production') return;
  const [{ getPayload }, { default: config }] = await Promise.all([
    import('payload'),
    import('./payload.config'),
  ]);
  await getPayload({ config });
}
