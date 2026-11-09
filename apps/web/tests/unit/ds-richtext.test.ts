import { describe, expect, it } from 'vitest';
import { richTextHeading } from '@/lib/ds-richtext';

/** 026 R9 / FR-012 — content headings never add a second h1 and keep a sane size per level. */
describe('richTextHeading', () => {
  it('demotes a content h1 to h2, so the page keeps exactly one h1', () => {
    expect(richTextHeading(1)).toEqual({ tag: 'h2', size: 'md' });
  });

  it('keeps h2–h6 at their level with a decreasing Designsystemet size', () => {
    expect(richTextHeading(2)).toEqual({ tag: 'h2', size: 'md' });
    expect(richTextHeading(3)).toEqual({ tag: 'h3', size: 'sm' });
    expect(richTextHeading(4)).toEqual({ tag: 'h4', size: 'xs' });
    expect(richTextHeading(5)).toEqual({ tag: 'h5', size: '2xs' });
    expect(richTextHeading(6)).toEqual({ tag: 'h6', size: '2xs' });
  });

  it('raises headings to the surface floor (e.g. a dialog that already has an h2)', () => {
    expect(richTextHeading(1, 3)).toEqual({ tag: 'h3', size: 'sm' });
    expect(richTextHeading(2, 3)).toEqual({ tag: 'h3', size: 'sm' });
    expect(richTextHeading(4, 3)).toEqual({ tag: 'h4', size: 'xs' });
  });

  it('never goes below h6 or above the h2 floor, whatever it is given', () => {
    expect(richTextHeading(9).tag).toBe('h6');
    expect(richTextHeading(0).tag).toBe('h2');
    expect(richTextHeading(Number.NaN).tag).toBe('h2');
    expect(richTextHeading(2, 1).tag).toBe('h2');
    expect(richTextHeading(2, 8).tag).toBe('h6');
  });
});
