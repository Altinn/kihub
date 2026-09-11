import type { Role } from '@kihub/governance-core';

/**
 * Contributor+ check shared by native-content collections' Payload `access` rules (News,
 * Learning*, Event, Media, Project, ...). Readers see only published content; everyone else
 * (including a misconfigured/roleless user) is treated as at least Contributor.
 */
export function isEditor(user: { role?: unknown } | null | undefined): boolean {
  return Boolean(user) && (user?.role as Role) !== 'reader';
}
