import { describe, expect, it } from 'vitest';
import {
  extractHeadings,
  headingIdMap,
  RESERVED_ANCHORS,
  toTocTree,
  type Heading,
} from '@/lib/headings';

/** 028 US1 — contracts/headings-toc.md §A (anchors) and §A4 (table-of-contents tree). */

type Node = Record<string, unknown>;
const text = (value: string, format = 0): Node => ({ type: 'text', text: value, format });
const heading = (tag: string, ...children: Node[]): Node => ({ type: 'heading', tag, children });
const h = (tag: string, value: string) => heading(tag, text(value));
const paragraph = (value: string): Node => ({ type: 'paragraph', children: [text(value)] });
const body = (...children: Node[]) => ({ root: { type: 'root', children } });

const ids = (headings: Heading[]) => headings.map((x) => x.id);

describe('extractHeadings — anchors (A3)', () => {
  it('derives ASCII anchors with the page-address rules', () => {
    const result = extractHeadings(
      body(h('h2', 'Før du starter'), h('h3', 'Installer agentctl'), h('h2', 'Hvorfor æ?')),
    );
    expect(ids(result)).toEqual(['for-du-starter', 'installer-agentctl', 'hvorfor-ae']);
  });

  it('suffixes repeated anchors in document order', () => {
    const result = extractHeadings(
      body(h('h2', 'Før du starter'), h('h3', 'Installer agentctl'), h('h2', 'Før du starter')),
    );
    expect(ids(result)).toEqual(['for-du-starter', 'installer-agentctl', 'for-du-starter-2']);
  });

  it('skips a suffix a heading already uses literally', () => {
    const result = extractHeadings(body(h('h2', 'Steg'), h('h2', 'Steg 2'), h('h2', 'Steg')));
    expect(ids(result)).toEqual(['steg', 'steg-2', 'steg-3']);
  });

  it('falls back to «avsnitt» for a heading without letters or digits', () => {
    const result = extractHeadings(body(h('h2', '—'), h('h2', '🙂')));
    expect(ids(result)).toEqual(['avsnitt', 'avsnitt-2']);
  });

  it('never equals an id the layout uses', () => {
    const result = extractHeadings(body(h('h2', 'Main content'), h('h2', 'Site menu')));
    expect(ids(result)).toEqual(['main-content-2', 'site-menu-2']);
    for (const id of ids(result)) expect(RESERVED_ANCHORS.has(id)).toBe(false);
  });
});

describe('extractHeadings — text and walk (A1, A2)', () => {
  it('uses the plain text of formatted, code and linked content', () => {
    const result = extractHeadings(
      body(
        heading('h2', text('Kjør '), text('agentctl new', 16)),
        heading('h3', text('Les '), { type: 'link', fields: { url: '/x' }, children: [text('mer')] }),
        heading('h4', text('Linje'), { type: 'linebreak' }, text('to  ')),
      ),
    );
    expect(result.map((x) => [x.text, x.id])).toEqual([
      ['Kjør agentctl new', 'kjor-agentctl-new'],
      ['Les mer', 'les-mer'],
      ['Linje to', 'linje-to'],
    ]);
  });

  it('keeps h2–h4 only, counting an h1 node as the h2 it renders as', () => {
    const result = extractHeadings(
      body(h('h1', 'En'), h('h2', 'To'), h('h4', 'Fire'), h('h5', 'Fem'), h('h6', 'Seks')),
    );
    expect(result.map((x) => [x.level, x.id])).toEqual([
      [2, 'en'],
      [2, 'to'],
      [4, 'fire'],
    ]);
  });

  it('finds headings nested in other nodes and returns the node itself', () => {
    const nested = h('h3', 'Inni');
    const result = extractHeadings(body(paragraph('Tekst'), { type: 'quote', children: [nested] }));
    expect(result).toHaveLength(1);
    expect(result[0]?.node).toBe(nested);
    expect(headingIdMap(result).get(nested)).toEqual({ id: 'inni', text: 'Inni' });
  });

  it('returns nothing for an empty or missing body', () => {
    expect(extractHeadings(body())).toEqual([]);
    expect(extractHeadings(null)).toEqual([]);
    expect(extractHeadings(undefined)).toEqual([]);
    expect(extractHeadings({})).toEqual([]);
  });
});

describe('toTocTree (A4)', () => {
  const tree = (...nodes: Node[]) =>
    JSON.parse(JSON.stringify(toTocTree(extractHeadings(body(...nodes))))) as unknown;
  const item = (id: string, children: unknown[] = []) => ({ id, text: expect.any(String), children });

  it('nests h3 under h2 and h4 under h3', () => {
    expect(
      tree(h('h2', 'A'), h('h3', 'B'), h('h4', 'C'), h('h3', 'D'), h('h2', 'E')),
    ).toEqual([item('a', [item('b', [item('c')]), item('d')]), item('e')]);
  });

  it('puts an h4 straight after an h2 under that h2 (skipped level)', () => {
    expect(tree(h('h2', 'A'), h('h4', 'B'))).toEqual([item('a', [item('b')])]);
  });

  it('does not attach an h4 to an h3 from an earlier h2', () => {
    expect(tree(h('h2', 'A'), h('h3', 'B'), h('h2', 'C'), h('h4', 'D'))).toEqual([
      item('a', [item('b')]),
      item('c', [item('d')]),
    ]);
  });

  it('keeps headings with nothing above them at the top level', () => {
    expect(tree(h('h4', 'A'), h('h3', 'B'), h('h4', 'C'))).toEqual([item('a'), item('b', [item('c')])]);
  });

  it('lists every heading exactly once, with the anchors the body renders', () => {
    const headings = extractHeadings(body(h('h2', 'A'), h('h3', 'A'), h('h4', 'A'), h('h2', 'A')));
    const flat: string[] = [];
    const walk = (items: ReturnType<typeof toTocTree>) =>
      items.forEach((x) => (flat.push(x.id), walk(x.children)));
    walk(toTocTree(headings));
    expect(flat).toEqual(ids(headings));
    expect(new Set(flat).size).toBe(flat.length);
  });
});
