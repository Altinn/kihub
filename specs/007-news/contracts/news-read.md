# Contract: employee news read surfaces

How employees read news in the Designsystemet app. Lives in `apps/web/src/lib/news.ts` (server-side
reads) and `apps/web/src/app/(app)/news/` (pages). Protected by the existing `(app)/layout.tsx`
`requireSession()` gate — only signed-in employees reach these routes.

## Read library (`lib/news.ts`)

```ts
// Published-only by construction (mirrors lib/catalog.ts's active-only pattern).
listPublishedNews(): Promise<NewsArticle[]>
// newest-first by publishDate, featured surfaced (featured-first / distinguished)

getPublishedNewsBySlug(slug: string): Promise<NewsArticle | null>
// returns the article ONLY if status = published; otherwise null (→ 404)
```

- Both queries include `status: { equals: 'published' }`. A draft or unknown slug resolves to `null`.
- Uses the Payload local API (`getPayload({ config })`), consistent with `lib/catalog.ts`.

## Routes

| Route | Renders | Notes |
|-------|---------|-------|
| `/news` | `(app)/news/page.tsx` | List of published articles, newest-first, featured surfaced; friendly empty state when none |
| `/news/<slug>` | `(app)/news/[slug]/page.tsx` | Article detail: title, byline (author name), publish date, rich-text body, optional hero image + tags; `notFound()` for a draft/unknown slug |

- New routes do not collide with `/`, `/artifacts/*`, `/admin/*`, `/signin`, or `/cms`.
- The app header/shell gains a "News" link to `/news`.

## Rendering

- List items use a Designsystemet `NewsCard` (title, summary, publish date, tags, featured marker).
- The detail body (lexical JSON) is rendered with `RichText` from `@payloadcms/richtext-lexical/react`.
- The employee UI is Designsystemet throughout (Principle VIII / Design-System mandate).

## Observable outcomes (map to FR-004/005/006/010/012, US1/US3)

| Situation | Expected |
|-----------|----------|
| Employee opens `/news` with published articles | List shows them newest-first; featured surfaced |
| Employee opens `/news` with none published | Friendly empty state (not an error/blank) |
| Employee opens `/news/<published-slug>` | Detail renders title/byline/date/body (+ hero/tags if set) |
| Employee opens `/news/<draft-or-unknown-slug>` | `notFound()` — no draft content exposed |
| Editor publishes, then employee reloads `/news` | New article appears (no redeploy) |
| Editor unpublishes, then employee reloads | Article gone from the list; its detail URL 404s |
| Unauthenticated visit to `/news` | Redirected to sign-in by `(app)/layout.tsx` (employees only) |
