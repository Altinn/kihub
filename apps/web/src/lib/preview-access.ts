import type { Payload } from 'payload';
import { isEditor } from './access';

/**
 * 027 — the single source of truth for "may this request see drafts?" (contracts/preview-route.md §D,
 * research R5).
 *
 * Preview is active only when Next's draft mode is on AND the signed-in user's role, looked up FRESH
 * from the `users` collection, is contributor+. The JWT carries the role from sign-in time, so it
 * would keep granting preview to someone whose editor role was removed since; the fresh lookup makes
 * a role change take effect on the very next request. A reader holding a forwarded or stray
 * draft-mode cookie therefore sees nothing. Every failure path returns `false` (fail closed).
 */
export interface PreviewInput {
  draftModeEnabled: boolean;
  userId: string | number | null | undefined;
}

/** Pure core (testable against a real Payload without a Next request). */
export async function resolvePreviewActive(input: PreviewInput, payload: Payload): Promise<boolean> {
  if (!input.draftModeEnabled) return false;
  if (input.userId === null || input.userId === undefined || input.userId === '') return false;
  // The session carries the id as a string; `users` ids are serial integers in Postgres.
  const id =
    typeof input.userId === 'string' && /^\d+$/.test(input.userId)
      ? Number(input.userId)
      : input.userId;
  try {
    const user = await payload.findByID({
      collection: 'users',
      id,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
    });
    return isEditor(user);
  } catch {
    return false;
  }
}
