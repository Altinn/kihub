import type { Role } from '@kihub/governance-core';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Event } from '@/payload-types';

/**
 * T010 (US2/US3, FR-002/003/006/007/011/013) — the Events authoring access matrix and the
 * published-only visibility invariant, exercised through the Payload local API with
 * `overrideAccess: false` + an explicit `user` (the same enforcement path the admin/REST API takes).
 * Proves: Contributor+ can author/publish/delete; Reader/anonymous are refused; slugs are unique; an
 * end-before-start event is rejected; and a Reader-scoped read returns only published events (never a
 * draft, including by slug). Mirrors tests/integration/news-access.test.ts.
 */
let payload: Payload;
const testId = 'events-access-0001';
type Doc = { id: number; role: Role };
const users: Record<'reader' | 'contributor', Doc> = {} as never;
let publishedId: number;
let draftId: number;
let draftSlug: string;

/** Minimal valid lexical editor state for the required rich-text `description`. */
function lexical(text: string): Event['description'] {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          textFormat: 0,
          children: [{ type: 'text', text, format: 0, style: '', mode: 'normal', detail: 0, version: 1 }],
        },
      ],
    },
  } as Event['description'];
}

/**
 * Create an event as `user` (or anonymously). The `data` cast at the Payload boundary keeps call
 * sites typed for the fields we set while satisfying Payload's create-input type (its rich-text and
 * hook-derived `slug` typing is stricter than what we hand-build here).
 */
function createEvent(
  data: {
    title: string;
    description: Event['description'];
    startDateTime: string;
    endDateTime?: string;
    slug?: string;
    status?: 'draft' | 'published';
    eventType?: Event['eventType'];
    format?: Event['format'];
    location?: string;
    capacity?: number;
    seatsTaken?: number;
  },
  user?: Doc,
) {
  return payload.create({
    collection: 'events',
    data: data as never,
    overrideAccess: false,
    ...(user ? { user } : {}),
  });
}

async function makeUser(role: Doc['role']): Promise<Doc> {
  const doc = await payload.create({
    collection: 'users',
    data: {
      entraOid: `test-oid-${testId}-${role}`,
      email: `${role}.${testId}@digdir.no`,
      name: `Test ${role}`,
      tenantId: '00000000-0000-0000-0000-000000000000',
      role,
    },
    overrideAccess: true,
  });
  return { id: doc.id, role: doc.role as Role };
}

async function cleanup() {
  await payload.delete({
    collection: 'events',
    where: { title: { like: `%${testId}%` } },
    overrideAccess: true,
  });
  const existing = await payload.find({
    collection: 'users',
    where: { entraOid: { like: `test-oid-${testId}%` } },
    limit: 100,
    overrideAccess: true,
  });
  if (existing.docs.length) {
    await payload.delete({
      collection: 'users',
      where: { id: { in: existing.docs.map((d) => d.id) } },
      overrideAccess: true,
    });
  }
}

const START = '2030-01-01T10:00:00.000Z';
const END = '2030-01-01T11:00:00.000Z';

beforeAll(async () => {
  payload = await getPayload({ config });
  await cleanup();

  users.reader = await makeUser('reader');
  users.contributor = await makeUser('contributor');

  const published = await createEvent(
    { title: `Published ${testId}`, description: lexical('published body'), startDateTime: START, status: 'published' },
    users.contributor,
  );
  publishedId = published.id;

  const draft = await createEvent(
    { title: `Draft ${testId}`, description: lexical('draft body'), startDateTime: START },
    users.contributor,
  );
  draftId = draft.id;
  draftSlug = draft.slug ?? '';
}, 120000);

afterAll(async () => {
  if (payload) await cleanup();
});

describe('Events authoring access + visibility (T010)', () => {
  it('auto-derives a slug and defaults new events to draft (FR-013/003)', async () => {
    expect(draftSlug).toBe(`draft-${testId}`);
    const draft = await payload.findByID({ collection: 'events', id: draftId, overrideAccess: true });
    expect(draft.status).toBe('draft');
    const pub = await payload.findByID({ collection: 'events', id: publishedId, overrideAccess: true });
    expect(pub.status).toBe('published');
  });

  it('refuses create for a Reader and for an anonymous request (FR-007)', async () => {
    await expect(
      createEvent({ title: `ReaderTry ${testId}`, description: lexical('x'), startDateTime: START }, users.reader),
    ).rejects.toThrow();

    await expect(
      createEvent({ title: `AnonTry ${testId}`, description: lexical('x'), startDateTime: START }),
    ).rejects.toThrow();
  });

  it('lets a Contributor update (publish) and delete (FR-002)', async () => {
    const created = await createEvent(
      { title: `Editable ${testId}`, description: lexical('x'), startDateTime: START },
      users.contributor,
    );
    const published = await payload.update({
      collection: 'events',
      id: created.id,
      data: { status: 'published' },
      overrideAccess: false,
      user: users.contributor,
    });
    expect(published.status).toBe('published');

    await payload.delete({
      collection: 'events',
      id: created.id,
      overrideAccess: false,
      user: users.contributor,
    });
    const gone = await payload.findByID({
      collection: 'events',
      id: created.id,
      overrideAccess: true,
      disableErrors: true,
    });
    expect(gone).toBeNull();
  });

  it('rejects an event whose end precedes its start (FR-011)', async () => {
    await expect(
      createEvent(
        {
          title: `BadDates ${testId}`,
          description: lexical('x'),
          startDateTime: END,
          endDateTime: START,
        },
        users.contributor,
      ),
    ).rejects.toThrow();
  });

  it('enforces slug uniqueness (FR-013)', async () => {
    await createEvent(
      { title: `Dup A ${testId}`, slug: `dup-${testId}`, description: lexical('a'), startDateTime: START },
      users.contributor,
    );
    await expect(
      createEvent(
        { title: `Dup B ${testId}`, slug: `dup-${testId}`, description: lexical('b'), startDateTime: START },
        users.contributor,
      ),
    ).rejects.toThrow();
  });

  it('shows employees (Reader) only published events, never drafts — incl. by slug (US3, FR-006)', async () => {
    const asReader = await payload.find({
      collection: 'events',
      where: { title: { like: `%${testId}%` } },
      limit: 100,
      overrideAccess: false,
      user: users.reader,
    });
    expect(asReader.docs.length).toBeGreaterThan(0);
    expect(asReader.docs.every((d) => d.status === 'published')).toBe(true);
    expect(asReader.docs.some((d) => d.id === draftId)).toBe(false);

    const bySlug = await payload.find({
      collection: 'events',
      where: { slug: { equals: draftSlug } },
      limit: 1,
      overrideAccess: false,
      user: users.reader,
    });
    expect(bySlug.docs.length).toBe(0);
  });
});

describe('012 event fields: defaults + seat validation (FR-009/012, US3)', () => {
  it('defaults eventType to internt and format to digitalt when not set (SC-005)', async () => {
    const created = await createEvent(
      { title: `Defaults ${testId}`, description: lexical('x'), startDateTime: START },
      users.contributor,
    );
    expect(created.eventType).toBe('internt');
    expect(created.format).toBe('digitalt');
    expect(created.capacity ?? null).toBeNull();
    expect(created.seatsTaken ?? null).toBeNull();
  });

  it('stores the new fields when set', async () => {
    const created = await createEvent(
      {
        title: `Full fields ${testId}`,
        description: lexical('x'),
        startDateTime: START,
        eventType: 'kurs',
        format: 'oppmote',
        location: 'Læringssenteret',
        capacity: 30,
        seatsTaken: 22,
      },
      users.contributor,
    );
    expect(created.eventType).toBe('kurs');
    expect(created.format).toBe('oppmote');
    expect(created.capacity).toBe(30);
    expect(created.seatsTaken).toBe(22);
  });

  it('rejects seatsTaken above capacity (FR-012)', async () => {
    await expect(
      createEvent(
        {
          title: `Overbooked ${testId}`,
          description: lexical('x'),
          startDateTime: START,
          capacity: 10,
          seatsTaken: 11,
        },
        users.contributor,
      ),
    ).rejects.toThrow();
  });

  it('rejects zero and fractional capacity (FR-012)', async () => {
    await expect(
      createEvent(
        { title: `ZeroCap ${testId}`, description: lexical('x'), startDateTime: START, capacity: 0 },
        users.contributor,
      ),
    ).rejects.toThrow();
    await expect(
      createEvent(
        { title: `FracCap ${testId}`, description: lexical('x'), startDateTime: START, capacity: 10.5 },
        users.contributor,
      ),
    ).rejects.toThrow();
  });

  it('rejects negative seatsTaken (FR-012)', async () => {
    await expect(
      createEvent(
        {
          title: `NegSeats ${testId}`,
          description: lexical('x'),
          startDateTime: START,
          capacity: 10,
          seatsTaken: -1,
        },
        users.contributor,
      ),
    ).rejects.toThrow();
  });
});
