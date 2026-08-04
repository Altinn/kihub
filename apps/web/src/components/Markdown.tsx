import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Render a README snapshot as Markdown. Safe by default — react-markdown ignores raw HTML — and
 * GFM (tables, task lists) via remark-gfm. Rendered inside a container that inherits Designsystemet
 * typography (the mandated design system); react-markdown is a renderer, not a competing UI kit.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="ds-prose" style={{ lineHeight: 1.6 }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
