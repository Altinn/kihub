---
title: 'Dokumentbaserte nyheter i KI HUB'
description: 'KI HUB publiserer nå nyheter fra vanlige Markdown-filer, med metadata, bilde og artikkeltekst samlet på ett sted.'
pubDate: 2026-06-22
image: 'images/news/dokumentbaserte-nyheter.png'
imageAlt: 'Person som leser notater ved en laptop på et lyst kontor.'
color: 'brand1'
tags: ['publisering', 'ki-hub']
draft: false
---

KI HUB har fått en enkel nyhetsmodell der hver nyhet er en vanlig Markdown-fil. Det gjør at redaksjonelle oppdateringer kan ligge i repoet sammen med resten av nettstedet, uten at vi trenger et eget CMS eller en dynamisk database.

Hver fil inneholder tittel, ingress, publiseringsdato, fargetema, bilde og alternativ tekst i frontmatter. Selve artikkelteksten skrives under metadatafeltet. Når nettstedet bygges, leser Astro inn alle publiserte nyheter, sorterer dem etter dato og lager både oversiktssiden og artikkelsidene.

Dette gir en trygg og sporbar arbeidsflyt for små redaksjonelle oppdateringer. Endringer kan gå gjennom samme pull request-løp som kode, og gamle artikler blir liggende som historikk i Git.

Fremover kan teamet legge til nye nyheter ved å kopiere en eksisterende fil i `src/content/nyheter`, oppdatere metadata og legge til et bilde i `public/images/news`.
