# Contract: deck route — `GET /retningslinje/deck/<path…>`

Implements FR-005, FR-006, FR-007, FR-009, FR-010, FR-015, FR-016. File:
`src/app/(app)/retningslinje/deck/[...path]/route.ts` (GET only; every other method is 405 by Next).

## A. Decision order (first match wins)

| # | Condition | Response |
|---|---|---|
| 1 | `GUIDELINE_DECK_ENABLED` is not exactly `"true"` | `404` plain `Not found` (no session look-up) |
| 2 | no `auth()` session user | `303` → `/signin` (no body, no deck info) |
| 3 | `resolveDeckPath(segments)` fails | `404` plain `Not found` |
| 4 | `store.read(key)` returns nothing | `404` plain `Not found` |
| 5 | otherwise | `200` with the file body |

Guests and other-tenant accounts never hold a session (the sign-in gate refuses them), so rule 2 covers
them exactly as it covers every employee-only page. Store errors other than "not found" → `500`
`Internal error` (logged server-side with the key, never with the body).

## B. `resolveDeckPath(segments: string[])` (pure, in `lib/guideline-deck.ts`)

Input: the decoded `params.path` array. Output: `{ ok: true, key, contentType } | { ok: false }`.

- 1–4 segments; each segment URL-decoded **once** (a second `%2e%2e` stays literal and fails the charset).
- each segment must match `^[A-Za-z0-9][A-Za-z0-9._-]*$` — rejects `..`, `.`, empty, dotfiles, `/`, `\`,
  NUL, spaces, `%`.
- last segment's extension (case-insensitive) must be in:
  `html→text/html; charset=utf-8`, `css→text/css; charset=utf-8`, `js→text/javascript; charset=utf-8`,
  `woff2→font/woff2`, `svg→image/svg+xml`, `png→image/png`, `jpg|jpeg→image/jpeg`, `webp→image/webp`,
  `gif→image/gif`, `json→application/json`. Anything else (incl. `md`, `map`, none) → not ok.
- `key` = segments joined with `/` (the store adds its own prefix/root).
- disk store additionally asserts `path.resolve(root, key)` starts with `root + path.sep`.

## C. Response headers (200)

| Header | Value |
|---|---|
| `Content-Type` | from B |
| `Cache-Control` | `private, no-store` |
| `X-Robots-Tag` | `noindex, nofollow` |
| `Content-Security-Policy` (HTML responses only) | `default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'` |
| app-wide (`security-headers.mjs`) | HSTS, `nosniff`, `X-Frame-Options: SAMEORIGIN`, Referrer-Policy, Permissions-Policy |

`Content-Length` is set when the store knows it. No `ETag`/`Last-Modified` (no revalidation caching).

## D. Store interface (`lib/guideline-deck.ts`)

```ts
interface DeckStore {
  read(key: string): Promise<{ body: ReadableStream<Uint8Array>; size?: number } | null>
  exists(key: string): Promise<boolean>   // used by the page to choose DeckFrame vs the fallback alert
}
diskDeckStore(root: string): DeckStore          // MEDIA_STORAGE_MODE=disk
azureDeckStore(cfg: AzureDeckConfig): DeckStore // MEDIA_STORAGE_MODE=azure, container GUIDELINE_DECK_CONTAINER, prefix "retningslinje/"
getDeckStore(env?): DeckStore                   // validates env; throws naming every missing variable
```

Azure: `BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING)`;
`BlobNotFound` (404) → `null`; the container is provisioned out of band (the app never creates it).

## E. Tests (contract level)

`tests/integration/guideline-deck-route.test.ts` (mock `@/auth` as in `route-protection.test.ts`, disk
store pointed at the synthetic fixture via `GUIDELINE_DECK_DIR`):
off → 404 with or without a session; no session → 303 `/signin` for entry, asset, font; session → 200 +
headers for entry/asset/font; `README.md`, `..%2f`, `%2e%2e`, `..\\x`, dotfile, unknown extension,
5 segments, bare folder → 404; the body of every 404/303 contains no fixture text.
