import { CopyButton } from '@/components/CopyButton';
import { codeLanguageLabel, highlightCode } from '@/lib/learning-code';

/**
 * 014 US3 — a code sample on a learning page (contracts/learning-editor.md §B2).
 *
 * DISPLAY ONLY (FR-027). Tokens are rendered as React ELEMENTS with the sample text as children —
 * never `dangerouslySetInnerHTML`, never an HTML string. That makes inertness structural rather than
 * a promise: React escapes text children by construction, so there is no path by which a sample could
 * be parsed as markup (FR-030).
 *
 * Token colours are `var(--shiki-…)` references supplied by the CSS-variables theme and resolved by
 * the alias block in `portal.css`, so no colour value is hardcoded here (FR-034).
 */
export interface LearningCodeBlockNode {
  fields: {
    code?: string | null;
    language?: string | null;
    blockType?: string;
  };
}

export function LearningCodeBlock({ node }: { node: LearningCodeBlockNode }) {
  const code = node.fields?.code ?? '';
  if (!code.trim()) return null;

  const language = node.fields?.language ?? null;
  const label = codeLanguageLabel(language);
  const lines = highlightCode(code, language);

  return (
    <figure className="lp-code">
      <div className="lp-code__head">
        {label ? <span className="lp-code__lang">{label}</span> : <span />}
        {/* The one client component involved: clipboard access has no server equivalent. It copies
            the RAW field text, not the highlighted markup (§B2.5), and degrades to an inert button
            without scripting — which affects neither navigation nor reading. */}
        <CopyButton text={code} label="Kopier" copiedLabel="Kopiert" />
      </div>

      <pre className="lp-code__pre" tabIndex={0}>
        <code>
          {lines.map((tokens, lineIndex) => (
            <span className="lp-code__line" key={lineIndex}>
              {tokens.map((token, tokenIndex) => (
                <span
                  key={tokenIndex}
                  style={{
                    ...(token.color ? { color: token.color } : {}),
                    ...(token.italic ? { fontStyle: 'italic' } : {}),
                  }}
                >
                  {token.content}
                </span>
              ))}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}
