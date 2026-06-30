---
title: 'Context engineering – neste steg etter prompting 🧠'
description: 'Forstå hva som skjer under panseret når KI-en svarer – og hvordan du fyller kontekstvinduet smartere.'
lastUpdated: 2026-06-26
estimatedReadingTime: '3 minutter'
prev: false
next: false
tableOfContents: false
---

Jeg har delt mye om prompting her i Tips og Tricks-området, men denne artikkelen tar det et hakk videre: **context engineering**.

## Hva er context engineering?

Kort forklart handler det om å fylle AI-modellens "arbeidsminne" (kontekstvinduet) med akkurat den informasjonen som trengs – ikke for mye, ikke for lite.

[LangChain-bloggen](https://blog.langchain.com/context-engineering-for-agents/) bryter det ned i fire strategier:

1. **Skrive** kontekst – hva du aktivt legger inn
2. **Velge** kontekst – hva som er relevant å inkludere
3. **Komprimere** kontekst – kutte støy og beholde essensen
4. **Isolere** kontekst – holde ulike oppgaver atskilt

## Hvorfor er dette relevant for deg?

Dette er spesielt nyttig når man bygger eller jobber med AI-agenter som utfører lengre oppgaver, men konseptet gir også bedre intuisjon for **hvorfor promptene dine virker – eller ikke virker**.

Har du opplevd at KI-en gir dårligere svar jo lengre samtalen blir? Det er kontekstvinduet som fylles opp med irrelevant informasjon. Context engineering handler om å styre det bevisst.

## KITT jobber med dette

Vi i KITT (KI Tilretteleggingsteamet i BOD) dykker akkurat ned i context engineering og bruker det som en del av metodikken og playbooken vi bygger for utvikling av programvare på en "AI-native" måte i BOD.

---

Litt mer teknisk enn det vi vanligvis deler her, men verdt en titt for de som vil forstå mer av hva som skjer under panseret. 👇

🔗 [Context Engineering for Agents – LangChain Blog](https://blog.langchain.com/context-engineering-for-agents/)
