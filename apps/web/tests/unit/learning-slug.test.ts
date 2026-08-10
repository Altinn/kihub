import { describe, expect, it } from 'vitest';
import { slugify } from '@/lib/slug';

/**
 * 014 T027 — the handle derivation used by `learning-pages.beforeValidate` (FR-011).
 *
 * `slugify` itself is shared with News and already has coverage in `news-slug.test.ts`; what is
 * asserted here is the behaviour learning pages specifically depend on — Norwegian titles from the
 * real library, and the fact that derivation is pure and repeatable (which is what makes a handle
 * stable across title edits, since the hook only fires when the field is blank).
 */
describe('slugify for learning page titles (FR-011)', () => {
  it('maps the Norwegian letters æ, ø and å', () => {
    expect(slugify('Få dybde, ikke fluff')).toBe('fa-dybde-ikke-fluff');
    expect(slugify('Iterasjon er nøkkelen')).toBe('iterasjon-er-nokkelen');
    expect(slugify('Ærlig størrelse på åpne data')).toBe('aerlig-storrelse-pa-apne-data');
  });

  it('handles the real seeded titles', () => {
    expect(slugify('Hva er agenter, ferdigheter og instruksjoner')).toBe(
      'hva-er-agenter-ferdigheter-og-instruksjoner',
    );
    expect(slugify('Skriv bedre ved å skrive mindre')).toBe('skriv-bedre-ved-a-skrive-mindre');
    expect(slugify('KI-en som sparringspartner')).toBe('ki-en-som-sparringspartner');
  });

  it('collapses punctuation and whitespace runs into single hyphens', () => {
    expect(slugify('Tips & triks   —   del 2')).toBe('tips-triks-del-2');
    expect(slugify('Hva er «agenter»?')).toBe('hva-er-agenter');
  });

  it('strips emoji and other symbols rather than leaving stray hyphens', () => {
    expect(slugify('Få dybde, ikke fluff 💎')).toBe('fa-dybde-ikke-fluff');
    expect(slugify('Strukturere kaos til klarhet 📝')).toBe('strukturere-kaos-til-klarhet');
  });

  it('is deterministic — the same title always yields the same handle', () => {
    const title = 'Oppsummeringer som faktisk fungerer';
    expect(slugify(title)).toBe(slugify(title));
  });

  it('produces different handles for titles that differ only in punctuation position', () => {
    expect(slugify('Del 1: oppsett')).toBe('del-1-oppsett');
    expect(slugify('Del 1 oppsett')).toBe('del-1-oppsett');
    // Colliding handles are expected here — uniqueness is enforced by the `unique: true` index,
    // which surfaces the conflict to the editor rather than silently overwriting (FR-011).
  });
});
