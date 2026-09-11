import { describe, expect, it } from 'vitest';
import { DEFAULT_FRONTPAGE } from '@/lib/site-content-defaults';

/**
 * 016 (US1/US2, FR-001/002) — pins both halves of the Altinn/kihub#135 fix in one place: the
 * "KI Prosjekter i BOD" tile must lead somewhere OTHER than the tool registry, and "Verktøy" must
 * keep leading to the tool registry, unchanged. A future edit that reunifies them breaks this test.
 */
describe('DEFAULT_FRONTPAGE tiles (Altinn/kihub#135)', () => {
  it('sends "Verktøy" to the tool registry, unchanged', () => {
    const tool = DEFAULT_FRONTPAGE.tiles.find((t) => t.title === 'Verktøy');
    expect(tool?.href).toBe('/registry');
  });

  it('sends "KI Prosjekter i BOD" to its own dedicated destination, distinct from the registry', () => {
    const projects = DEFAULT_FRONTPAGE.tiles.find((t) => t.title === 'KI Prosjekter i BOD');
    expect(projects?.href).toBe('/prosjekter');
    expect(projects?.href).not.toBe('/registry');
  });
});
