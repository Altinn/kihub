import { fileURLToPath } from 'node:url';
import { withPayload } from '@payloadcms/next/withPayload';

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
};

export default withPayload(nextConfig);
