/**
 * 023 — an in-memory stand-in for the Payload local API, used by the DB-free parity harness
 * (specs/023-content-source-seam/research.md R8).
 *
 * It is deliberately NOT a query engine. `find` honours only what makes a rendered page
 * deterministic — `slug` equality, `status: 'published'`, sort, and paging — and ignores every
 * other predicate (date ranges, type/format filters). What the real query asked for is instead
 * captured verbatim in `calls`, so the harness can snapshot the queries next to the HTML: a query
 * that changes shows up there even when the fake's answer would not.
 *
 * Relations: fixture documents store relation fields as ids. When `depth` is not 0 the fake
 * populates them one level from the fixture set (Payload's default depth is 2, so any depth > 0
 * populates), and an id that does not resolve stays a bare id — the "unpopulated relation" edge.
 */

export type Doc = Record<string, unknown> & { id: number };

export interface FixtureSet {
  collections: Record<string, Doc[]>;
  globals: Record<string, Record<string, unknown> | null>;
}

export interface FakeCall {
  op: 'find' | 'findGlobal';
  collection?: string;
  slug?: string;
  where?: unknown;
  sort?: unknown;
  limit?: number;
  page?: number;
  depth?: number;
  overrideAccess?: boolean;
}

/** `collection → field → related collection` for the relations the employee surfaces read. */
const RELATIONS: Record<string, Record<string, string>> = {
  news: { author: 'users', heroImage: 'media' },
  'learning-pages': {
    author: 'users',
    category: 'learning-categories',
    subcategory: 'learning-subcategories',
  },
  'learning-subcategories': { category: 'learning-categories' },
};

interface FindArgs {
  collection: string;
  where?: unknown;
  sort?: string | string[];
  limit?: number;
  page?: number;
  depth?: number;
  overrideAccess?: boolean;
}

/** Collects `{ field: { equals } }` constraints for the two fields the fake honours. */
function equalsConstraints(where: unknown, out: Record<string, unknown> = {}): Record<string, unknown> {
  if (!where || typeof where !== 'object') return out;
  const node = where as Record<string, unknown>;
  for (const [key, value] of Object.entries(node)) {
    if (key === 'and' && Array.isArray(value)) {
      for (const child of value) equalsConstraints(child, out);
    } else if ((key === 'slug' || key === 'status') && value && typeof value === 'object') {
      const op = value as { equals?: unknown };
      if ('equals' in op) out[key] = op.equals;
    }
  }
  return out;
}

function compare(a: unknown, b: unknown): number {
  // Nulls/undefined sort last (ascending) — deterministic, which is all the harness needs.
  const aNil = a === null || a === undefined;
  const bNil = b === null || b === undefined;
  if (aNil || bNil) return aNil === bNil ? 0 : aNil ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function sortDocs(docs: Doc[], sort?: string | string[]): Doc[] {
  if (!sort) return docs;
  const keys = (Array.isArray(sort) ? sort : [sort]).map((key) =>
    key.startsWith('-') ? { field: key.slice(1), dir: -1 } : { field: key, dir: 1 },
  );
  // Array.prototype.sort is stable, so fixture order is the final tiebreaker.
  return [...docs].sort((a, b) => {
    for (const { field, dir } of keys) {
      const result = compare(a[field], b[field]);
      if (result !== 0) return dir === 1 ? result : -result;
    }
    return 0;
  });
}

export function createFakePayload(initial: FixtureSet) {
  let fixtures = initial;
  const calls: FakeCall[] = [];

  function record(call: FakeCall) {
    const clean = Object.fromEntries(
      Object.entries(call).filter(([, value]) => value !== undefined),
    ) as FakeCall;
    // A deep copy, so a caller mutating its query object later cannot rewrite the log.
    calls.push(JSON.parse(JSON.stringify(clean)) as FakeCall);
  }

  function populate(collection: string, doc: Doc, depth: number | undefined): Doc {
    if (depth === 0) return doc;
    const relations = RELATIONS[collection];
    if (!relations) return doc;
    const result: Doc = { ...doc };
    for (const [field, target] of Object.entries(relations)) {
      const value = doc[field];
      if (typeof value !== 'number') continue;
      const related = (fixtures.collections[target] ?? []).find((d) => d.id === value);
      if (related) result[field] = related;
    }
    return result;
  }

  return {
    calls,
    resetCalls() {
      calls.length = 0;
    },
    useFixtures(set: FixtureSet) {
      fixtures = set;
    },

    async find({ collection, where, sort, limit = 10, page = 1, depth, overrideAccess }: FindArgs) {
      record({ op: 'find', collection, where, sort, limit, page, depth, overrideAccess });
      const constraints = equalsConstraints(where);
      const matching = (fixtures.collections[collection] ?? []).filter((doc) =>
        Object.entries(constraints).every(([field, expected]) => doc[field] === expected),
      );
      const sorted = sortDocs(matching, sort);
      const totalDocs = sorted.length;
      const totalPages = totalDocs === 0 ? 0 : Math.ceil(totalDocs / limit);
      const docs = sorted
        .slice((page - 1) * limit, page * limit)
        .map((doc) => populate(collection, doc, depth));
      return { docs, totalDocs, totalPages, page, limit };
    },

    async findGlobal({ slug, depth, overrideAccess }: { slug: string; depth?: number; overrideAccess?: boolean }) {
      record({ op: 'findGlobal', slug, depth, overrideAccess });
      return fixtures.globals[slug] ?? null;
    },
  };
}

export type FakePayload = ReturnType<typeof createFakePayload>;

/** For `vi.mock('payload', …)` factories: the module surface the read layers import. */
export function mockPayloadModule(fake: FakePayload) {
  return { getPayload: async () => fake };
}
