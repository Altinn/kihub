---
title: 'Slutt å spørre KI-en om ting den ikke vet – gi den fakta 📚'
description: 'Grounding: slik gir du KI-en tilgang til riktig kunnskap i stedet for å la den gjette fra hukommelsen.'
lastUpdated: 2026-06-26
estimatedReadingTime: '4 minutter'
prev: false
next: false
---

Et tidligere innlegg så vi på hvordan du avslører om KI-en bommer. Denne uken ser vi på hvordan du **forebygger** det. Hemmeligheten er ikke smartere spørsmål – det er å gi KI-en tilgang til riktig kunnskap. Fagfolk kaller det **grounding**:

KI-en svarer fra faktiske kilder i stedet for å gjette fra hukommelsen. Her er trappen, fra enklest til mest avansert:

---

## 📄 Trinn 1: Gi den dokumentet

Ikke spør "hva sier forvaltningsloven om innsyn?" – last opp eller lim inn teksten og spør "hva sier **dette dokumentet** om innsyn?" Da svarer KI-en fra teksten din, ikke fra noe den "mener å huske".

**Eksempel:**
> "Her er høringsnotatet. Hvilke av innvendingene gjelder personvern? Siter avsnittene du bygger på."

:::caution
Husk at du ikke skal dele sensitivt innhold med KI-en.
:::

---

## 🌐 Trinn 2: Skru på nettsøk

De fleste KI-verktøy kan nå søke på nettet. Da henter den ferske kilder i stedet for å gjette ut fra treningsdata som kan være måneder eller år gamle.

Spesielt viktig for alt som endrer seg: regelverk, satser, hvem som har hvilken rolle.

---

## 🗂️ Trinn 3: Bruk Prosjekter

I Claude (og tilsvarende i andre verktøy) kan du opprette et prosjekt med faste bakgrunnsdokumenter og instruksjoner. Da slipper du å laste opp det samme hver gang – KI-en har alltid kildene dine til grunn.

Perfekt for arbeid som går over tid.

---

## 🔌 Trinn 4: MCP – koble KI-en rett på kilden

Dette er nytt og ganske kraftig: **MCP (Model Context Protocol)** er en åpen standard som lar KI-verktøy koble seg direkte til databaser og fagsystemer.

Tenk deg en KI koblet til Lovdata – KITT-teamet har laget en eksperimentell prototype. Bruk den på eget ansvar her: [Digdir Norwegian Law MCP](https://altinn.github.io/kihub/tools/) (se etter "Digdir Norwegian Law MCP").

I stedet for å gjengi en paragraf etter hukommelsen, slår den opp i gjeldende lovtekst – og du får svar med riktig ordlyd og henvisning. Forskjellen på en kollega som siterer etter hukommelsen, og en som har loven oppslått foran seg.

---

## ⚠️ Men husk

Grounding **reduserer** feil, den **fjerner** dem ikke. KI-en kan misforstå selv et dokument den har rett foran seg. Verifiseringstipsene gjelder fortsatt – de to hører sammen.
