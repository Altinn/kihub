import type { JSXConverters, JSXConvertersFunction } from '@payloadcms/richtext-lexical/react';
import type { Components } from 'react-markdown';
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { richTextHeading, type DsRichTextOptions } from '@/lib/ds-richtext';

/**
 * 026 R9 — rich text (Payload Lexical and Markdown READMEs) rendered with Designsystemet's own
 * typography classes instead of a custom "prose" layer: `ds-heading` (with a `data-size`),
 * `ds-paragraph`, `ds-list`, `ds-link` and `ds-table`. Shared by news, projects, events, learning,
 * the subscriptions dialogs and READMEs, so every content surface reads the same.
 * Heading levels come from `richTextHeading` (`ds-richtext.ts`).
 */

/** Add Designsystemet classes to a default converter's element, keeping everything else it set. */
function withClass(element: ReactNode, className: string): ReactNode {
  if (!isValidElement<{ className?: string }>(element)) return element;
  const existing = element.props.className;
  return cloneElement(element as ReactElement<{ className?: string }>, {
    className: existing ? `${existing} ${className}` : className,
  });
}

/**
 * Converter overrides for `<RichText converters>`. Compose them on top of the defaults (and any
 * surface-specific converters, e.g. learning's code/video blocks).
 */
export function dsConverterOverrides(
  defaultConverters: JSXConverters,
  { minHeadingLevel = 2 }: DsRichTextOptions = {},
): JSXConverters {
  return {
    heading: ({ node, nodesToJSX }) => {
      const level = Number(String(node.tag).slice(1));
      const { tag: Tag, size } = richTextHeading(level, minHeadingLevel);
      return (
        <Tag className="ds-heading" data-size={size}>
          {nodesToJSX({ nodes: node.children })}
        </Tag>
      );
    },
    paragraph: (args) => {
      const out = typeof defaultConverters.paragraph === 'function' ? defaultConverters.paragraph(args) : null;
      return withClass(out, 'ds-paragraph');
    },
    list: (args) => {
      const out = typeof defaultConverters.list === 'function' ? defaultConverters.list(args) : null;
      // Checklists keep Payload's own checkbox markup; plain lists get Designsystemet's list style.
      return args.node.listType === 'check' ? out : withClass(out, 'ds-list');
    },
    link: (args) => {
      const out = typeof defaultConverters.link === 'function' ? defaultConverters.link(args) : null;
      return withClass(out, 'ds-link');
    },
    autolink: (args) => {
      const out = typeof defaultConverters.autolink === 'function' ? defaultConverters.autolink(args) : null;
      return withClass(out, 'ds-link');
    },
    table: ({ node, nodesToJSX }) => (
      // A wide table scrolls inside its own labelled, keyboard-focusable box (WCAG 1.4.10) — a
      // group rather than a region, since a page may hold several tables and landmarks need
      // unique names.
      <div className="app-scroll-region" role="group" aria-label="Tabell" tabIndex={0}>
        <table className="ds-table" data-border="true">
          <tbody>{nodesToJSX({ nodes: node.children })}</tbody>
        </table>
      </div>
    ),
  };
}

/** `converters` prop for a plain `<RichText>` with only the Designsystemet overrides. */
export function dsConverters(options?: DsRichTextOptions): JSXConvertersFunction {
  return ({ defaultConverters }) => ({
    ...defaultConverters,
    ...dsConverterOverrides(defaultConverters, options),
  });
}

/** The same mapping for react-markdown (artifact READMEs). Raw HTML stays disabled. Each renderer
 * drops react-markdown's `node` prop so it never reaches the DOM. */
export function dsMarkdownComponents({ minHeadingLevel = 2 }: DsRichTextOptions = {}): Components {
  const heading = (level: number): Components['h1'] =>
    function MarkdownHeading({ node, ...props }) {
      const { tag: Tag, size } = richTextHeading(level, minHeadingLevel);
      return <Tag className="ds-heading" data-size={size} {...props} />;
    };
  return {
    h1: heading(1),
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    h5: heading(5),
    h6: heading(6),
    p: ({ node, ...props }) => <p className="ds-paragraph" {...props} />,
    ul: ({ node, ...props }) => <ul className="ds-list" {...props} />,
    ol: ({ node, ...props }) => <ol className="ds-list" {...props} />,
    a: ({ node, ...props }) => <a className="ds-link" {...props} />,
    table: ({ node, ...props }) => (
      <div className="app-scroll-region" role="group" aria-label="Tabell" tabIndex={0}>
        <table className="ds-table" data-border="true" {...props} />
      </div>
    ),
  };
}
