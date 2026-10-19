# Self-hosted fonts

The KI HUB typeface, committed as a file instead of fetched from Google Fonts at build time.
Since 025 Inter is the only one: Source Serif 4 (display/headings) was removed.

| File | Family | Axes | Used for |
| --- | --- | --- | --- |
| `Inter-Variable.woff2` | Inter | `wght 400..600` | everything: headings, reading text, navigation, labels |

It is the **latin subset, variable** build — byte-for-byte the same files
`next/font/google` was already downloading, so the switch to `next/font/local` changed nothing
visually. (Google's CSS API returns one variable file per family and points every requested static
weight at it; requesting `400;500;600` yielded three identical copies.)

## Why they live here

`next/font/google` self-hosts at runtime but downloads at **build** time, so `next build` needed
network access to `fonts.gstatic.com` and failed without it. Committing the files makes the build
deterministic, offline-capable and faster; runtime behaviour is unchanged (the fonts were always
served from our own origin, never from Google).

## Licence

Inter is licensed under the **SIL Open Font License 1.1**, which permits redistribution —
`Inter-OFL.txt` is the upstream licence text and must stay alongside the font.

- Inter — https://github.com/rsms/inter

## Refreshing them

Rarely needed. Fetch the latin variable woff2 that Google's CSS API points at, replacing the file
and its licence text:

```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
curl -sS -H "User-Agent: $UA" 'https://fonts.googleapis.com/css2?family=Inter:wght@400..600&display=swap'
```

Take the `woff2` URL from the block commented `/* latin */`, download it, and keep the filename
above so `src/app/themed-html.tsx` needs no change.
