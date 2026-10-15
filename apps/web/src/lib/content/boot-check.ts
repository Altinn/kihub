import { ContentSourceConfigError, readContentSourceConfig } from './config';

/**
 * 023 — fail fast on a bad `CONTENT_SOURCE_*` setting (contracts/content-source.md §2, research R6).
 *
 * Called from `instrumentation.ts` before the server serves anything. On a configuration error it
 * prints the one message listing every bad setting and EXITS the process, rather than relying on
 * how Next.js treats an error thrown from `register()`: a misconfigured module must never start
 * serving (FR-012). Lives in its own Node-only module so `process.exit` stays out of the Edge
 * bundle of `instrumentation.ts`.
 */
export function assertContentSourceConfig(): void {
  try {
    readContentSourceConfig(process.env);
  } catch (error) {
    if (error instanceof ContentSourceConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}
