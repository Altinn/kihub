import { describe, expect, it } from 'vitest';
import {
  canHighlight,
  codeLanguageLabel,
  highlightCode,
  type CodeLines,
} from '@/lib/learning-code';
import { LEARNING_CODE_LANGUAGES } from '@/lib/learning-view';

/**
 * 014 T036 — the highlighter (contracts/learning-editor.md §B3). These tests pin the three things
 * that would otherwise be assumptions: that highlighting is synchronous, that colours are CSS
 * variable references rather than hex values (FR-034 held mechanically), and that an unknown language
 * degrades to plain text instead of throwing (FR-028).
 */
const text = (lines: CodeLines) => lines.map((l) => l.map((t) => t.content).join('')).join('\n');
const colours = (lines: CodeLines) =>
  [...new Set(lines.flat().map((t) => t.color).filter(Boolean))] as string[];

describe('canHighlight (FR-028)', () => {
  it('accepts every curated language that has a grammar', () => {
    for (const id of Object.keys(LEARNING_CODE_LANGUAGES)) {
      if (id === 'plaintext') continue; // a shiki special language, no grammar
      expect(canHighlight(id), id).toBe(true);
    }
  });

  it('rejects plaintext, unknown languages and empty values', () => {
    expect(canHighlight('plaintext')).toBe(false);
    expect(canHighlight('brainfuck')).toBe(false);
    expect(canHighlight('')).toBe(false);
    expect(canHighlight(null)).toBe(false);
    expect(canHighlight(undefined)).toBe(false);
  });
});

describe('highlightCode — highlighting works synchronously (§B3.1/B3.2)', () => {
  it('tokenises shell and returns lines of tokens', () => {
    const lines = highlightCode('npm install --save-dev shiki', 'shell');
    expect(lines).toHaveLength(1);
    expect(lines[0].length).toBeGreaterThan(1);
    expect(text(lines)).toBe('npm install --save-dev shiki');
  });

  it('tokenises JSON and assigns more than one colour role', () => {
    const lines = highlightCode('{"navn": "Ada", "antall": 3}', 'json');
    expect(colours(lines).length).toBeGreaterThan(1);
  });

  it('returns a plain result synchronously — no promise anywhere', () => {
    // The whole design depends on this: <RichText>'s converters are synchronous.
    const result = highlightCode('const a = 1', 'typescript');
    expect(result).not.toBeInstanceOf(Promise);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('highlightCode — colours resolve through the token layer (FR-034, §B2.4)', () => {
  it('emits only var(--shiki-…) references, never a hex value', () => {
    for (const lang of ['shell', 'json', 'yaml', 'typescript', 'javascript', 'python', 'markdown']) {
      const lines = highlightCode('const x = "verdi" // kommentar\n{"a": 1}\n- liste', lang);
      const found = colours(lines);
      for (const colour of found) {
        expect(colour, `${lang}: ${colour}`).toMatch(/^var\(--shiki-/);
        expect(colour, `${lang}: ${colour}`).not.toMatch(/#[0-9a-fA-F]{3,8}/);
        expect(colour, `${lang}: ${colour}`).not.toMatch(/rgb|hsl/);
      }
    }
  });

  it('does not use the doubled --shiki-token-token- prefix (the variablePrefix trap)', () => {
    const lines = highlightCode('{"a": 1}', 'json');
    for (const colour of colours(lines)) {
      expect(colour).not.toContain('--shiki-token-token-');
    }
  });
});

describe('highlightCode — fallbacks never throw (FR-028, §B3.6)', () => {
  it('renders an unloaded language as plain text rather than throwing ShikiError', () => {
    // Verified behaviour: calling shiki with an unloaded language THROWS. The guard is required.
    expect(() => highlightCode('x := 1', 'brainfuck')).not.toThrow();
    const lines = highlightCode('x := 1', 'brainfuck');
    expect(text(lines)).toBe('x := 1');
    expect(colours(lines)).toEqual([]);
  });

  it('renders plaintext as plain text', () => {
    const lines = highlightCode('bare vanlig tekst', 'plaintext');
    expect(text(lines)).toBe('bare vanlig tekst');
    expect(colours(lines)).toEqual([]);
  });

  it('handles a missing or empty language', () => {
    expect(text(highlightCode('noe kode', undefined))).toBe('noe kode');
    expect(text(highlightCode('noe kode', ''))).toBe('noe kode');
    expect(text(highlightCode('noe kode', null))).toBe('noe kode');
  });

  it('returns an empty result for empty code', () => {
    expect(highlightCode('', 'shell')).toEqual([]);
  });
});

describe('highlightCode — whitespace is preserved exactly (§B2.1)', () => {
  it('keeps indentation', () => {
    const code = 'def f():\n    return 1';
    expect(text(highlightCode(code, 'python'))).toBe(code);
  });

  it('keeps blank lines, including consecutive ones', () => {
    const code = 'a: 1\n\n\nb: 2';
    const lines = highlightCode(code, 'yaml');
    expect(text(lines)).toBe(code);
    expect(lines).toHaveLength(4);
  });

  it('keeps trailing and leading blank lines', () => {
    const code = '\nkode\n';
    expect(text(highlightCode(code, 'shell'))).toBe(code);
  });
});

describe('highlightCode — samples are inert (FR-027, §B2.8)', () => {
  it('treats markup as text, not as markup', () => {
    const code = '<script>alert(1)</script>';
    const lines = highlightCode(code, 'markdown');
    expect(text(lines)).toBe(code);
  });

  it('treats template syntax as text without interpolating anything', () => {
    const code = '${process.env.SECRET} and {{ handlebars }} and $(whoami)';
    expect(text(highlightCode(code, 'shell'))).toBe(code);
  });

  it('does not execute or resolve a shell substitution', () => {
    const code = 'echo $(rm -rf /)';
    expect(text(highlightCode(code, 'shell'))).toBe(code);
  });
});

describe('codeLanguageLabel (§B2.6)', () => {
  it('returns the Norwegian label for a curated language', () => {
    expect(codeLanguageLabel('plaintext')).toBe('Ren tekst');
    expect(codeLanguageLabel('shell')).toBe('Shell');
    expect(codeLanguageLabel('json')).toBe('JSON');
  });

  it('falls back to the raw id for anything else, and to empty for nothing', () => {
    expect(codeLanguageLabel('rust')).toBe('rust');
    expect(codeLanguageLabel(undefined)).toBe('');
  });
});
