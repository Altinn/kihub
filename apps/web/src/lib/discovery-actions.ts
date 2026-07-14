'use server';

import config from '@payload-config';
import { getPayload } from 'payload';
import { revalidatePath } from 'next/cache';
import { getCurrentActor } from './governance';
import { triggerDiscovery } from './discovery';

/**
 * Admin-only "Run now" form action for the discovery admin page (FR-012). Resolves the live actor
 * (never a cached session claim), delegates to the Admin-gated `triggerDiscovery`, then refreshes
 * the page so the new run appears. A non-Admin is refused inside `triggerDiscovery` (SC-008).
 */
export async function triggerDiscoveryAction(formData: FormData) {
  const sourceId = String(formData.get('sourceId') ?? '');
  if (!sourceId) return;
  const actor = await getCurrentActor();
  const payload = await getPayload({ config });
  await triggerDiscovery(payload, sourceId, actor);
  revalidatePath('/admin/discovery');
}
