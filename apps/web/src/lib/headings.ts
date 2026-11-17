import { richTextHeading } from '@/lib/ds-richtext';
import { slugify } from '@/lib/slug';

/**
 * 028 US1 — heading anchors and the «På denne siden» table of contents
 * (specs/028-docs-navigation/contracts/headings-toc.md §A).
 *
 * Pure: walks a Lexical body once and returns every h2–h4 heading with a unique ASCII anchor. The
 * rich-text renderer (`LearningBody` → `dsConverterOverrides`) and `PageToc` both read the same list,
 * so a table-of-contents entry can never point at an anchor the body did not render.
 *
 * Anchors use `slugify` (the page-address rules) because Payload's link field only accepts
 * `[\w-]` after `#`: a non-ASCII fragment would be stored URL-encoded and broken (research R2).
 */

export type HeadingLevel = 2 | 3 | 4;

export interface Heading {
  /** The Lexical node itself — the renderer looks it up by identity. */
  node: object;
  level: HeadingLevel;
  text: string;
  id: string;
}

export interface TocItem {
  id: string;
  text: string;
  children: TocItem[];
}

/**
 * Fixed `id`s the employee-site layout renders (skip-link target, site menu, user menu, footer). A
 * heading whose anchor would equal one of these gets a suffix instead. Kept in step with the layout
 * by `tests/unit/reserved-anchors.test.ts`.
 */
export const RESERVED_ANCHORS: ReadonlySet<string> = new Set([
  'main-content',
  'site-menu',
  'site-menu-heading',
  'user-menu',
  'sign-out-form',
  'footer-links-heading',
  'footer-contacts-heading',
]);

/** Anchor for a heading with no letters or digits («—», an emoji). */
export const FALLBACK_ANCHOR = 'avsnitt';

type LexicalNode = {
  type?: unknown;
  tag?: unknown;
  text?: unknown;
  children?: unknown;
};

function childrenOf(node: LexicalNode): LexicalNode[] {
  return Array.isArray(node.children) ? (node.children as LexicalNode[]) : [];
}

/** Plain text of a node: text nodes concatenated, a line break as a space, whitespace collapsed. */
function plainText(node: LexicalNode): string {
  const parts: string[] = [];
  const walk = (n: LexicalNode) => {
    if (n.type === 'text' && typeof n.text === 'string') parts.push(n.text);
    else if (n.type === 'linebreak' || n.type === 'tab') parts.push(' ');
    for (const child of childrenOf(n)) walk(child);
  };
  for (const child of childrenOf(node)) walk(child);
  return parts.join('').replace(/\s+/g, ' ').trim();
}

/** Every h2–h4 heading of a Lexical body, in document order, with unique anchors. */
export function extractHeadings(body: unknown): Heading[] {
  const root = (body as { root?: LexicalNode } | null | undefined)?.root;
  if (!root || typeof root !== 'object') return [];

  const taken = new Set<string>(RESERVED_ANCHORS);
  const headings: Heading[] = [];

  const visit = (node: LexicalNode) => {
    if (node.type === 'heading' && typeof node.tag === 'string') {
      // The level readers get: the same clamp the renderer applies (an h1 node renders as h2).
      const level = Number(richTextHeading(Number(node.tag.slice(1))).tag.slice(1));
      if (level >= 2 && level <= 4) {
        const text = plainText(node);
        const base = slugify(text) || FALLBACK_ANCHOR;
        let id = base;
        for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
        taken.add(id);
        headings.push({ node, level: level as HeadingLevel, text, id });
      }
      return; // headings hold inline content only
    }
    for (const child of childrenOf(node)) visit(child);
  };
  visit(root);
  return headings;
}

/**
 * The nested shape the table of contents renders: h3 under the latest h2, h4 under the latest h3
 * after that h2 (else under the h2). A level with nothing above it is top-level, so a skipped level
 * is nested under the nearest higher heading instead of being left out.
 */
export function toTocTree(headings: readonly Heading[]): TocItem[] {
  const tree: TocItem[] = [];
  let lastH2: TocItem | null = null;
  let lastH3: TocItem | null = null;

  for (const heading of headings) {
    const item: TocItem = { id: heading.id, text: heading.text, children: [] };
    if (heading.level === 2) {
      tree.push(item);
      lastH2 = item;
      lastH3 = null;
    } else if (heading.level === 3) {
      (lastH2 ? lastH2.children : tree).push(item);
      lastH3 = item;
    } else {
      const parent = lastH3 ?? lastH2;
      (parent ? parent.children : tree).push(item);
    }
  }
  return tree;
}

/** The node → anchor map the rich-text heading converter reads. */
export function headingIdMap(headings: readonly Heading[]): WeakMap<object, { id: string; text: string }> {
  const map = new WeakMap<object, { id: string; text: string }>();
  for (const { node, id, text } of headings) map.set(node, { id, text });
  return map;
}
