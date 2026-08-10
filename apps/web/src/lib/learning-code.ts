import javascript from '@shikijs/langs/javascript';
import json from '@shikijs/langs/json';
import markdown from '@shikijs/langs/markdown';
import python from '@shikijs/langs/python';
import shell from '@shikijs/langs/shell';
import typescript from '@shikijs/langs/typescript';
import yaml from '@shikijs/langs/yaml';
import { createCssVariablesTheme, createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { LEARNING_CODE_LANGUAGES } from '@/lib/learning-view';

/**
 * 014 — server-side syntax highlighting for learning code blocks
 * (contracts/learning-editor.md §B3). Display only: this module tokenises text, and nothing here or
 * downstream ever executes, evaluates or interprets a sample (FR-027).
 *
 * Three deliberate choices, each forced by a constraint rather than preference:
 *
 * 1. **Synchronous.** `<RichText>`'s JSX converters return `React.ReactNode`, not a promise
 *    (research §3), so an async highlighter would force an async server component per code block.
 *    `createHighlighterCoreSync` is the only creation path that is synchronous — and the Oniguruma
 *    engine *cannot* be created synchronously, which is why the JavaScript regex engine below is a
 *    requirement, not a preference.
 * 2. **No WebAssembly.** `createJavaScriptRegexEngine` ships none, so there is no `.wasm` asset to
 *    trace into the `.next/standalone` build this repo produces.
 * 3. **A CSS-variables theme.** Emitted colours are `var(--shiki-…)` references rather than hex, so
 *    the palette resolves through the kihub token layer (FR-034). The variables are defined in the
 *    `014 /laering` section of `portal.css` as aliases of existing theme tokens.
 *
 * The highlighter is created ONCE at module scope: grammars compile per server process, not per
 * request and not per code block (SC-010).
 */

/**
 * IMPORTANT: the default `variablePrefix` (`--shiki-`) is kept deliberately. The theme's role names
 * already begin with `token-`, so setting `variablePrefix: '--shiki-token-'` produces the doubled
 * `--shiki-token-token-keyword` (verified against the installed shiki).
 */
const theme = createCssVariablesTheme({
  name: 'kihub',
  // Comments are italic in the palette, which needs font styles to survive tokenisation.
  fontStyle: true,
});

/**
 * Only the curated grammars are bundled — not shiki's full set. `plaintext` is absent on purpose: it
 * is a shiki special language that needs no grammar.
 *
 * These are imported from `@shikijs/langs/<id>`, which is a direct dependency for a concrete reason:
 * it is a *transitive* dependency of `shiki` and pnpm does not hoist, so the subpath would not
 * resolve without it. `shiki/langs` does resolve but re-exports the full bundle, defeating the
 * fine-grained import entirely.
 */
const GRAMMARS = [shell, json, yaml, typescript, javascript, python, markdown];

const highlighter = createHighlighterCoreSync({
  themes: [theme],
  langs: GRAMMARS,
  engine: createJavaScriptRegexEngine(),
});

/** Languages the highlighter can actually colour, derived from what was loaded above. */
const LOADED_LANGUAGES = new Set(highlighter.getLoadedLanguages());

/** One highlighted token: text plus a CSS-variable colour reference (never a hex value). */
export interface CodeToken {
  content: string;
  /** `undefined` for the plain fallback, so the block simply inherits the code colour. */
  color?: string;
  /** shiki's font-style bitmask, exposed as a flag for the italic comment role. */
  italic?: boolean;
}

/** A highlighted sample: lines of tokens, preserving blank lines exactly as authored. */
export type CodeLines = CodeToken[][];

/**
 * Is this a language the highlighter can colour?
 *
 * The guard exists because an unloaded language **throws `ShikiError`** rather than degrading — that
 * was verified against the installed shiki, and it is why FR-028's fallback is required rather than
 * merely defensive.
 */
export function canHighlight(language?: string | null): boolean {
  if (!language) return false;
  return LOADED_LANGUAGES.has(language);
}

/** The Norwegian display label for a language, or the raw id when it is not one of ours. */
export function codeLanguageLabel(language?: string | null): string {
  if (!language) return '';
  return LEARNING_CODE_LANGUAGES[language] ?? language;
}

/** Split into lines without highlighting — the FR-028 fallback and the `plaintext` path. */
function plainLines(code: string): CodeLines {
  return code.split('\n').map((line) => (line.length ? [{ content: line }] : []));
}

/**
 * Tokenise a code sample for rendering as React elements (FR-026/FR-028).
 *
 * Returns plain, uncoloured lines when the language is unknown, unsupported, empty or `plaintext`,
 * and never throws — a code block must render as readable text no matter what the editor selected.
 */
export function highlightCode(code: string, language?: string | null): CodeLines {
  if (!code) return [];
  if (!canHighlight(language)) return plainLines(code);

  try {
    const { tokens } = highlighter.codeToTokens(code, {
      lang: language as string,
      theme: 'kihub',
    });
    return tokens.map((line) =>
      line.map((token) => ({
        content: token.content,
        ...(token.color ? { color: token.color } : {}),
        // shiki's FontStyle.Italic is bit 1.
        ...(typeof token.fontStyle === 'number' && token.fontStyle & 1 ? { italic: true } : {}),
      })),
    );
  } catch {
    // Belt and braces: the membership check above should make this unreachable, but a code block
    // must never take a page down (FR-028).
    return plainLines(code);
  }
}
