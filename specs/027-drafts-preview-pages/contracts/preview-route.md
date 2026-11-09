# Contract: Preview entry/exit and preview state

Research: R4, R5, R6, R7.

## A. `previewUrl` / `previewPathFor` (pure, `lib/preview-paths.ts`)

```ts
type PreviewCollection = 'news' | 'learning-pages' | 'projects' | 'events' | 'pages';

previewPathFor(collection, slug): string
// news → /news/<slug>; learning-pages → /laering/<slug>; projects → /prosjekter/<slug>;
// events → /events/<slug>; pages → /<slug>. Slug is encodeURIComponent'ed.

previewUrl(collection, slug | null | undefined): string | null
// null when slug is empty (Payload then hides the button) else
// `/api/preview?path=${encodeURIComponent(previewPathFor(collection, slug))}`

isSafeInternalPath(path: unknown): path is string
// true only for strings that start with '/', not '//' or '/\', contain no '\\', no scheme,
// no control chars, length ≤ 512.
```

Unit-tested exhaustively (table of good/bad paths incl. `//evil.com`, `/\evil.com`,
`https://evil.com`, `javascript:…`, encoded variants).

## B. `GET /api/preview?path=<internal path>`

File: `src/app/api/preview/route.ts` (Node runtime).

| Step | Condition | Response |
|---|---|---|
| 1 | `path` missing or `!isSafeInternalPath(path)` | **400** plain text «Ugyldig adresse for forhåndsvisning.» |
| 2 | no session | **307** → `/signin` |
| 3 | fresh `users` lookup by `session.user.id` → not editor (reader / missing) | **303** → `path`, preview NOT enabled (reader then sees the normal 404 for a draft) |
| 4 | editor | `draftMode().enable()`; re-set `__prerender_bypass` with `maxAge=3600; HttpOnly; Secure; SameSite=Lax; Path=/`; **303** → `path` |

Never echoes `path` into HTML; never accepts absolute URLs.

## C. `GET /api/preview/exit`

`draftMode().disable()`; **303** → the `Referer`'s pathname+search when the Referer is same-origin and
`isSafeInternalPath`, else `/`.

## D. `getPreviewState()` (`lib/preview.ts`)

```ts
export const getPreviewState: () => Promise<{ active: boolean }>  // React cache(): once per request
```

`active === true` ⇔ `draftMode().isEnabled` AND the session user's **fresh** role is contributor+.
Any failure (no session, user row missing, DB error) ⇒ `{ active: false }` (fail closed).

## E. Preview banner

`components/PreviewBanner.tsx` (Server Component), rendered first inside `.portal-shell` in
`(app)/layout.tsx` iff `active`. Designsystemet `Alert` `data-color="warning"`, `role="status"`:

> **Forhåndsvisning.** Du ser upubliserte endringer. Andre ansatte ser bare publiserte versjoner.
> [Avslutt forhåndsvisning](/api/preview/exit)

Styled only through tokens; no client JS.

## F. Detail routes

Each detail route (`news/[slug]`, `laering/[slug]`, `prosjekter/[slug]`, `events/[slug]`, `[slug]`):

```ts
const { active } = await getPreviewState();
const doc = await getXBySlug(decoded, { preview: active });
if (!doc) notFound();
```

No route exports `revalidate`, `dynamic = 'force-static'`, `generateStaticParams`, or uses
`unstable_cache` / `'use cache'` (R7) — asserted by a unit test that greps the route files.

## G. Acceptance (integration/unit + quickstart)

- Reader with a valid bypass cookie → `getPreviewState().active === false` → draft slug 404s.
- Contributor → draft renders, banner visible on every page while active.
- Role downgraded to reader mid-preview → next request: banner gone, draft 404s.
- Cookie older than 60 min → preview inactive.
