import {
  ArrowUpIcon,
  ArrowsCirclepathIcon,
  MagnifyingGlassIcon,
  RecycleIcon,
  ShieldCheckmarkIcon,
} from '@navikt/aksel-icons';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { AgentCardPanel } from '@/components/AgentCardPanel';
import { LearningCodeBlock } from '@/components/LearningCodeBlock';
import {
  A2A_URL,
  CHECKLIST,
  COMMON_MISTAKES,
  EXAMPLE_AGENT_CARD,
  EXAMPLE_AGENT_MANIFEST,
  EXAMPLE_MINIMAL_MANIFEST,
  EXAMPLE_README,
  EXAMPLE_REPO_TREE,
  EXAMPLE_SKILL_MANIFEST,
  FAQ,
  GUIDE_ARTIFACT_TYPES,
  LIFECYCLE_STAGES,
  MANIFEST_DOCS_URL,
  MANIFEST_FIELDS,
  MANIFEST_SCHEMA_URL,
  VALIDATE_COMMAND,
} from '@/lib/contribute-guide';

export const metadata: Metadata = { title: 'Del KI-verktøyene dere lager' };

/**
 * 021 — "/bidra": the complete guide for external teams on registering their artifacts (skills,
 * agents, prompts …) in KI Hub, written so nobody has to ask how or why. Static, code-owned
 * content: every example comes from `lib/contribute-guide.ts`, where a unit test runs it through
 * the real validators. Server component; the only client JS is the existing `CopyButton` inside
 * `LearningCodeBlock`.
 *
 * 026: rebuilt on Designsystemet — `ds-heading`/`ds-paragraph`, `ds-card` (no hover lift on static
 * cards), `ds-alert` for notes and tips, `ds-details` for disclosures, `ds-table` with a caption,
 * `ds-tag`, `ds-button`/`ds-link`. The hero uses the frontpage pattern with the Digdir design
 * element instead of the animated code-window art and gradient; the section eyebrows are gone
 * (each h2 says it); the embedded agent-card preview sits at h4 under its h3 step.
 */

const TOC = [
  { id: 'hvorfor', label: 'Hvorfor' },
  { id: 'slik-fungerer-det', label: 'Slik fungerer det' },
  { id: 'typer', label: 'Typer artefakter' },
  { id: 'steg', label: 'Steg for steg' },
  { id: 'felt', label: 'Alle felt i manifestet' },
  { id: 'livslop', label: 'Livsløp og godkjenning' },
  { id: 'feil', label: 'Vanlige feil' },
  { id: 'sporsmal', label: 'Spørsmål og svar' },
  { id: 'sjekkliste', label: 'Sjekkliste' },
];

const BENEFITS = [
  {
    icon: MagnifyingGlassIcon,
    title: 'Blir funnet',
    body: 'Kollegaer søker i KI Hub før de bygger noe selv. Ligger verktøyet deres der, blir det brukt i stedet for å bli laget på nytt.',
  },
  {
    icon: RecycleIcon,
    title: 'Ingen dobbeltarbeid',
    body: 'Mange team løser de samme problemene med KI. En felles katalog betyr at én god løsning kan hjelpe hele Digdir.',
  },
  {
    icon: ShieldCheckmarkIcon,
    title: 'Trygg bruk',
    body: 'Status, eier og godkjenning vises tydelig, så kollegaer vet hva som er utprøvd, godkjent eller anbefalt.',
  },
  {
    icon: ArrowsCirclepathIcon,
    title: 'Alltid oppdatert',
    body: 'Dere jobber i eget repo som før. KI Hub henter endringene selv, så katalogen aldri blir utdatert.',
  },
];

const FLOW = [
  { title: 'Dere pusher', body: 'artifact.yaml i eget repo' },
  { title: 'KI Hub skanner', body: 'Via webhook eller daglig' },
  { title: 'Validering', body: 'Manifest og agentkort sjekkes' },
  { title: 'Katalogen', body: 'Artefakten får sin egen side' },
  { title: 'Kollegaer bruker', body: 'Søker, leser og installerer' },
];

function Code({ code, language }: { code: string; language: string }) {
  return <LearningCodeBlock node={{ fields: { code, language } }} />;
}

function SectionHead({ id, title, lede }: { id: string; title: string; lede?: string }) {
  return (
    <header className="app-guide__head">
      <h2 id={`${id}-heading`} className="ds-heading" data-size="lg">
        {title}
      </h2>
      {lede ? (
        <p className="ds-paragraph app-guide__lede" data-size="lg">
          {lede}
        </p>
      ) : null}
    </header>
  );
}

export default function ContributeGuidePage() {
  const agentCard = JSON.parse(EXAMPLE_AGENT_CARD) as Record<string, unknown>;

  return (
    <div className="app-guide">
      {/* ---------- Hero (the frontpage pattern) ---------- */}
      <div className="app-container">
        <section className="app-hero" aria-labelledby="bidra-title">
          <div className="app-hero__text">
            <span className="ds-tag" data-variant="outline">
              Veiledning for team
            </span>
            <h1 id="bidra-title" className="ds-heading app-hero__heading" data-size="2xl">
              Del KI-verktøyene dere lager
            </h1>
            <p className="ds-paragraph app-hero__lead" data-size="lg">
              Har teamet ditt laget en skill, en agent, en prompt eller en MCP-server som andre kan ha
              nytte av? Med én liten fil i deres eget repo dukker den opp i KI Hub, slik at hele Digdir
              kan finne den, forstå den og ta den i bruk.
            </p>
            <div className="app-cluster">
              <a href="#steg" className="ds-button" data-variant="primary">
                Kom i gang
              </a>
              <a href="#eksempler" className="ds-button" data-variant="secondary">
                Se eksempler
              </a>
            </div>
          </div>
          <div className="app-hero__art">
            <Image src="/brand/hero-design-element.svg" alt="" width={298} height={180} unoptimized />
          </div>
        </section>
      </div>

      <div className="app-container app-guide__layout">
        {/* ---------- Table of contents ---------- */}
        <nav className="app-guide__toc" aria-labelledby="bidra-toc-heading">
          <p id="bidra-toc-heading" className="ds-paragraph app-guide__toc-title" data-size="sm">
            På denne siden
          </p>
          <ol>
            {TOC.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="ds-link" data-color="neutral">
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="app-guide__content">
          {/* ---------- Why ---------- */}
          <section id="hvorfor" className="app-guide__section" aria-labelledby="hvorfor-heading">
            <SectionHead
              id="hvorfor"
              title="Hvorfor skal vi gjøre dette?"
              lede="Det beste KI-verktøyet er det kollegaene dine faktisk finner. I dag ligger mye godt arbeid gjemt i enkeltrepoer som bare ett team kjenner til. KI Hub gjør det synlig, uten at dere må gi fra dere eierskapet."
            />
            <div className="app-guide__grid">
              {BENEFITS.map((benefit) => (
                <article key={benefit.title} className="ds-card" data-color="neutral">
                  <benefit.icon aria-hidden className="app-guide__icon" />
                  <h3 className="ds-heading" data-size="xs">
                    {benefit.title}
                  </h3>
                  <p className="ds-paragraph" data-size="sm">
                    {benefit.body}
                  </p>
                </article>
              ))}
            </div>
            <div className="app-guide__compare">
              <div className="ds-card" data-variant="tinted" data-color="neutral">
                <h3 className="ds-heading" data-size="2xs">
                  Uten KI Hub
                </h3>
                <ul className="ds-list" data-size="sm">
                  <li>«Har noen laget noe for dette før?» i Slack</li>
                  <li>Tre team bygger nesten samme prompt</li>
                  <li>Ingen vet hvem som eier hva, eller om det er trygt</li>
                </ul>
              </div>
              <div className="ds-card" data-variant="tinted" data-color="success">
                <h3 className="ds-heading" data-size="2xs">
                  Med KI Hub
                </h3>
                <ul className="ds-list" data-size="sm">
                  <li>Ett søk viser hva som finnes</li>
                  <li>Én god løsning gjenbrukes av mange</li>
                  <li>Eier, kontakt og status står på hver side</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ---------- How it works ---------- */}
          <section
            id="slik-fungerer-det"
            className="app-guide__section"
            aria-labelledby="slik-fungerer-det-heading"
          >
            <SectionHead
              id="slik-fungerer-det"
              title="Slik fungerer det"
              lede="Dere beholder alt i deres eget repo. KI Hub leser bare en liten beskrivelsesfil, artifact.yaml, og README-en ved siden av den. Resten skjer automatisk."
            />
            <ol className="app-guide__flow">
              {FLOW.map((step, index) => (
                <li key={step.title} className="ds-card" data-color="neutral">
                  <span className="app-guide__num" aria-hidden="true">
                    {index + 1}
                  </span>
                  <strong>{step.title}</strong>
                  <span className="ds-paragraph app-meta" data-size="sm">
                    {step.body}
                  </span>
                </li>
              ))}
            </ol>
            <div className="ds-alert" data-color="info">
              <p className="ds-paragraph">
                <strong>Hva leser KI Hub?</strong> Bare <code>artifact.yaml</code>, <code>README.md</code>{' '}
                og, for agenter, <code>agent-card.json</code>. Selve innholdet, som koden, SKILL.md eller
                promptene, blir liggende hos dere. KI Hub lenker til kilden.
              </p>
            </div>
          </section>

          {/* ---------- Types ---------- */}
          <section id="typer" className="app-guide__section" aria-labelledby="typer-heading">
            <SectionHead
              id="typer"
              title="Hva kan dere dele?"
              lede="Hver artefakt har én type. Typen bestemmer hvilken mappe den skal ligge i. Det er den vanligste feilen, så sjekk tabellen."
            />
            <div className="app-guide__grid">
              {GUIDE_ARTIFACT_TYPES.map((t) => (
                <article key={t.type} className="ds-card" data-color="neutral">
                  <div className="app-guide__type-head">
                    <h3 className="ds-heading" data-size="xs">
                      {t.label}
                    </h3>
                    <code>type: {t.type}</code>
                  </div>
                  <p className="ds-paragraph" data-size="sm">
                    {t.description}
                  </p>
                  <code className="app-guide__path">{t.directory}/&lt;navn&gt;/artifact.yaml</code>
                </article>
              ))}
            </div>
          </section>

          {/* ---------- Steps ---------- */}
          <section id="steg" className="app-guide__section" aria-labelledby="steg-heading">
            <SectionHead
              id="steg"
              title="Fra repo til KI Hub på seks steg"
              lede="Følg stegene i rekkefølge. Eksemplene kan kopieres rett inn. De testes automatisk mot det samme skjemaet som KI Hub bruker, så de er alltid gyldige."
            />

            <ol className="app-guide__steps" id="eksempler">
              <li className="app-guide__step">
                <h3 className="ds-heading" data-size="sm">
                  Lag mappestrukturen
                </h3>
                <p className="ds-paragraph">
                  Lag en mappe for hver artefakt under riktig typemappe i roten av repoet. Mappenavnet er
                  fritt, men bruk små bokstaver og bindestrek. Strukturen må være nøyaktig{' '}
                  <code>&lt;typemappe&gt;/&lt;navn&gt;/artifact.yaml</code>: to nivåer, verken mer eller
                  mindre.
                </p>
                <Code code={EXAMPLE_REPO_TREE} language="plaintext" />
              </li>

              <li className="app-guide__step">
                <h3 className="ds-heading" data-size="sm">
                  Skriv artifact.yaml
                </h3>
                <p className="ds-paragraph">
                  Manifestet beskriver artefakten: hva den heter, hva den gjør, hvem som eier den og hvor
                  den ligger. Dette er det eneste påkrevde. Den første linjen er valgfri, men gir
                  autofullføring og feilmarkering i VS Code (med YAML-utvidelsen fra Red Hat).
                </p>
                <Code code={EXAMPLE_SKILL_MANIFEST} language="yaml" />
                <details className="ds-details" data-color="neutral">
                  <summary>Vis et minimalt eksempel med bare de påkrevde feltene</summary>
                  <div>
                    <Code code={EXAMPLE_MINIMAL_MANIFEST} language="yaml" />
                  </div>
                </details>
                <div className="ds-alert" data-color="info">
                  <p className="ds-paragraph">
                    <strong>Tips om id:</strong> Velg den med omhu, for den skal aldri endres. Bruk{' '}
                    <code>digdir.</code> pluss et kort, beskrivende navn. Den er artefaktens faste
                    identitet, også om dere flytter repoet.
                  </p>
                </div>
              </li>

              <li className="app-guide__step">
                <h3 className="ds-heading" data-size="sm">
                  Skriv en README.md som selger
                </h3>
                <p className="ds-paragraph">
                  README-en vises i sin helhet på artefaktens side i KI Hub, og den er det kollegaer leser
                  før de bestemmer seg. Svar på fire spørsmål: <em>hva</em> den gjør, <em>når</em> den
                  passer, <em>hvordan</em> man bruker den og hvilke <em>begrensninger</em> den har.
                </p>
                <Code code={EXAMPLE_README} language="markdown" />
              </li>

              <li className="app-guide__step">
                <h3 className="ds-heading" data-size="sm">
                  Agenter: legg til et agentkort
                </h3>
                <p className="ds-paragraph">
                  Er artefakten en agent (<code>type: agent</code> under <code>agents/</code>), kan dere
                  legge en <code>agent-card.json</code> ved siden av manifestet. Den følger den åpne{' '}
                  <a href={A2A_URL} className="ds-link">
                    A2A-standarden (Agent2Agent) v1.0
                  </a>
                  . KI Hub viser kortet på agentens side, med evner, eksempler og grensesnitt.
                </p>
                <p className="ds-paragraph">
                  Kortet er <strong>valgfritt og tilgivende</strong>. Bare <code>name</code> er påkrevd,
                  og ukjente felt er tillatt. Er kortet ugyldig, blir agenten likevel registrert, men uten
                  kort.
                </p>
                <div className="app-guide__split">
                  <div>
                    <p className="ds-paragraph app-meta" data-size="sm">
                      agents/tilgangsveileder/artifact.yaml
                    </p>
                    <Code code={EXAMPLE_AGENT_MANIFEST} language="yaml" />
                  </div>
                  <div>
                    <p className="ds-paragraph app-meta" data-size="sm">
                      agents/tilgangsveileder/agent-card.json
                    </p>
                    <Code code={EXAMPLE_AGENT_CARD} language="json" />
                  </div>
                </div>
                <figure className="app-guide__preview">
                  <figcaption className="ds-paragraph app-meta" data-size="sm">
                    Slik vises agentkortet over på agentens side i KI Hub
                  </figcaption>
                  <AgentCardPanel card={agentCard} headingLevel={4} />
                </figure>
              </li>

              <li className="app-guide__step">
                <h3 className="ds-heading" data-size="sm">
                  Valider før dere pusher
                </h3>
                <p className="ds-paragraph">
                  Manifestet er strengt med vilje: ukjente felt og skrivefeil blir avvist, slik at feil
                  oppdages tidlig. Det finnes to måter å sjekke det på:
                </p>
                <div className="app-guide__compare">
                  <div className="ds-card" data-color="neutral">
                    <h4 className="ds-heading" data-size="2xs">
                      A · I editoren (anbefalt)
                    </h4>
                    <p className="ds-paragraph" data-size="sm">
                      Ha med <code># yaml-language-server</code>-linjen fra eksempelet øverst i filen. VS
                      Code markerer da feil mens dere skriver. Skjemaet ligger åpent på{' '}
                      <a href={MANIFEST_SCHEMA_URL} className="ds-link">
                        GitHub
                      </a>
                      .
                    </p>
                  </div>
                  <div className="ds-card" data-color="neutral">
                    <h4 className="ds-heading" data-size="2xs">
                      B · Med KI Hubs validator
                    </h4>
                    <p className="ds-paragraph" data-size="sm">
                      Den samme koden som KI Hub selv bruker. Svarer med ✓ eller en liste med feil per
                      felt.
                    </p>
                  </div>
                </div>
                <Code code={VALIDATE_COMMAND} language="shell" />
              </li>

              <li className="app-guide__step">
                <h3 className="ds-heading" data-size="sm">
                  Koble repoet til KI Hub (én gang)
                </h3>
                <p className="ds-paragraph">
                  KI Hub må vite at repoet finnes. Det gjøres <strong>én gang per repo</strong>, ikke per
                  artefakt. Etter det dukker nye artefakter opp av seg selv.
                </p>
                <ol className="ds-list">
                  <li>
                    <strong>Send Team KITT</strong> (se kontaktene nederst på siden) navnet på repoet (
                    <code>eier/repo</code>), hvilken gren som skal leses (vanligvis <code>main</code>) og
                    hvilket team som eier det.
                  </li>
                  <li>
                    <strong>KITT legger inn repoet som kilde</strong> med et token som bare kan lese, og
                    kjører en første skanning. Dere får beskjed om hva som ble funnet, og eventuelle feil.
                  </li>
                  <li>
                    <strong>Legg inn webhooken</strong> dere får fra KITT, så vises endringer med en gang i
                    stedet for innen et døgn. I GitHub: <em>Settings → Webhooks → Add webhook</em>. Lim
                    inn adressen og hemmeligheten, velg <code>application/json</code> og{' '}
                    <em>Just the push event</em>.
                  </li>
                </ol>
                <div className="ds-alert" data-color="info">
                  <p className="ds-paragraph">
                    <strong>Er repoet allerede koblet til?</strong> Da trenger dere ikke gjøre noe. Push
                    den nye mappen, så er den i katalogen etter neste skanning.
                  </p>
                </div>
              </li>
            </ol>
          </section>

          {/* ---------- Field reference ---------- */}
          <section id="felt" className="app-guide__section" aria-labelledby="felt-heading">
            <SectionHead
              id="felt"
              title="Alle felt i artifact.yaml"
              lede="Dette er hele skjemaet. Felt som ikke står her, blir avvist."
            />
            <div className="app-scroll-region" tabIndex={0} role="region" aria-label="Felt i manifestet">
              <table className="ds-table" data-border="true">
                <caption className="ds-sr-only">Felt i artifact.yaml</caption>
                <thead>
                  <tr>
                    <th scope="col">Felt</th>
                    <th scope="col">Påkrevd</th>
                    <th scope="col">Format</th>
                    <th scope="col">Forklaring</th>
                  </tr>
                </thead>
                <tbody>
                  {MANIFEST_FIELDS.map((field) => (
                    <tr key={field.name}>
                      <th scope="row">
                        <code>{field.name}</code>
                      </th>
                      <td>
                        {field.required ? (
                          <span className="ds-tag" data-color="info">
                            Ja
                          </span>
                        ) : (
                          <span className="ds-tag" data-color="neutral">
                            Valgfritt
                          </span>
                        )}
                      </td>
                      <td className="app-guide__format">{field.format}</td>
                      <td>{field.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="ds-paragraph" data-size="sm">
              Den fullstendige tekniske referansen finnes i{' '}
              <a href={MANIFEST_DOCS_URL} className="ds-link">
                artifact-manifest.md på GitHub
              </a>
              .
            </p>
          </section>

          {/* ---------- Lifecycle ---------- */}
          <section id="livslop" className="app-guide__section" aria-labelledby="livslop-heading">
            <SectionHead
              id="livslop"
              title="Livsløp og godkjenning"
              lede="Alle artefakter har en status som forteller kollegaer hvor moden den er. Dere velger startstatusen i manifestet. Etter det flyttes den ett steg om gangen i KI Hub, og godkjenning gjøres av en godkjenner."
            />
            <ol className="app-guide__lifecycle">
              {LIFECYCLE_STAGES.map((stage) => (
                <li key={stage.status}>
                  <strong>{stage.label}</strong>
                  <code>{stage.status}</code>
                  <span className="ds-paragraph app-meta" data-size="sm">
                    {stage.who}
                  </span>
                </li>
              ))}
            </ol>
            <div className="ds-alert" data-color="info">
              <p className="ds-paragraph">
                <strong>Hvilken startstatus skal vi velge?</strong> Velg <code>experimental</code> når
                andre kan prøve artefakten, og <code>draft</code> hvis den ikke er klar ennå. Fra{' '}
                <em>Til vurdering</em> til <em>Godkjent</em> og <em>Anbefalt</em> er det en godkjenner som
                bestemmer. En artefakt kan også bli <code>deprecated</code> (utfaset) eller{' '}
                <code>archived</code> (arkivert).
              </p>
            </div>
          </section>

          {/* ---------- Common mistakes ---------- */}
          <section id="feil" className="app-guide__section" aria-labelledby="feil-heading">
            <SectionHead
              id="feil"
              title="Vanlige feil, og hvordan dere unngår dem"
              lede="De to første har skjedd i praksis, og de er lumske: de gir ingen feilmelding i det hele tatt, fordi KI Hub rett og slett ikke ser filen."
            />
            <div className="app-guide__grid">
              {COMMON_MISTAKES.map((mistake) => (
                <article key={mistake.title} className="ds-card" data-color="neutral">
                  <h3 className="ds-heading" data-size="xs">
                    {mistake.title}
                  </h3>
                  <p className="ds-paragraph" data-size="sm">
                    <strong>Symptom:</strong> {mistake.symptom}
                  </p>
                  <p className="ds-paragraph" data-size="sm">
                    <strong>Løsning:</strong> {mistake.fix}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* ---------- FAQ ---------- */}
          <section id="sporsmal" className="app-guide__section" aria-labelledby="sporsmal-heading">
            <SectionHead id="sporsmal" title="Det dere lurer på" />
            <div>
              {FAQ.map((item) => (
                <details key={item.question} className="ds-details" data-color="neutral">
                  <summary>{item.question}</summary>
                  <p className="ds-paragraph">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* ---------- Checklist ---------- */}
          <section id="sjekkliste" className="app-guide__section" aria-labelledby="sjekkliste-heading">
            <div className="ds-card app-guide__final" data-variant="tinted" data-color="accent">
              <h2 id="sjekkliste-heading" className="ds-heading" data-size="lg">
                Sjekkliste før dere pusher
              </h2>
              <ul className="ds-list app-guide__checklist">
                {CHECKLIST.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="app-cluster">
                <Link href="/registry" className="ds-button" data-variant="primary">
                  Se hva som allerede finnes
                </Link>
                <a href="#bidra-title" className="ds-button" data-variant="secondary">
                  Til toppen
                  <ArrowUpIcon aria-hidden />
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
