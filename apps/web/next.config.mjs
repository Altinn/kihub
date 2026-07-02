import { withPayload } from '@payloadcms/next/withPayload';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Payload embeds its admin + API into this Next.js app.
};

export default withPayload(nextConfig);
