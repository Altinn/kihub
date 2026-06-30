---
title: 'Harness, Skills, Hooks og MCP 🛠️'
description: 'Begrepene som dukker opp når du går fra å bruke KI til å bygge med den – forklart med et praktisk eksempel.'
lastUpdated: 2026-06-26
estimatedReadingTime: '4 minutter'
prev: false
next: false
tableOfContents: false
---

Ukens tips handler om begrepene som dukker opp når du går fra å bruke KI til å bygge med den. La oss følge et tenkt eksempel – du skal lage en KI-løsning som hjelper saksbehandlere med å kvalitetssikre vedtaksutkast.

## 🤖 Utgangspunktet: Harness

Selve språkmodellen kan bare lese tekst og produsere tekst. Alt rundt – løkken som lar den jobbe i flere steg, verktøyene den får bruke, hvordan kontekst håndteres – kalles **harness** (seletøy, bokstavelig talt).

Claude Code er et eksempel på en harness. Når en agent "kjører", er det harnessen som holder i tømmene.

Kvaliteten på harnessen avgjør ofte mer enn kvaliteten på modellen.

---

## 📋 Skills: gi KI-en en fagprosedyre

En **skill** er en pakke med instruksjoner, maler og eksempler som KI-en laster inn når den trenger dem.

For vår vedtaks-KI: en skill som beskriver hvordan et godt vedtak er strukturert, hvilke lovhenvisninger som kreves, og vanlige feil å se etter.

Du skriver prosedyren én gang – KI-en følger den hver gang. Tenk på det som intern opplæring, bare for KI.

---

## 🪝 Hooks: automatiske kontrollpunkter

En **hook** er kode som kjører automatisk ved bestemte hendelser – før eller etter at KI-en gjør noe.

For vår løsning: en hook som alltid kjører personvernsjekk før et utkast lagres, uansett hva modellen "har lyst til".

Det er forskjellen på å be KI-en huske noe og å **garantere** at det skjer. Hooks er deterministiske – de feiler ikke fordi modellen hadde en dårlig dag.

---

## 🔌 Og MCP binder det sammen

**MCP** (omtalt i forrige innlegg) er standarden som kobler KI-en til eksterne kilder – for vår vedtaks-KI: oppslag i gjeldende regelverk og fagsystemer, i stedet for gjetting fra treningsdata.

---

## 🧩 Hvorfor bry seg?

Fordi dette er forskjellen på en demo og en løsning som tåler drift:

- **Harness** gir kontroll på prosessen
- **Skills** gir kontroll på kvaliteten
- **Hooks** gir kontroll på reglene
- **MCP** gir kontroll på faktagrunnlaget

Du finner byggeklossene – med eksempler – i [KI Huben til KITT Teamet](https://altinn.github.io/kihub/) *(NB! KI Huben er under utvikling)*.

Bygger du noe med disse i dag? Del i kommentarfeltet – vi samler gode eksempler til KI Huben. 💬
