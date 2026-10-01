import { ARTIFACT_TYPES } from '@kihub/artifact-schema';
import { ARTIFACT_TYPE_LABELS, type ArtifactTypeValue } from '@/lib/registry-view';

/**
 * 021 — static content for the "Del verktøyene deres i KI Hub" guide (`/bidra`). Kept as pure
 * data, with no React or Payload, so `tests/unit/contribute-guide.test.ts` can run every example
 * through the REAL `validateManifest` / `validateAgentCard`. If the manifest schema ever changes,
 * the guide's examples fail CI before an external team copies an invalid one.
 */

/** Public raw URL of the generated JSON Schema (Altinn/kihub is a public repo). */
export const MANIFEST_SCHEMA_URL =
  'https://raw.githubusercontent.com/Altinn/kihub/main/packages/artifact-schema/schema/artifact.schema.json';

/** Human-readable field reference in the repo. */
export const MANIFEST_DOCS_URL =
  'https://github.com/Altinn/kihub/blob/main/packages/artifact-schema/docs/artifact-manifest.md';

export const A2A_URL = 'https://a2a-protocol.org/';

/** The type directory each artifact type lives under, mirroring discovery-core's DIR_FOR_TYPE. */
export const TYPE_DIRECTORIES: Record<ArtifactTypeValue, string> = {
  skill: 'skills',
  prompt: 'prompts',
  workflow: 'workflows',
  mcp: 'mcp',
  template: 'templates',
  policy: 'policies',
  playbook: 'playbooks',
  agent: 'agents',
};

const TYPE_DESCRIPTIONS: Record<ArtifactTypeValue, string> = {
  skill: 'En gjenbrukbar evne for en KI-assistent, for eksempel en SKILL.md for Claude eller Copilot.',
  prompt: 'En ferdig formulert prompt som løser én bestemt oppgave godt.',
  workflow: 'En flyt i flere steg, for eksempel en GitHub Actions-jobb som bruker KI.',
  mcp: 'En MCP-server som gir KI-assistenter tilgang til et verktøy eller en datakilde.',
  template: 'Et utgangspunkt å kopiere, for eksempel en mal for et nytt KI-prosjekt.',
  policy: 'En retningslinje for hvordan KI skal eller ikke skal brukes.',
  playbook: 'En steg-for-steg-oppskrift for en hel arbeidsprosess med KI.',
  agent: 'En selvstendig KI-agent. Kan ha et eget agentkort (agent-card.json).',
};

export interface GuideArtifactType {
  type: ArtifactTypeValue;
  label: string;
  directory: string;
  description: string;
}

/** All eight types, in schema order. Exhaustive by construction over ARTIFACT_TYPES. */
export const GUIDE_ARTIFACT_TYPES: GuideArtifactType[] = ARTIFACT_TYPES.map((type) => ({
  type,
  label: ARTIFACT_TYPE_LABELS[type],
  directory: TYPE_DIRECTORIES[type],
  description: TYPE_DESCRIPTIONS[type],
}));

export const EXAMPLE_REPO_TREE = `team-repo/
├── skills/
│   └── klarsprak-sjekk/
│       ├── artifact.yaml      ← påkrevd: beskriver artefakten
│       ├── README.md          ← anbefalt: vises på detaljsiden
│       └── SKILL.md           ← selve innholdet deres
└── agents/
    └── tilgangsveileder/
        ├── artifact.yaml      ← påkrevd
        ├── agent-card.json    ← valgfritt, kun for agenter
        └── README.md`;

export const EXAMPLE_SKILL_MANIFEST = `# yaml-language-server: $schema=${MANIFEST_SCHEMA_URL}
id: digdir.klarsprak-sjekk
type: skill
name: Klarspråk-sjekk
version: 1.0.0
description: Går gjennom en tekst og foreslår klarere formuleringer etter Digdirs klarspråkråd.
owner:
  team: Team Tekst
  contact: team-tekst@digdir.no
source:
  provider: github
  repository: Altinn/team-tekst
  path: skills/klarsprak-sjekk
install:
  apm:
    package: altinn/klarsprak-sjekk
tags:
  - klarsprak
  - tekst
visibility: internal
lifecycle:
  status: experimental
`;

export const EXAMPLE_MINIMAL_MANIFEST = `id: digdir.mote-referat
type: prompt
name: Møtereferat fra notater
version: 0.1.0
description: Gjør stikkordsnotater om til et ryddig møtereferat med beslutninger og oppgaver.
owner:
  team: Team Møte
  contact: team-mote@digdir.no
source:
  provider: github
  repository: Altinn/team-mote
  path: prompts/mote-referat
visibility: internal
lifecycle:
  status: draft
`;

export const EXAMPLE_AGENT_MANIFEST = `id: digdir.tilgangsveileder
type: agent
name: Tilgangsveileder
version: 1.2.0
description: Svarer på spørsmål om roller og tilganger i Altinn, med lenker til riktig dokumentasjon.
owner:
  team: Team Tilgang
  contact: team-tilgang@digdir.no
source:
  provider: github
  repository: Altinn/team-tilgang
  path: agents/tilgangsveileder
tags:
  - altinn
  - tilgang
  - support
visibility: internal
lifecycle:
  status: experimental
`;

export const EXAMPLE_AGENT_CARD = `{
  "name": "Tilgangsveileder",
  "description": "Hjelper saksbehandlere og utviklere å forstå roller og tilganger i Altinn.",
  "version": "1.2.0",
  "provider": {
    "organization": "Digdir – Team Tilgang",
    "url": "https://github.com/Altinn/team-tilgang"
  },
  "supportedInterfaces": [
    {
      "url": "https://tilgangsveileder.example.digdir.no/a2a",
      "protocol": "JSONRPC",
      "version": "1.0"
    }
  ],
  "capabilities": {
    "streaming": true,
    "pushNotifications": false
  },
  "defaultInputModes": ["text/plain"],
  "defaultOutputModes": ["text/plain", "text/markdown"],
  "skills": [
    {
      "id": "forklar-rolle",
      "name": "Forklar en rolle",
      "description": "Forklarer hva en Altinn-rolle gir tilgang til.",
      "tags": ["roller"],
      "examples": ["Hva kan en med rollen «Utfyller/innsender» gjøre?"]
    },
    {
      "id": "finn-tilgang",
      "name": "Finn riktig tilgang",
      "description": "Foreslår hvilken rolle eller tilgangspakke en bruker trenger.",
      "examples": ["Hvilken tilgang trenger jeg for å sende inn MVA-melding?"]
    }
  ]
}
`;

export const EXAMPLE_README = `# Klarspråk-sjekk

Går gjennom en tekst og foreslår klarere formuleringer etter Digdirs klarspråkråd.

## Når bør du bruke den?
- Før du publiserer tekst til innbyggere eller virksomheter
- Når et utkast føles tungt eller byråkratisk

## Slik bruker du den
1. Installer: \`apm install altinn/klarsprak-sjekk\`
2. Be assistenten: «Sjekk denne teksten for klarspråk»

## Begrensninger
Erstatter ikke en språkvask. Ikke lim inn taushetsbelagt informasjon.

## Kontakt
Team Tekst – team-tekst@digdir.no
`;

export const VALIDATE_COMMAND = `git clone https://github.com/Altinn/kihub.git
cd kihub && pnpm install
pnpm --filter @kihub/artifact-schema validate ../team-repo/skills/klarsprak-sjekk/artifact.yaml`;

export interface ManifestField {
  name: string;
  required: boolean;
  format: string;
  explanation: string;
}

export const MANIFEST_FIELDS: ManifestField[] = [
  {
    name: 'id',
    required: true,
    format: 'organisasjon.navn, med små bokstaver',
    explanation:
      'Artefaktens faste identitet, for eksempel digdir.klarsprak-sjekk. Endre den aldri, heller ikke hvis dere flytter repo. Historikk og godkjenninger henger på den.',
  },
  {
    name: 'type',
    required: true,
    format: GUIDE_ARTIFACT_TYPES.map((t) => t.type).join(' | '),
    explanation: 'Hva slags artefakt det er. Må stemme med mappen filen ligger i.',
  },
  { name: 'name', required: true, format: 'tekst', explanation: 'Navnet kollegaer ser i katalogen.' },
  {
    name: 'version',
    required: true,
    format: 'MAJOR.MINOR.PATCH',
    explanation: 'For eksempel 1.0.0. Øk versjonen når dere endrer noe som brukerne merker.',
  },
  {
    name: 'description',
    required: true,
    format: 'én setning',
    explanation: 'Vises på kortet i katalogen og søkes i. Skriv hva den gjør, ikke hvordan.',
  },
  { name: 'owner.team', required: true, format: 'tekst', explanation: 'Teamet som eier og vedlikeholder artefakten.' },
  {
    name: 'owner.contact',
    required: true,
    format: 'e-postadresse',
    explanation: 'Hvor kollegaer sender spørsmål. Bruk gjerne en teamadresse, ikke en person.',
  },
  { name: 'source.provider', required: true, format: 'github', explanation: 'Foreløpig støttes bare GitHub.' },
  {
    name: 'source.repository',
    required: true,
    format: 'eier/repo',
    explanation: 'Repoet artefakten bor i, for eksempel Altinn/team-tekst.',
  },
  {
    name: 'source.path',
    required: true,
    format: 'sti i repoet',
    explanation: 'Mappen artefakten ligger i, for eksempel skills/klarsprak-sjekk.',
  },
  {
    name: 'install.apm.package',
    required: false,
    format: 'pakke-id',
    explanation: 'Har dere en APM-pakke, viser KI Hub en ferdig «apm install»-kommando som kan kopieres.',
  },
  {
    name: 'tags',
    required: false,
    format: 'liste, små bokstaver med bindestrek',
    explanation: 'Stikkord som gjør artefakten lettere å finne, for eksempel klarsprak eller tilgang.',
  },
  {
    name: 'visibility',
    required: true,
    format: 'internal',
    explanation: 'Bruk internal. Verdiene public og restricted er reservert til senere.',
  },
  {
    name: 'lifecycle.status',
    required: true,
    format: 'draft | experimental | …',
    explanation:
      'Startstatusen dere foreslår. Etter første registrering er det godkjennerne i KI Hub som flytter statusen videre.',
  },
];

export interface LifecycleStage {
  status: string;
  label: string;
  who: string;
}

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  { status: 'draft', label: 'Utkast', who: 'Dere jobber fortsatt med den' },
  { status: 'experimental', label: 'Eksperimentell', who: 'Klar til å prøves av andre' },
  { status: 'in-review', label: 'Til vurdering', who: 'Dere ber om gjennomgang' },
  { status: 'approved', label: 'Godkjent', who: 'En godkjenner har sagt ja' },
  { status: 'recommended', label: 'Anbefalt', who: 'Standardvalget i Digdir' },
];

export interface CommonMistake {
  title: string;
  symptom: string;
  fix: string;
}

export const COMMON_MISTAKES: CommonMistake[] = [
  {
    title: 'Feil mappedybde',
    symptom: 'Artefakten dukker aldri opp, og ingen feilmelding vises.',
    fix: 'Filen må ligge nøyaktig to nivåer ned: agents/tilgangsveileder/artifact.yaml. agents/artifact.yaml blir ikke funnet.',
  },
  {
    title: 'Mellomrom eller feil filnavn',
    symptom: 'Artefakten dukker aldri opp.',
    fix: 'Filen må hete nøyaktig artifact.yaml. Ikke artifact.yml, ikke Artifact.yaml, og ingen mellomrom på slutten.',
  },
  {
    title: 'type passer ikke med mappen',
    symptom: 'Manifestet blir avvist som ugyldig.',
    fix: 'type: agent må ligge under agents/, type: skill under skills/ og så videre. Se tabellen over typer.',
  },
  {
    title: 'Ukjente eller feilstavede felt',
    symptom: 'Manifestet blir avvist med en feil som (root): Unrecognized key: "descripton".',
    fix: 'Skjemaet er strengt med vilje, slik at skrivefeil oppdages. Bruk bare feltene i tabellen.',
  },
  {
    title: 'id er endret',
    symptom: 'KI Hub tror det er en helt ny artefakt, og godkjenningen forsvinner fra den gamle.',
    fix: 'Behold id-en for alltid. Endre heller name, version og description.',
  },
  {
    title: 'Ugyldig agentkort',
    symptom: 'Agenten er registrert, men agentkortet vises ikke på detaljsiden.',
    fix: 'Kortet må være gyldig JSON med minst et «name»-felt. Største tillatte størrelse er 256 KB.',
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ: FaqItem[] = [
  {
    question: 'Må koden eller innholdet vårt flyttes til KI Hub?',
    answer:
      'Nei. Alt blir liggende i deres eget repo, og dere eier det fortsatt. KI Hub leser bare metadata (artifact.yaml), README og eventuelt agentkortet, og lenker til kilden.',
  },
  {
    question: 'Hvor lang tid tar det før endringer vises?',
    answer:
      'Med webhook skjer det i løpet av sekunder etter at dere har pushet. Uten webhook plukker den daglige skanningen opp endringene innen et døgn.',
  },
  {
    question: 'Kan vi ha flere artefakter i samme repo?',
    answer:
      'Ja. Hver mappe med en artifact.yaml blir én artefakt. Dere kan blande typer, for eksempel både skills/ og agents/.',
  },
  {
    question: 'Hva skjer hvis vi sletter en artefakt fra repoet?',
    answer:
      'Ved neste skanning merkes den som inaktiv og forsvinner fra katalogen. Historikken beholdes, så den kommer tilbake med samme status hvis dere legger den inn igjen med samme id.',
  },
  {
    question: 'Kan repoet vårt være privat?',
    answer:
      'Ja. KI Hub leser repoet med et eget token som bare har lesetilgang. Innholdet vises bare for innloggede ansatte i Digdir.',
  },
  {
    question: 'Må vi ha et agentkort?',
    answer:
      'Nei, det er valgfritt. En agent registreres helt fint uten. Kortet gir kollegaer en mye rikere detaljside, med evner, eksempler og grensesnitt, så vi anbefaler det.',
  },
  {
    question: 'Hva bør IKKE ligge i en artefakt?',
    answer:
      'Hemmeligheter, API-nøkler, personopplysninger eller taushetsbelagt informasjon. README og agentkort vises for alle ansatte.',
  },
];

/** The checklist at the bottom of the page — one line per thing a team must have done. */
export const CHECKLIST: string[] = [
  'Mappen ligger under riktig typemappe, for eksempel skills/mitt-verktoy/',
  'Filen heter nøyaktig artifact.yaml',
  'id er unik, med små bokstaver, på formen organisasjon.navn',
  'type stemmer med mappen',
  'Alle påkrevde felt er fylt ut, og ingen ukjente felt er med',
  'README.md forklarer hva, når, hvordan og begrensninger',
  'Agenter: eventuelt agent-card.json ved siden av artifact.yaml',
  'Manifestet er validert lokalt eller i editoren',
  'Repoet er koblet til KI Hub (gjøres én gang per repo)',
];
