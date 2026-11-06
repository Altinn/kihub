import config from '@payload-config';
import { draftMode } from 'next/headers';
import { getPayload } from 'payload';
import { cache } from 'react';
import { auth } from '@/auth';
import { resolvePreviewActive } from './preview-access';

/**
 * 027 — per-request preview state for route components and the layout (contracts/preview-route.md
 * §D). The rule itself lives in `./preview-access.ts` (`resolvePreviewActive`), kept free of
 * Next/Auth.js imports so it is testable against a real Payload. React `cache` evaluates it once per
 * request; any failure (no session, Payload unavailable) means no preview.
 */
export const getPreviewState = cache(async (): Promise<{ active: boolean }> => {
  try {
    const { isEnabled } = await draftMode();
    if (!isEnabled) return { active: false };
    const session = await auth();
    const payload = await getPayload({ config });
    const active = await resolvePreviewActive(
      { draftModeEnabled: isEnabled, userId: session?.user?.id },
      payload,
    );
    return { active };
  } catch {
    return { active: false };
  }
});
