import { fileURLToPath } from 'node:url';
import { withPayload } from '@payloadcms/next/withPayload';

import { DECK_SECURITY_HEADERS, SECURITY_HEADERS } from './security-headers.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Payload embeds its admin + API into this Next.js app.
  // Standalone output for the production container image (apps/web/Dockerfile);
  // the tracing root is the pnpm workspace root so packages/* are included.
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
  // sharp >= 0.35 locates libvips dynamically (dist/libvips.cjs), so file tracing misses
  // the @img/sharp-libvips-* packages holding libvips-cpp.so — include them explicitly or
  // the container 500s with ERR_DLOPEN_FAILED.
  outputFileTracingIncludes: {
    '*': ['../../node_modules/.pnpm/@img+sharp-libvips-*/**/*'],
  },
  // 029: the INTERN guideline deck is read from `protected-static/` at runtime (a private blob container
  // when deployed). Next's file tracing follows `process.cwd()` joins, so without this exclusion a local
  // copy of the deck would be traced into `.next/standalone` and from there into the PUBLIC image.
  outputFileTracingExcludes: {
    '*': ['./protected-static/**/*'],
  },
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      // 029: a later entry wins on a key clash, so the deck gets its stricter CSP instead of the global one.
      { source: '/retningslinje/deck/:path*', headers: DECK_SECURITY_HEADERS },
    ];
  },
};

export default withPayload(nextConfig);
