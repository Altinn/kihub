/**
 * 015 US3 — read-only rendering of an agent's stored A2A agent card (FR-013). Server component,
 * zero client JS. KI Hub's own labels are Norwegian; card CONTENT (names, descriptions, examples)
 * renders verbatim as authored. Groups with no data are omitted; the whole panel is omitted by
 * the caller when no card is stored.
 *
 * 026: plain Designsystemet card/tag/list markup with no inline styles, and a `headingLevel`
 * (default 2) so the panel keeps a correct outline where it is embedded — the /bidra guide shows
 * it under an h3 step. Group headings are one level below the panel heading.
 */

interface AgentSkill {
  id?: string;
  name?: string;
  description?: string;
  tags?: string[];
  examples?: string[];
}

interface AgentInterface {
  url?: string;
  protocol?: string;
  version?: string;
}

interface AgentCardShape {
  name?: string;
  description?: string;
  version?: string;
  provider?: { name?: string; organization?: string; url?: string };
  supportedInterfaces?: AgentInterface[];
  capabilities?: { streaming?: boolean; pushNotifications?: boolean; extendedAgentCard?: boolean };
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  skills?: AgentSkill[];
  securitySchemes?: Record<string, unknown>;
}

const CAPABILITY_LABELS: Record<string, string> = {
  streaming: 'Strømming',
  pushNotifications: 'Push-varsler',
  extendedAgentCard: 'Utvidet agentkort',
};

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** The provider link's visible text; a malformed URL in a card falls back to the raw value. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function AgentCardPanel({ card, headingLevel = 2 }: { card: unknown; headingLevel?: 2 | 3 | 4 }) {
  if (!card || typeof card !== 'object' || Array.isArray(card)) return null;
  const c = card as AgentCardShape;

  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const GroupHeading = `h${headingLevel + 1}` as 'h3' | 'h4' | 'h5';

  const provider = c.provider ?? {};
  const providerName = provider.name ?? provider.organization ?? '';
  const skills = asArray<AgentSkill>(c.skills).filter((s) => s?.name);
  const interfaces = asArray<AgentInterface>(c.supportedInterfaces).filter((i) => i?.url);
  const capabilities = Object.entries(c.capabilities ?? {}).filter(
    ([key, value]) => value === true && CAPABILITY_LABELS[key],
  );
  const inputModes = asArray<string>(c.defaultInputModes);
  const outputModes = asArray<string>(c.defaultOutputModes);
  const securitySchemes = Object.entries(c.securitySchemes ?? {});
  const summary = [c.name, c.version ? `v${c.version}` : null, providerName].filter(Boolean).join(' · ');

  return (
    <section className="ds-card app-panel" data-color="neutral" aria-label="Agentkort">
      <div className="app-panel__head">
        <Heading className="ds-heading" data-size="xs">
          Agentkort
        </Heading>
        {summary || provider.url ? (
          <p className="ds-paragraph app-meta" data-size="sm">
            {summary}
            {provider.url ? (
              <>
                {summary ? ' · ' : ''}
                <a href={provider.url} className="ds-link">
                  {hostOf(provider.url)}
                </a>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
      {c.description ? (
        <p className="ds-paragraph" data-size="sm">
          {c.description}
        </p>
      ) : null}

      {capabilities.length ? (
        <>
          <GroupHeading className="ds-heading" data-size="2xs">
            Egenskaper
          </GroupHeading>
          <ul className="app-tag-list">
            {capabilities.map(([key]) => (
              <li key={key}>
                <span className="ds-tag" data-color="info">
                  {CAPABILITY_LABELS[key]}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {skills.length ? (
        <>
          <GroupHeading className="ds-heading" data-size="2xs">
            Ferdigheter
          </GroupHeading>
          <dl className="app-skill-list">
            {skills.map((skill, i) => (
              <div key={skill.id ?? skill.name ?? i}>
                <dt className="ds-paragraph" data-size="sm">
                  {skill.name}
                </dt>
                <dd>
                  {skill.description ? (
                    <p className="ds-paragraph" data-size="sm">
                      {skill.description}
                    </p>
                  ) : null}
                  {skill.tags?.length ? (
                    <ul className="app-tag-list">
                      {skill.tags.map((t) => (
                        <li key={t}>
                          <span className="ds-tag" data-color="neutral">
                            {t}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {skill.examples?.length ? (
                    <ul className="ds-list" data-size="sm">
                      {skill.examples.map((example) => (
                        <li key={example}>{example}</li>
                      ))}
                    </ul>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}

      {interfaces.length ? (
        <>
          <GroupHeading className="ds-heading" data-size="2xs">
            Grensesnitt
          </GroupHeading>
          <ul className="ds-list" data-size="sm">
            {interfaces.map((iface, i) => (
              <li key={iface.url ?? i}>
                {iface.protocol ? (
                  <span className="ds-tag" data-color="neutral">
                    {iface.protocol}
                  </span>
                ) : null}{' '}
                <code>{iface.url}</code>
                {iface.version ? ` (v${iface.version})` : ''}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {inputModes.length || outputModes.length ? (
        <>
          <GroupHeading className="ds-heading" data-size="2xs">
            Inn-/utdataformater
          </GroupHeading>
          <p className="ds-paragraph" data-size="sm">
            {[
              inputModes.length ? `Inn: ${inputModes.join(', ')}` : null,
              outputModes.length ? `Ut: ${outputModes.join(', ')}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </>
      ) : null}

      {securitySchemes.length ? (
        <>
          <GroupHeading className="ds-heading" data-size="2xs">
            Autentisering
          </GroupHeading>
          <ul className="app-tag-list">
            {securitySchemes.map(([name, scheme]) => {
              const type =
                scheme && typeof scheme === 'object' && 'type' in scheme ? String((scheme as { type: unknown }).type) : '';
              return (
                <li key={name}>
                  <span className="ds-tag" data-color="warning">
                    {type && type !== name ? `${name} (${type})` : name}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </section>
  );
}
