import { Card, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';

/**
 * 015 US3 — read-only rendering of an agent's stored A2A agent card (FR-013). Server component,
 * zero client JS. KI Hub's own labels are Norwegian; card CONTENT (names, descriptions, examples)
 * renders verbatim as authored. Groups with no data are omitted; the whole panel is omitted by
 * the caller when no card is stored.
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

function GroupHeading({ children }: { children: string }) {
  return (
    <Heading level={3} data-size="2xs" style={{ marginTop: '1rem', marginBottom: '0.35rem' }}>
      {children}
    </Heading>
  );
}

export function AgentCardPanel({ card }: { card: unknown }) {
  if (!card || typeof card !== 'object' || Array.isArray(card)) return null;
  const c = card as AgentCardShape;

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

  return (
    <Card style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Heading level={2} data-size="xs">
          Agentkort
        </Heading>
        <span style={{ fontSize: '0.85rem', color: 'var(--ds-color-neutral-text-subtle)' }}>
          {[c.name, c.version ? `v${c.version}` : null, providerName].filter(Boolean).join(' · ')}
          {provider.url ? (
            <>
              {' · '}
              <a href={provider.url}>{new URL(provider.url).hostname}</a>
            </>
          ) : null}
        </span>
      </div>
      {c.description ? (
        <Paragraph data-size="sm" style={{ marginTop: '0.5rem' }}>
          {c.description}
        </Paragraph>
      ) : null}

      {capabilities.length ? (
        <>
          <GroupHeading>Egenskaper</GroupHeading>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {capabilities.map(([key]) => (
              <Tag key={key} data-color="info" data-size="sm">
                {CAPABILITY_LABELS[key]}
              </Tag>
            ))}
          </div>
        </>
      ) : null}

      {skills.length ? (
        <>
          <GroupHeading>Ferdigheter</GroupHeading>
          <dl style={{ margin: 0, display: 'grid', gap: '0.6rem' }}>
            {skills.map((skill, i) => (
              <div key={skill.id ?? skill.name ?? i}>
                <dt style={{ fontWeight: 600 }}>{skill.name}</dt>
                <dd style={{ margin: 0 }}>
                  {skill.description ? (
                    <Paragraph data-size="sm" style={{ margin: '0.15rem 0' }}>
                      {skill.description}
                    </Paragraph>
                  ) : null}
                  {skill.tags?.length ? (
                    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.2rem' }}>
                      {skill.tags.map((t) => (
                        <Tag key={t} data-color="neutral" data-size="sm">
                          {t}
                        </Tag>
                      ))}
                    </span>
                  ) : null}
                  {skill.examples?.length ? (
                    <ul style={{ margin: '0.3rem 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
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
          <GroupHeading>Grensesnitt</GroupHeading>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {interfaces.map((iface, i) => (
              <li key={iface.url ?? i} style={{ fontSize: '0.9rem' }}>
                {iface.protocol ? <Tag data-color="neutral" data-size="sm" style={{ marginRight: '0.4rem' }}>{iface.protocol}</Tag> : null}
                <code>{iface.url}</code>
                {iface.version ? ` (v${iface.version})` : ''}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {inputModes.length || outputModes.length ? (
        <>
          <GroupHeading>Inn-/utdataformater</GroupHeading>
          <Paragraph data-size="sm" style={{ margin: 0 }}>
            {[
              inputModes.length ? `Inn: ${inputModes.join(', ')}` : null,
              outputModes.length ? `Ut: ${outputModes.join(', ')}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Paragraph>
        </>
      ) : null}

      {securitySchemes.length ? (
        <>
          <GroupHeading>Autentisering</GroupHeading>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {securitySchemes.map(([name, scheme]) => {
              const type =
                scheme && typeof scheme === 'object' && 'type' in scheme ? String((scheme as { type: unknown }).type) : '';
              return (
                <Tag key={name} data-color="warning" data-size="sm">
                  {type && type !== name ? `${name} (${type})` : name}
                </Tag>
              );
            })}
          </div>
        </>
      ) : null}
    </Card>
  );
}
