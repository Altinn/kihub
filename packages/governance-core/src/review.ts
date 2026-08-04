export const REVIEW_TYPES = [
  'security',
  'privacy-gdpr',
  'technical',
  'accessibility',
  'responsible-ai',
  'operational',
] as const;

export type ReviewType = (typeof REVIEW_TYPES)[number];

/** Pure — caller supplies `now` so the function stays deterministic/testable. */
export function isExpired(expiryDate: string | Date, now: Date): boolean {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  return expiry.getTime() < now.getTime();
}
