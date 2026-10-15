# Data Model: Content Source Seam (023)

**No stored data changes.** No collection, global, field or migration is added or altered.
Everything below is a TypeScript *view model*: the KI Hub-owned shape that employee pages consume,
plus how today's Payload documents map onto it. TypeScript sketches are illustrative; the contracts
in `contracts/` are normative.

## Module and source configuration

| Module key | Setting | Default | Accepted today | Facade file |
|---|---|---|---|---|
| `news` | `CONTENT_SOURCE_NEWS` | `payload` | `payload` | `lib/news.ts` |
| `events` | `CONTENT_SOURCE_EVENTS` | `payload` | `payload` | `lib/events.ts` |
| `projects` | `CONTENT_SOURCE_PROJECTS` | `payload` | `payload` | `lib/projects.ts` |
| `learning` | `CONTENT_SOURCE_LEARNING` | `payload` | `payload` | `lib/learning.ts` |
| `frontpage` | `CONTENT_SOURCE_FRONTPAGE` | `payload` | `payload` | `lib/site-content.ts` (`getFrontpageContent`) |
| `siteChrome` | `CONTENT_SOURCE_SITE_CHROME` | `payload` | `payload` | `lib/site-content.ts` (`getSiteChrome`) |

Validation: trim → lower-case → empty means default → must be in the accepted set, or startup fails
(contracts/content-source.md §2).

## Shared value types (`lib/content/types.ts`, `lib/content/rich-text.ts`)

### RichTextContent
| Field | Type | Notes |
|---|---|---|
| `format` | `'lexical'` | Discriminant. Future members (e.g. `'html'`) are added by the feature that introduces them. |
| `document` | `LexicalDocument` | The lexical root JSON, the same shape as today's `RichTextValue` (renamed). |

**Payload mapping**: `{ format: 'lexical', document: doc.body }` (news/project/learning `body`,
event `description`, frontpage chip `description`, `requestAccess.body`).

### ImageRendition
| Field | Type |
|---|---|
| `url` | `string \| null` |
| `width` | `number \| null` |
| `height` | `number \| null` |

### ContentImage
| Field | Type | Payload `Media` source |
|---|---|---|
| `url` | `string \| null` | `url` |
| `width`, `height` | `number \| null` | `width`, `height` |
| `alt` | `string` | `alt` |
| `focalX`, `focalY` | `number \| null` (0–100) | `focalX`, `focalY`. `null` stays `null`; helpers apply `?? 50`. |
| `updatedAt` | `string \| null` | `updatedAt` (source of the `?v=` cache-buster) |
| `renditions` | `Partial<Record<'card'\|'card2x'\|'content'\|'content2x', ImageRendition>>` | `sizes.<name>` → `{url, width, height}` (each `?? null`). A size key that is absent stays absent. |

**Mapping rule**: `toContentImage(value)` returns `null` for `null`/`undefined`/a bare id (an
unpopulated relation), otherwise the mapped object. It never drops a rendition or tightens
nullability (research R3).

### Author
| Field | Type | Payload source |
|---|---|---|
| `name` | `string \| null` | `author.name` when `author` is a populated `User` |
| `email` | `string \| null` | `author.email` |

`null` when the relation is unset or unpopulated. Pages keep their own byline rule
(`name || email || fallback`).

## Module view models

### NewsArticle (`news`)
| Field | Type | Payload `News` source |
|---|---|---|
| `id` | `string` | `String(id)` |
| `slug` | `string` | `slug ?? ''` |
| `title` | `string` | `title` |
| `summary` | `string \| null` | `summary ?? null` |
| `body` | `RichTextContent` | `body` |
| `publishDate` | `string \| null` | `publishDate ?? null` |
| `tags` | `string[]` | `(tags ?? []).filter(Boolean)` (the filter the article page does today) |
| `author` | `Author \| null` | `author` (depth 1) |
| `hero` | `NewsHero` | `resolveHeroSource(heroImage, heroImageUrl)`, which moves here (R4) |

`NewsHero = { kind: 'image'; image: ContentImage } | { kind: 'legacy'; url: string } | { kind: 'none' }`.
Precedence: populated media **with `url`** > trimmed non-empty `heroImageUrl` > none.

Dropped: `status`, `featured` (inert since 013), `heroImageUrl`/`heroImage` (folded into `hero`),
`createdAt`, `updatedAt`.

### NewsPage
`{ articles: NewsArticle[]; page: number; totalPages: number; totalDocs: number }`. The semantics
are unchanged (clamp, empty archive → page 1).

### EventItem (`events`)
| Field | Type | Payload `Event` source |
|---|---|---|
| `id` | `string` | `String(id)` |
| `slug` | `string` | `slug ?? ''` |
| `title` | `string` | `title` |
| `description` | `RichTextContent` | `description` |
| `startDateTime` | `string` | `startDateTime` |
| `endDateTime` | `string \| null` | `endDateTime ?? null` |
| `location`, `onlineUrl`, `organizer`, `channel` | `string \| null` | same names, `?? null` |
| `eventType` | `EventTypeValue` | `eventType` |
| `format` | `EventFormatValue` | `format` |
| `capacity`, `seatsTaken` | `number \| null` | same names, `?? null` |

Dropped: `status`, `featured` (ordering is applied in the source), `tags` (no employee surface reads
event tags, checked on `main` @ 673fefa), timestamps.
`EventItem` satisfies `IcsEvent` (`lib/ics.ts`) structurally, so the ICS route is unchanged.

### ProjectItem (`projects`)
| Field | Type | Payload `Project` source |
|---|---|---|
| `id` | `string` | `String(id)` |
| `slug` | `string` | `slug ?? ''` |
| `title` | `string` | `title` |
| `summary` | `string \| null` | `summary ?? null` |
| `body` | `RichTextContent` | `body` |

### LearningArticle (`learning`, one page)
| Field | Type | Payload `LearningPage` source |
|---|---|---|
| `id` | `string` | `String(id)` |
| `slug` | `string` | `slug ?? ''` |
| `title` | `string` | `title` |
| `summary` | `string \| null` | `summary ?? null` |
| `body` | `RichTextContent` | `body` |
| `updatedAt` | `string` | `updatedAt` |
| `categoryTitle` | `string` | populated `category.title`, else `''` (today's `relationTitle`) |
| `subcategoryTitle` | `string` | populated `subcategory.title`, else `''` |
| `author` | `Author \| null` | `author` |

### LearningLibrary (`learning`, tree inputs)
This is **unchanged**: it is already neutral (`learning-view.ts`, ids typed `number | string`). Only
its producer moves into the Payload adapter.

### FrontpageContent / SiteChrome (`frontpage`, `siteChrome`)
These keep their existing neutral shapes in `site-content-defaults.ts`, with one change:
`Chip.description?: RichTextContent` and `RequestAccess.body: RichTextContent` (were the raw lexical
`RichTextValue`).

`DEFAULT_FRONTPAGE` keeps the **stored** lexical shape, because it is also the Payload global's
`defaultValue`. It is retyped as `FrontpageDefaults` (the stored shape), and `mergeFrontpage` (moved
into the Payload adapter) wraps both stored and defaulted rich text into `RichTextContent` (R12).
`mergeSiteChrome` moves alongside it, unchanged.

## Source ports (`lib/content/ports.ts`)

```ts
interface NewsSource {
  listPublished(): Promise<NewsArticle[]>;
  listPublishedPage(page: number): Promise<NewsPage>;
  getPublishedBySlug(slug: string): Promise<NewsArticle | null>;
}
interface EventsSource {
  listUpcoming(filters?: { types?: EventTypeValue[]; form?: EventFormatValue }): Promise<EventItem[]>;
  listInRange(fromIso: string, toIso: string): Promise<EventItem[]>;
  getPublishedBySlug(slug: string): Promise<EventItem | null>;
}
interface ProjectsSource {
  listPublished(): Promise<ProjectItem[]>;
  getPublishedBySlug(slug: string): Promise<ProjectItem | null>;
}
interface LearningSource {
  readLibrary(): Promise<LearningLibrary>;
  getPublishedPageBySlug(slug: string): Promise<LearningArticle | null>;
}
interface FrontpageSource  { getFrontpage(): Promise<FrontpageContent>; }
interface SiteChromeSource { getSiteChrome(): Promise<SiteChrome>; }
```

Each method's guarantees (published-only, ordering, clamp, `null` = not found) are listed in
contracts/content-source.md §3.

## State transitions

None. The feature introduces no lifecycle. The draft→published status remains a Payload field,
enforced inside the Payload source exactly as today.
