import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { RESERVED_ANCHORS } from '@/lib/headings';

/**
 * 028 US1 — contracts/headings-toc.md §E. A heading anchor must never equal an `id` the employee-site
 * layout renders (two equal ids break the skip link, `aria-labelledby` and `#fragment` targets), so
 * `RESERVED_ANCHORS` lists them. This test reads the layout and the components it renders and fails
 * when a fixed id appears that the list does not hold, so the list cannot quietly drift.
 *
 * It recognises the three forms the layout uses: `id="literal"`, `const SOMETHING_ID = 'literal'`
 * and `` id={`${SOMETHING_ID}-suffix`} ``. Ids from `useId()` contain characters `slugify` never
 * produces, so they need no entry.
 */
const SRC = fileURLToPath(new URL('../../src/', import.meta.url));

const LAYOUT_FILES = [
  'app/themed-html.tsx',
  'app/(app)/layout.tsx',
  'components/PreviewBanner.tsx',
  'components/SiteHeader.tsx',
  'components/SiteNav.tsx',
  'components/UserMenu.tsx',
  'components/ColorSchemeSwitch.tsx',
  'components/SiteFooter.tsx',
];

function fixedIds(source: string): string[] {
  const found = new Set<string>();
  const constants = new Map<string, string>();
  for (const [, name = '', value = ''] of source.matchAll(
    /const\s+([A-Z][A-Z0-9_]*_ID)\s*=\s*['"]([^'"]+)['"]/g,
  )) {
    constants.set(name, value);
    found.add(value);
  }
  for (const [, value = ''] of source.matchAll(/\bid=["']([^"']+)["']/g)) found.add(value);
  for (const [, name = '', suffix = ''] of source.matchAll(
    /\bid=\{`\$\{([A-Z][A-Z0-9_]*_ID)\}([^`]*)`\}/g,
  )) {
    const base = constants.get(name);
    if (base) found.add(`${base}${suffix}`);
  }
  return [...found];
}

describe('RESERVED_ANCHORS', () => {
  const ids = LAYOUT_FILES.flatMap((file) => fixedIds(readFileSync(`${SRC}${file}`, 'utf8')));

  it('finds the layout ids it is meant to guard (the scanner still works)', () => {
    expect(ids).toEqual(expect.arrayContaining(['main-content', 'site-menu', 'footer-links-heading']));
  });

  it.each(LAYOUT_FILES)('holds every fixed id rendered by %s', (file) => {
    for (const id of fixedIds(readFileSync(`${SRC}${file}`, 'utf8'))) {
      expect(RESERVED_ANCHORS, `«${id}» in ${file}`).toContain(id);
    }
  });
});
