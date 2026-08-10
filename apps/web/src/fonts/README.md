# Self-hosted fonts

The two KI HUB typefaces, committed as files instead of fetched from Google Fonts at build time.

| File | Family | Axes | Used for |
| --- | --- | --- | --- |
| `SourceSerif4-Variable.woff2` | Source Serif 4 | `opsz 8..60`, `wght 400..600` | display, headings, reading text |
| `Inter-Variable.woff2` | Inter | `wght 400..600` | navigation, labels, eyebrows, dates |

Both are the **latin subset, variable** builds — byte-for-byte the same files
`next/font/google` was already downloading, so the switch to `next/font/local` changed nothing
visually. (Google's CSS API returns one variable file per family and points every requested static
weight at it; requesting `400;500;600` yielded three identical copies.)

## Why they live here

`next/font/google` self-hosts at runtime but downloads at **build** time, so `next build` needed
network access to `fonts.gstatic.com` and failed without it. Committing the files makes the build
deterministic, offline-capable and faster; runtime behaviour is unchanged (the fonts were always
served from our own origin, never from Google).

## Licence

Both families are licensed under the **SIL Open Font License 1.1**, which permits redistribution —
`Inter-OFL.txt` and `SourceSerif4-OFL.txt` are the upstream licence texts and must stay alongside
the fonts.

- Inter — https://github.com/rsms/inter
- Source Serif 4 — https://github.com/adobe-fonts/source-serif

## Refreshing them

Rarely needed. Fetch the latin variable woff2 that Google's CSS API points at, replacing both files
and both licence texts:

```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
curl -sS -H "User-Agent: $UA" 'https://fonts.googleapis.com/css2?family=Inter:wght@400..600&display=swap'
```

Take the `woff2` URL from the block commented `/* latin */`, download it, and keep the filenames
above so `src/app/themed-html.tsx` needs no change.
