import type { Metadata } from 'next';
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

export const metadata: Metadata = { title: 'Del KI-verktøyene dere lager · KI Hub' };

/**
 * 021 — "/bidra": the complete guide for external teams on registering their artifacts (skills,
 * agents, prompts …) in KI Hub, written so nobody has to ask how or why. Static, code-owned
 * content: every example comes from `lib/contribute-guide.ts`, where a unit test runs it through
 * the real validators. Server component; the only client JS is the existing `CopyButton` inside
 * `LearningCodeBlock`. All motion is CSS and switched off under prefers-reduced-motion.
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
    icon: '◎',
    title: 'Blir funnet',
    body: 'Kollegaer søker i KI Hub før de bygger noe selv. Ligger verktøyet deres der, blir det brukt i stedet for å bli laget på nytt.',
  },
  {
    icon: '⟲',
    title: 'Ingen dobbeltarbeid',
    body: 'Mange team løser de samme problemene med KI. En felles katalog betyr at én god løsning kan hjelpe hele Digdir.',
  },
  {
    icon: '✓',
    title: 'Trygg bruk',
    body: 'Status, eier og godkjenning vises tydelig, så kollegaer vet hva som er utprøvd, godkjent eller anbefalt.',
  },
  {
    icon: '↻',
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

function SectionHead({ id, eyebrow, title, lede }: { id: string; eyebrow: string; title: string; lede?: string }) {
  return (
    <header className="bidra-section__head">
      <p className="kihub-eyebrow kihub-eyebrow--accent" style={{ margin: 0 }}>
        {eyebrow}
      </p>
      <h2 id={`${id}-heading`} className="kihub-h2">
        {title}
      </h2>
      {lede ? <p className="bidra-lede">{lede}</p> : null}
    </header>
  );
}

export default function ContributeGuidePage() {
  const agentCard = JSON.parse(EXAMPLE_AGENT_CARD) as Record<string, unknown>;

  return (
    <main className="bidra">
      {/* ---------- Hero ---------- */}
      <section className="bidra-hero" aria-labelledby="bidra-title">
        <div className="kihub-container bidra-hero__inner">
          <div className="bidra-hero__text">
            <span className="kihub-tag kihub-tag--on-accent">Veiledning for team</span>
            <h1 id="bidra-title" className="kihub-h1 bidra-hero__title">
              Del KI-verktøyene dere lager
            </h1>
            <p className="bidra-hero__lede">
              Har teamet ditt laget en skill, en agent, en prompt eller en MCP-server som andre kan
              ha nytte av? Med én liten fil i deres eget repo dukker den opp i KI Hub, slik at hele
              Digdir kan finne den, forstå den og ta den i bruk.
            </p>
            <div className="bidra-hero__actions">
              <a href="#steg" className="bidra-btn bidra-btn--light">
                Kom i gang
              </a>
              <a href="#eksempler" className="bidra-btn bidra-btn--ghost">
                Se eksempler
              </a>
            </div>
          </div>

          <div className="bidra-hero__art" aria-hidden="true">
            <div className="bidra-window">
              <div className="bidra-window__bar">
                <span />
                <span />
                <span />
                <em>skills/klarsprak-sjekk/artifact.yaml</em>
              </div>
              <pre className="bidra-window__code">
                <span className="bidra-type bidra-type--1">
                  <b>id:</b> digdir.klarsprak-sjekk
                </span>
                <span className="bidra-type bidra-type--2">
                  <b>type:</b> skill
                </span>
                <span className="bidra-type bidra-type--3">
                  <b>name:</b> Klarspråk-sjekk
                </span>
                <span className="bidra-type bidra-type--4">
                  <b>version:</b> 1.0.0
                </span>
                <span className="bidra-type bidra-type--5">
                  <b>owner:</b>
                </span>
                <span className="bidra-type bidra-type--6">
                  {'  '}
                  <b>team:</b> Team Tekst
                </span>
              </pre>
            </div>
            <div className="bidra-hero__beam" />
            <div className="bidra-hero__card">
              <span className="bidra-hero__badge">Ferdighet</span>
              <strong>Klarspråk-sjekk</strong>
              <span>Team Tekst · Eksperimentell</span>
              <span className="bidra-hero__check">✓ Registrert i KI Hub</span>
            </div>
          </div>
        </div>
      </section>

      <div className="kihub-container bidra-layout">
        {/* ---------- Table of contents ---------- */}
        <nav className="bidra-toc" aria-label="Innhold på siden">
          <p className="bidra-toc__title">På denne siden</p>
          <ol>
            {TOC.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="bidra-content">
          {/* ---------- Why ---------- */}
          <section id="hvorfor" className="bidra-section" aria-labelledby="hvorfor-heading">
            <SectionHead
              id="hvorfor"
              eyebrow="Hvorfor"
              title="Hvorfor skal vi gjøre dette?"
              lede="Det beste KI-verktøyet er det kollegaene dine faktisk finner. I dag ligger mye godt arbeid gjemt i enkeltrepoer som bare ett team kjenner til. KI Hub gjør det synlig, uten at dere må gi fra dere eierskapet."
            />
            <div className="bidra-benefits">
              {BENEFITS.map((benefit) => (
                <article key={benefit.title} className="bidra-benefit bidra-reveal">
                  <span className="bidra-benefit__icon" aria-hidden="true">
                    {benefit.icon}
                  </span>
                  <h3 className="kihub-h4">{benefit.title}</h3>
                  <p>{benefit.body}</p>
                </article>
              ))}
            </div>
            <div className="bidra-compare bidra-reveal">
              <div>
                <p className="bidra-compare__label">Uten KI Hub</p>
                <ul>
                  <li>«Har noen laget noe for dette før?» i Slack</li>
                  <li>Tre team bygger nesten samme prompt</li>
                  <li>Ingen vet hvem som eier hva, eller om det er trygt</li>
                </ul>
              </div>
              <div className="bidra-compare__good">
                <p className="bidra-compare__label">Med KI Hub</p>
                <ul>
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
            className="bidra-section"
            aria-labelledby="slik-fungerer-det-heading"
          >
            <SectionHead
              id="slik-fungerer-det"
              eyebrow="Oversikt"
              title="Slik fungerer det"
              lede="Dere beholder alt i deres eget repo. KI Hub leser bare en liten beskrivelsesfil, artifact.yaml, og README-en ved siden av den. Resten skjer automatisk."
            />
            <ol className="bidra-flow">
              {FLOW.map((step, index) => (
                <li key={step.title} className="bidra-flow__step" style={{ '--i': index } as React.CSSProperties}>
                  <span className="bidra-flow__num">{index + 1}</span>
                  <strong>{step.title}</strong>
                  <span>{step.body}</span>
                </li>
              ))}
            </ol>
            <div className="bidra-note">
              <strong>Hva leser KI Hub?</strong> Bare <code>artifact.yaml</code>,{' '}
              <code>README.md</code> og, for agenter, <code>agent-card.json</code>. Selve innholdet,
              som koden, SKILL.md eller promptene, blir liggende hos dere. KI Hub lenker til kilden.
            </div>
          </section>

          {/* ---------- Types ---------- */}
          <section id="typer" className="bidra-section" aria-labelledby="typer-heading">
            <SectionHead
              id="typer"
              eyebrow="Typer"
              title="Hva kan dere dele?"
              lede="Hver artefakt har én type. Typen bestemmer hvilken mappe den skal ligge i. Det er den vanligste feilen, så sjekk tabellen."
            />
            <div className="bidra-types">
              {GUIDE_ARTIFACT_TYPES.map((t) => (
                <article key={t.type} className="bidra-type-card bidra-reveal">
                  <div className="bidra-type-card__head">
                    <h3 className="bidra-type-card__label">{t.label}</h3>
                    <code>type: {t.type}</code>
                  </div>
                  <p>{t.description}</p>
                  <code className="bidra-type-card__dir">{t.directory}/&lt;navn&gt;/artifact.yaml</code>
                </article>
              ))}
            </div>
          </section>

          {/* ---------- Steps ---------- */}
          <section id="steg" className="bidra-section" aria-labelledby="steg-heading">
            <SectionHead
              id="steg"
              eyebrow="Steg for steg"
              title="Fra repo til KI Hub på seks steg"
              lede="Følg stegene i rekkefølge. Eksemplene kan kopieres rett inn. De testes automatisk mot det samme skjemaet som KI Hub bruker, så de er alltid gyldige."
            />

            <ol className="bidra-steps" id="eksempler">
              <li className="bidra-step">
                <div className="bidra-step__marker" aria-hidden="true">
                  1
                </div>
                <div className="bidra-step__body">
                  <h3 className="kihub-h3">Lag mappestrukturen</h3>
                  <p>
                    Lag en mappe for hver artefakt under riktig typemappe i roten av repoet. Mappenavnet
                    er fritt, men bruk små bokstaver og bindestrek. Strukturen må være nøyaktig{' '}
                    <code>&lt;typemappe&gt;/&lt;navn&gt;/artifact.yaml</code>: to nivåer, verken mer eller
                    mindre.
                  </p>
                  <Code code={EXAMPLE_REPO_TREE} language="plaintext" />
                </div>
              </li>

              <li className="bidra-step">
                <div className="bidra-step__marker" aria-hidden="true">
                  2
                </div>
                <div className="bidra-step__body">
                  <h3 className="kihub-h3">Skriv artifact.yaml</h3>
                  <p>
                    Manifestet beskriver artefakten: hva den heter, hva den gjør, hvem som eier den og
                    hvor den ligger. Dette er det eneste påkrevde. Den første linjen er valgfri, men gir
                    autofullføring og feilmarkering i VS Code (med YAML-utvidelsen fra Red Hat).
                  </p>
                  <Code code={EXAMPLE_SKILL_MANIFEST} language="yaml" />
                  <details className="bidra-details">
                    <summary>Vis et minimalt eksempel med bare de påkrevde feltene</summary>
                    <Code code={EXAMPLE_MINIMAL_MANIFEST} language="yaml" />
                  </details>
                  <div className="bidra-tip">
                    <strong>Tips om id:</strong> Velg den med omhu, for den skal aldri endres. Bruk{' '}
                    <code>digdir.</code> pluss et kort, beskrivende navn. Den er artefaktens faste
                    identitet, også om dere flytter repoet.
                  </div>
                </div>
              </li>

              <li className="bidra-step">
                <div className="bidra-step__marker" aria-hidden="true">
                  3
                </div>
                <div className="bidra-step__body">
                  <h3 className="kihub-h3">Skriv en README.md som selger</h3>
                  <p>
                    README-en vises i sin helhet på artefaktens side i KI Hub, og den er det kollegaer
                    leser før de bestemmer seg. Svar på fire spørsmål: <em>hva</em> den gjør,{' '}
                    <em>når</em> den passer, <em>hvordan</em> man bruker den og hvilke{' '}
                    <em>begrensninger</em> den har.
                  </p>
                  <Code code={EXAMPLE_README} language="markdown" />
                </div>
              </li>

              <li className="bidra-step">
                <div className="bidra-step__marker" aria-hidden="true">
                  4
                </div>
                <div className="bidra-step__body">
                  <h3 className="kihub-h3">Agenter: legg til et agentkort</h3>
                  <p>
                    Er artefakten en agent (<code>type: agent</code> under <code>agents/</code>), kan dere
                    legge en <code>agent-card.json</code> ved siden av manifestet. Den følger den åpne{' '}
                    <a href={A2A_URL} className="bidra-link">
                      A2A-standarden (Agent2Agent) v1.0
                    </a>
                    . KI Hub viser kortet på agentens side, med evner, eksempler og grensesnitt.
                  </p>
                  <p>
                    Kortet er <strong>valgfritt og tilgivende</strong>. Bare <code>name</code> er
                    påkrevd, og ukjente felt er tillatt. Er kortet ugyldig, blir agenten likevel
                    registrert, men uten kort.
                  </p>
                  <div className="bidra-split">
                    <div>
                      <p className="bidra-split__label">agents/tilgangsveileder/artifact.yaml</p>
                      <Code code={EXAMPLE_AGENT_MANIFEST} language="yaml" />
                    </div>
                    <div>
                      <p className="bidra-split__label">agents/tilgangsveileder/agent-card.json</p>
                      <Code code={EXAMPLE_AGENT_CARD} language="json" />
                    </div>
                  </div>
                  <figure className="bidra-preview">
                    <figcaption>
                      <span className="bidra-preview__pulse" aria-hidden="true" />
                      Slik vises agentkortet over på agentens side i KI Hub
                    </figcaption>
                    <div className="bidra-preview__frame">
                      <AgentCardPanel card={agentCard} />
                    </div>
                  </figure>
                </div>
              </li>

              <li className="bidra-step">
                <div className="bidra-step__marker" aria-hidden="true">
                  5
                </div>
                <div className="bidra-step__body">
                  <h3 className="kihub-h3">Valider før dere pusher</h3>
                  <p>
                    Manifestet er strengt med vilje: ukjente felt og skrivefeil blir avvist, slik at
                    feil oppdages tidlig. Det finnes to måter å sjekke det på:
                  </p>
                  <div className="bidra-options">
                    <div className="bidra-option">
                      <p className="bidra-option__title">A · I editoren (anbefalt)</p>
                      <p>
                        Ha med <code># yaml-language-server</code>-linjen fra eksempelet øverst i
                        filen. VS Code markerer da feil mens dere skriver. Skjemaet ligger åpent på{' '}
                        <a href={MANIFEST_SCHEMA_URL} className="bidra-link">
                          GitHub
                        </a>
                        .
                      </p>
                    </div>
                    <div className="bidra-option">
                      <p className="bidra-option__title">B · Med KI Hubs validator</p>
                      <p>
                        Den samme koden som KI Hub selv bruker. Svarer med ✓ eller en liste med feil per
                        felt.
                      </p>
                    </div>
                  </div>
                  <Code code={VALIDATE_COMMAND} language="shell" />
                </div>
              </li>

              <li className="bidra-step">
                <div className="bidra-step__marker" aria-hidden="true">
                  6
                </div>
                <div className="bidra-step__body">
                  <h3 className="kihub-h3">Koble repoet til KI Hub (én gang)</h3>
                  <p>
                    KI Hub må vite at repoet finnes. Det gjøres <strong>én gang per repo</strong>, ikke
                    per artefakt. Etter det dukker nye artefakter opp av seg selv.
                  </p>
                  <ol className="bidra-sublist">
                    <li>
                      <strong>Send Team KITT</strong> (se kontaktene nederst på siden) navnet på repoet
                      (<code>eier/repo</code>), hvilken gren som skal leses (vanligvis{' '}
                      <code>main</code>) og hvilket team som eier det.
                    </li>
                    <li>
                      <strong>KITT legger inn repoet som kilde</strong> med et token som bare kan lese,
                      og kjører en første skanning. Dere får beskjed om hva som ble funnet, og eventuelle
                      feil.
                    </li>
                    <li>
                      <strong>Legg inn webhooken</strong> dere får fra KITT, så vises endringer med en
                      gang i stedet for innen et døgn. I GitHub: <em>Settings → Webhooks → Add webhook</em>.
                      Lim inn adressen og hemmeligheten, velg <code>application/json</code> og{' '}
                      <em>Just the push event</em>.
                    </li>
                  </ol>
                  <div className="bidra-tip">
                    <strong>Er repoet allerede koblet til?</strong> Da trenger dere ikke gjøre noe. Push
                    den nye mappen, så er den i katalogen etter neste skanning.
                  </div>
                </div>
              </li>
            </ol>
          </section>

          {/* ---------- Field reference ---------- */}
          <section id="felt" className="bidra-section" aria-labelledby="felt-heading">
            <SectionHead
              id="felt"
              eyebrow="Oppslag"
              title="Alle felt i artifact.yaml"
              lede="Dette er hele skjemaet. Felt som ikke står her, blir avvist."
            />
            <div className="bidra-table-wrap" tabIndex={0} role="region" aria-label="Felt i manifestet">
              <table className="bidra-table">
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
                          <span className="bidra-pill bidra-pill--req">Ja</span>
                        ) : (
                          <span className="bidra-pill">Valgfritt</span>
                        )}
                      </td>
                      <td className="bidra-table__format">{field.format}</td>
                      <td>{field.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="bidra-small">
              Den fullstendige tekniske referansen finnes i{' '}
              <a href={MANIFEST_DOCS_URL} className="bidra-link">
                artifact-manifest.md på GitHub
              </a>
              .
            </p>
          </section>

          {/* ---------- Lifecycle ---------- */}
          <section id="livslop" className="bidra-section" aria-labelledby="livslop-heading">
            <SectionHead
              id="livslop"
              eyebrow="Kvalitet"
              title="Livsløp og godkjenning"
              lede="Alle artefakter har en status som forteller kollegaer hvor moden den er. Dere velger startstatusen i manifestet. Etter det flyttes den ett steg om gangen i KI Hub, og godkjenning gjøres av en godkjenner."
            />
            <ol className="bidra-lifecycle">
              {LIFECYCLE_STAGES.map((stage, index) => (
                <li key={stage.status} style={{ '--i': index } as React.CSSProperties}>
                  <span className="bidra-lifecycle__dot" aria-hidden="true" />
                  <strong>{stage.label}</strong>
                  <code>{stage.status}</code>
                  <span>{stage.who}</span>
                </li>
              ))}
            </ol>
            <div className="bidra-note">
              <strong>Hvilken startstatus skal vi velge?</strong> Velg <code>experimental</code> når
              andre kan prøve artefakten, og <code>draft</code> hvis den ikke er klar ennå. Fra{' '}
              <em>Til vurdering</em> til <em>Godkjent</em> og <em>Anbefalt</em> er det en godkjenner som
              bestemmer. En artefakt kan også bli <code>deprecated</code> (utfaset) eller{' '}
              <code>archived</code> (arkivert).
            </div>
          </section>

          {/* ---------- Common mistakes ---------- */}
          <section id="feil" className="bidra-section" aria-labelledby="feil-heading">
            <SectionHead
              id="feil"
              eyebrow="Feilsøking"
              title="Vanlige feil, og hvordan dere unngår dem"
              lede="De to første har skjedd i praksis, og de er lumske: de gir ingen feilmelding i det hele tatt, fordi KI Hub rett og slett ikke ser filen."
            />
            <div className="bidra-mistakes">
              {COMMON_MISTAKES.map((mistake) => (
                <article key={mistake.title} className="bidra-mistake bidra-reveal">
                  <h3 className="kihub-h4">{mistake.title}</h3>
                  <p className="bidra-mistake__symptom">
                    <span aria-hidden="true">⚠</span> {mistake.symptom}
                  </p>
                  <p className="bidra-mistake__fix">
                    <span aria-hidden="true">→</span> {mistake.fix}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* ---------- FAQ ---------- */}
          <section id="sporsmal" className="bidra-section" aria-labelledby="sporsmal-heading">
            <SectionHead id="sporsmal" eyebrow="Spørsmål og svar" title="Det dere lurer på" />
            <div className="bidra-faq">
              {FAQ.map((item) => (
                <details key={item.question} className="bidra-faq__item">
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* ---------- Checklist ---------- */}
          <section id="sjekkliste" className="bidra-section" aria-labelledby="sjekkliste-heading">
            <div className="bidra-final">
              <p className="kihub-eyebrow" style={{ margin: 0 }}>
                Før dere pusher
              </p>
              <h2 id="sjekkliste-heading" className="kihub-h2">
                Sjekkliste
              </h2>
              <ul className="bidra-checklist">
                {CHECKLIST.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="bidra-hero__actions">
                <Link href="/registry" className="bidra-btn bidra-btn--light">
                  Se hva som allerede finnes
                </Link>
                <a href="#bidra-title" className="bidra-btn bidra-btn--ghost">
                  Til toppen ↑
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
