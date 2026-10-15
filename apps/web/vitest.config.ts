import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // 023: the parity harness imports pages/components (.tsx). tsconfig's `jsx: "preserve"` is for
  // Next's compiler; tests need the JSX transformed, with React 19's automatic runtime.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    // Integration tests share one Postgres/artifacts table — run files sequentially to avoid races.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@payload-config': fileURLToPath(new URL('./src/payload.config.ts', import.meta.url)),
    },
  },
});
