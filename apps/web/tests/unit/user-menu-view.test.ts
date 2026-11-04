import { describe, expect, it } from 'vitest';
import { COLOR_SCHEME_COOKIE, colorSchemeCookie, initialsOf, parseColorScheme } from '@/lib/user-menu-view';

describe('parseColorScheme', () => {
  it('reads dark', () => {
    expect(parseColorScheme('dark')).toBe('dark');
  });

  it('falls back to light for anything else', () => {
    for (const value of [undefined, null, '', 'light', 'auto', 'DARK', 'dark; x=1']) {
      expect(parseColorScheme(value)).toBe('light');
    }
  });
});

describe('colorSchemeCookie', () => {
  it('stores the choice for a year on every path', () => {
    expect(colorSchemeCookie('dark', false)).toBe(
      `${COLOR_SCHEME_COOKIE}=dark; path=/; max-age=31536000; samesite=lax`,
    );
  });

  it('adds secure on https', () => {
    expect(colorSchemeCookie('light', true)).toMatch(/; secure$/);
  });
});

describe('initialsOf', () => {
  it('takes the first and last name', () => {
    expect(initialsOf('Ada Employee')).toBe('AE');
    expect(initialsOf('Kari Anne Nordmann')).toBe('KN');
  });

  it('uses one letter for a single name', () => {
    expect(initialsOf('kari.nordmann@example.test')).toBe('K');
  });

  it('upper-cases Norwegian letters', () => {
    expect(initialsOf('øystein ås')).toBe('ØÅ');
  });

  it('is empty when there is no name', () => {
    expect(initialsOf('')).toBe('');
    expect(initialsOf('   ')).toBe('');
    expect(initialsOf(undefined)).toBe('');
  });
});
