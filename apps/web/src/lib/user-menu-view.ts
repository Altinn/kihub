import type { ColorScheme } from '@digdir/designsystemet-types';

/**
 * 026 — pure helpers for the header's user menu (the signed-in person as a Designsystemet
 * Dropdown trigger with an Avatar). No React or Next imports, so they are unit-testable.
 */

/** Cookie holding the person's colour-scheme choice, read on the server so the first paint is right. */
export const COLOR_SCHEME_COOKIE = 'kihub-color-scheme';

/** The schemes the menu offers. Light stays the default; there is no "follow the system" option yet. */
export type AppColorScheme = Extract<ColorScheme, 'light' | 'dark'>;

/** Anything but an exact `dark` (missing, tampered, an old value) falls back to light. */
export function parseColorScheme(value: string | undefined | null): AppColorScheme {
  return value === 'dark' ? 'dark' : 'light';
}

/** `document.cookie` value that stores the choice for a year on every path. */
export function colorSchemeCookie(scheme: AppColorScheme, secure: boolean): string {
  return `${COLOR_SCHEME_COOKIE}=${scheme}; path=/; max-age=31536000; samesite=lax${secure ? '; secure' : ''}`;
}

/**
 * Avatar initials: the first letter of the first and last name ("Ada Employee" → "AE"), one
 * letter for a single name, and '' when there is nothing to use (the Avatar then shows
 * Designsystemet's person icon).
 */
export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const firstLetter = (part: string | undefined) => (part ? (Array.from(part)[0] ?? '') : '');
  const first = firstLetter(parts[0]);
  const last = parts.length > 1 ? firstLetter(parts[parts.length - 1]) : '';
  return (first + last).toLocaleUpperCase('nb-NO');
}
