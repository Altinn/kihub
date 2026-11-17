import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { dsMarkdownComponents } from '@/lib/ds-richtext-converters';

/**
 * Render a README snapshot as Markdown. Safe by default — react-markdown ignores raw HTML — and
 * GFM (tables, task lists) via remark-gfm.
 *
 * 026: elements render with Designsystemet's typography classes through the shared `ds-richtext`
 * mapping (the old `ds-prose` class never existed), with README headings clamped below the
 * page's own (`minHeadingLevel`). `lang` marks content written in another language — READMEs are
 * usually English inside the Norwegian portal — so screen readers pronounce it correctly.
 */
export function Markdown({
  children,
  lang,
  minHeadingLevel = 3,
}: {
  children: string;
  lang?: string;
  minHeadingLevel?: number;
}) {
  return (
    <div className="app-richtext" lang={lang}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={dsMarkdownComponents({ minHeadingLevel })}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
