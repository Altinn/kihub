import config from '@payload-config';
import { GRAPHQL_POST, REST_DELETE, REST_GET, REST_PATCH, REST_POST } from '@payloadcms/next/routes';
import { encode } from 'next-auth/jwt';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Security audit 2026-11-20, F-01 and F-02. Drives Payload's REAL REST and GraphQL route handlers
 * (the ones mounted at `/payload-api`) with a real Auth.js session cookie, so the request goes
 * through `payload-strategy.ts` exactly as a browser's would. Local-API tests with
 * `overrideAccess: false` would miss GraphQL and the per-request `req.user` resolution.
 *
 * F-01: a Reader could create an Admin, list and delete users, and move their session onto an
 *       Admin record by rewriting `entraOid` and creating a record with their real oid.
 * F-02: published content, media and globals were readable with no session at all.
 */
let payload: Payload;
const testId = 'payload-api-access-0001';
const TENANT = '00000000-0000-0000-0000-000000000000';
const ORIGIN = 'http://localhost:3000';
// What getToken reads when `secureCookie` is false (NODE_ENV is not production in vitest).
const COOKIE = 'authjs.session-token';

type U = { id: number; entraOid: string; email: string };
const users: Record<'eve' | 'alice' | 'victim' | 'editor', U> = {} as never;
const cookies: Record<'eve' | 'alice', string> = {} as never;

const rest = {
  get: REST_GET(config),
  post: REST_POST(config),
  patch: REST_PATCH(config),
  del: REST_DELETE(config),
};
const graphql = GRAPHQL_POST(config);

function request(method: string, path: string, cookie?: string, body?: unknown) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (cookie) headers.set('cookie', `${COOKIE}=${cookie}`);
  return new Request(`${ORIGIN}/payload-api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function call(
  handler: (req: Request, args: { params: Promise<{ slug: string[] }> }) => Promise<Response>,
  method: string,
  path: string,
  cookie?: string,
  body?: unknown,
) {
  const slug = path.split('?')[0]!.split('/').filter(Boolean);
  return handler(request(method, path, cookie, body), { params: Promise.resolve({ slug }) });
}

async function gql(query: string, cookie?: string) {
  const res = await graphql(request('POST', '/graphql', cookie, { query }));
  return { status: res.status, body: (await res.json()) as { data?: unknown; errors?: unknown[] } };
}

async function sessionFor(oid: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET must be set (source apps/web/.env)');
  return encode({ token: { oid, sub: oid }, secret, salt: COOKIE });
}

async function makeUser(name: string, role: string): Promise<U> {
  const doc = await payload.create({
    collection: 'users',
    data: {
      entraOid: `test-oid-${testId}-${name}`,
      email: `${name}.${testId}@digdir.no`,
      name,
      tenantId: TENANT,
      role: role as never,
    },
    overrideAccess: true,
  });
  return { id: doc.id, entraOid: doc.entraOid, email: doc.email };
}

async function userByEmail(email: string) {
  const r = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  });
  return r.docs[0];
}

async function cleanup() {
  const found = await payload.find({
    collection: 'users',
    where: {
      or: [
        { entraOid: { like: `%${testId}%` } },
        { email: { like: `%${testId}%` } },
      ],
    },
    limit: 100,
    overrideAccess: true,
  });
  const ids = found.docs.map((d) => d.id);
  await payload.delete({
    collection: 'audit-log',
    where: {
      or: [
        ...(ids.length ? [{ actor: { in: ids } }, { targetUser: { in: ids } }] : []),
        // Payload refuses `like` on a JSON path; the deleted user's row is found by exact email.
        { 'details.email': { equals: `victim.${testId}@digdir.no` } },
      ],
    },
    overrideAccess: true,
  });
  await payload.delete({ collection: 'news', where: { slug: { like: `${testId}%` } }, overrideAccess: true });
  if (ids.length) {
    await payload.delete({ collection: 'users', where: { id: { in: ids } }, overrideAccess: true });
  }
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await cleanup();
  users.eve = await makeUser('eve', 'reader');
  users.alice = await makeUser('alice', 'admin');
  users.victim = await makeUser('victim', 'reader');
  users.editor = await makeUser('editor', 'contributor');
  cookies.eve = await sessionFor(users.eve.entraOid);
  cookies.alice = await sessionFor(users.alice.entraOid);
  await payload.create({
    collection: 'news',
    data: {
      title: `Intern nyhet ${testId}`,
      slug: `${testId}-news`,
      summary: 'Kun for ansatte',
      body: {
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
              children: [
                { type: 'text', text: 'INTERN', format: 0, style: '', mode: 'normal', detail: 0, version: 1 },
              ],
            },
          ],
        },
      },
      _status: 'published',
    } as never,
    overrideAccess: true,
  });
}, 120000);

afterAll(async () => {
  if (payload) await cleanup();
});

describe('F-01: users collection through REST', () => {
  it('resolves the session cookie to the Reader (control)', async () => {
    const res = await call(rest.get, 'GET', '/users/me', cookies.eve);
    const body = (await res.json()) as { user?: { id: number; role: string } };
    expect(body.user?.id).toBe(users.eve.id);
    expect(body.user?.role).toBe('reader');
  });

  it('refuses a Reader creating a user, Admin or not', async () => {
    const res = await call(rest.post, 'POST', '/users', cookies.eve, {
      entraOid: `test-oid-${testId}-forged`,
      email: `forged.${testId}@digdir.no`,
      role: 'admin',
    });
    expect(res.status).toBe(403);
    expect(await userByEmail(`forged.${testId}@digdir.no`)).toBeUndefined();
  });

  it('refuses an Admin creating a user too: users come only from sign-in', async () => {
    const res = await call(rest.post, 'POST', '/users', cookies.alice, {
      entraOid: `test-oid-${testId}-byadmin`,
      email: `byadmin.${testId}@digdir.no`,
    });
    expect(res.status).toBe(403);
  });

  it('shows a Reader only their own record', async () => {
    const res = await call(rest.get, 'GET', '/users?limit=100', cookies.eve);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { docs: { id: number }[] };
    expect(body.docs.map((d) => d.id)).toEqual([users.eve.id]);
  });

  it('refuses a Reader reading another user by id', async () => {
    const res = await call(rest.get, 'GET', `/users/${users.alice.id}`, cookies.eve);
    expect([403, 404]).toContain(res.status);
  });

  it('refuses a Reader deleting another user, an Admin included', async () => {
    const res = await call(rest.del, 'DELETE', `/users/${users.alice.id}`, cookies.eve);
    expect(res.status).toBe(403);
    expect(await userByEmail(users.alice.email)).toBeDefined();
  });

  it('refuses a Reader deleting their own record', async () => {
    const res = await call(rest.del, 'DELETE', `/users/${users.eve.id}`, cookies.eve);
    expect(res.status).toBe(403);
    expect(await userByEmail(users.eve.email)).toBeDefined();
  });

  it('never lets a user change their own entraOid, tenantId or email', async () => {
    await call(rest.patch, 'PATCH', `/users/${users.eve.id}`, cookies.eve, {
      entraOid: `test-oid-${testId}-moved`,
      tenantId: 'other-tenant',
      email: `moved.${testId}@digdir.no`,
      name: 'Eve renamed',
    });
    const after = await userByEmail(users.eve.email);
    expect(after?.entraOid).toBe(users.eve.entraOid);
    expect(after?.tenantId).toBe(TENANT);
    expect(after?.name).toBe('Eve renamed');
  });

  it("still refuses a Reader changing their own role, with the guard's message", async () => {
    const res = await call(rest.patch, 'PATCH', `/users/${users.eve.id}`, cookies.eve, {
      role: 'admin',
    });
    expect(res.status).toBe(403);
    expect((await userByEmail(users.eve.email))?.role).toBe('reader');
  });

  it('lets an Admin delete a user and records it in audit-log', async () => {
    const res = await call(rest.del, 'DELETE', `/users/${users.victim.id}`, cookies.alice);
    expect(res.status).toBe(200);
    expect(await userByEmail(users.victim.email)).toBeUndefined();
    const log = await payload.find({
      collection: 'audit-log',
      where: { action: { equals: 'user-delete' }, 'details.email': { equals: users.victim.email } },
      depth: 0,
      overrideAccess: true,
    });
    expect(log.docs).toHaveLength(1);
    expect(log.docs[0]?.actor).toBe(users.alice.id);
    expect((log.docs[0]?.details as { entraOid?: string })?.entraOid).toBe(users.victim.entraOid);
  });
});

describe('F-01: users collection through GraphQL', () => {
  it('blocks the one-request takeover (rename own entraOid, create an Admin with the real oid)', async () => {
    const { body } = await gql(
      `mutation {
        a: updateUser(id: ${users.eve.id}, data: { entraOid: "test-oid-${testId}-renamed" }) { id }
        b: createUser(data: { entraOid: "${users.eve.entraOid}", email: "takeover.${testId}@digdir.no", role: admin }) { id role }
      }`,
      cookies.eve,
    );
    expect(body.errors?.length ?? 0).toBeGreaterThan(0);
    expect(await userByEmail(`takeover.${testId}@digdir.no`)).toBeUndefined();
    expect((await userByEmail(users.eve.email))?.entraOid).toBe(users.eve.entraOid);

    const me = await call(rest.get, 'GET', '/users/me', cookies.eve);
    const meBody = (await me.json()) as { user?: { id: number; role: string } };
    expect(meBody.user?.id).toBe(users.eve.id);
    expect(meBody.user?.role).toBe('reader');
  });

  it('refuses a Reader deleting a user and listing users', async () => {
    const del = await gql(`mutation { deleteUser(id: ${users.alice.id}) { id } }`, cookies.eve);
    expect(del.body.errors?.length ?? 0).toBeGreaterThan(0);
    expect(await userByEmail(users.alice.email)).toBeDefined();

    const list = await gql(`{ Users(limit: 100) { docs { id email } } }`, cookies.eve);
    const docs = (list.body.data as { Users?: { docs: { id: number }[] } } | undefined)?.Users?.docs;
    expect(docs?.map((d) => d.id) ?? []).toEqual([users.eve.id]);
  });
});

describe('F-02: /payload-api needs a session for content', () => {
  const anonymousPaths = [
    '/news',
    '/pages',
    '/events',
    '/projects',
    '/learning-pages',
    '/learning-categories',
    '/learning-subcategories',
    '/media',
    '/globals/frontpage',
    '/globals/site-chrome',
  ];

  it.each(anonymousPaths)('refuses an anonymous GET %s', async (path) => {
    const res = await call(rest.get, 'GET', path);
    expect(res.status).toBe(403);
  });

  it('refuses anonymous media file downloads', async () => {
    const res = await call(rest.get, 'GET', '/media/file/anything.png');
    expect(res.status).toBe(403);
  });

  it('refuses an anonymous GraphQL read of news', async () => {
    const { body } = await gql(`{ allNews(limit: 100) { docs { title } } }`);
    const docs = (body.data as { allNews?: { docs: { title: string }[] } } | undefined)?.allNews?.docs ?? [];
    expect(docs.map((d) => d.title)).not.toContain(`Intern nyhet ${testId}`);
  });

  it('still serves published news, media and globals to a signed-in Reader', async () => {
    const news = await call(rest.get, 'GET', `/news?where[slug][equals]=${testId}-news`, cookies.eve);
    expect(news.status).toBe(200);
    const body = (await news.json()) as { docs: { title: string }[] };
    expect(body.docs.map((d) => d.title)).toContain(`Intern nyhet ${testId}`);

    for (const path of ['/media', '/learning-categories', '/globals/frontpage', '/globals/site-chrome']) {
      const res = await call(rest.get, 'GET', path, cookies.eve);
      expect(res.status, path).toBe(200);
    }
  });
});
