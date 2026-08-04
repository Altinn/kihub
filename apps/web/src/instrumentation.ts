/**
 * Next.js instrumentation — runs once when the server process starts.
 *
 * In production we initialize Payload immediately so the adapter's prodMigrations
 * (see payload.config.ts) run at container boot, before traffic, instead of on the
 * first request. A migration failure crashes the boot loudly rather than serving a
 * broken app. No-op in dev/test.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') return;
  const [{ getPayload }, { default: config }] = await Promise.all([
    import('payload'),
    import('./payload.config'),
  ]);
  await getPayload({ config });
}
