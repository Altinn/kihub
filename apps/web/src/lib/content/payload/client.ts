import config from '@payload-config';
import { getPayload } from 'payload';

/**
 * 023 — the Payload content source's shared helpers (moved from `lib/payload-queries.ts` and the
 * per-module `payloadClient()` copies). Only `lib/content/payload/**` talks to Payload for
 * editorial content; everything else goes through the per-module sources.
 */
export async function payloadClient() {
  return getPayload({ config });
}

/**
 * Shared `status: published` filter for native-content reads (News, Learning, Projects, ...). Every
 * source method that lists or resolves employee-facing content ANDs this in, so a draft can never
 * leak through — the collection's own `access.read` rule is the second line of defense.
 */
export const PUBLISHED = { status: { equals: 'published' } } as const;
