import { fileURLToPath } from 'node:url';
import { withPayload } from '@payloadcms/next/withPayload';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Payload embeds its admin + API into this Next.js app.
  // Standalone output for the production container image (apps/web/Dockerfile);
  // the tracing root is the pnpm workspace root so packages/* are included.
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
};

export default withPayload(nextConfig);
