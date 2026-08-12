import { describe, expect, it } from 'vitest';
import { AGENT_CARD_MAX_BYTES, validateAgentCard } from '../src/agent-card';

/** The contract example from specs/015-multi-source-agents/contracts/agent-card.md. */
const FULL_CARD = {
  name: 'Support Agent',
  description: 'Answers internal support questions and escalates unresolved issues.',
  version: '1.0.0',
  provider: { organization: 'Digdir', url: 'https://www.digdir.no' },
  supportedInterfaces: [
    { url: 'https://agents.digdir.no/support', protocol: 'json-rpc', version: '1.0' },
  ],
  capabilities: { streaming: true, pushNotifications: false },
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/plain', 'application/json'],
  skills: [
    {
      id: 'resolve-support-request',
      name: 'Resolve support request',
      description: 'Classify, resolve or escalate a support request.',
      tags: ['support', 'triage'],
      examples: ['Jeg får ikke logget inn i KI Hub'],
    },
  ],
  securitySchemes: { oauth: { type: 'oauth2' } },
};

describe('validateAgentCard (015, A2A v1.0, tolerant)', () => {
  it('accepts the full contract example (as text and as an object)', () => {
    const fromText = validateAgentCard(JSON.stringify(FULL_CARD));
    expect(fromText.valid).toBe(true);
    const fromObject = validateAgentCard(FULL_CARD);
    expect(fromObject.valid).toBe(true);
    if (fromObject.valid) expect(fromObject.data.name).toBe('Support Agent');
  });

  it('accepts a name-only card (only `name` is required)', () => {
    const result = validateAgentCard({ name: 'Minimal Agent' });
    expect(result.valid).toBe(true);
  });

  it('rejects a missing or empty name', () => {
    for (const card of [{}, { name: '' }, { description: 'no name' }]) {
      const result = validateAgentCard(card);
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.errors.some((e) => e.startsWith('name'))).toBe(true);
    }
  });

  it('reports per-field type errors in "<path>: <message>" format', () => {
    const result = validateAgentCard({
      name: 'X',
      capabilities: { streaming: 'yes' },
      defaultInputModes: 'text/plain',
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.startsWith('capabilities.streaming:'))).toBe(true);
      expect(result.errors.some((e) => e.startsWith('defaultInputModes:'))).toBe(true);
    }
  });

  it('rejects a skill item without a name, with the offending path', () => {
    const result = validateAgentCard({ name: 'X', skills: [{ id: 'no-name' }] });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some((e) => e.startsWith('skills.0.name'))).toBe(true);
  });

  it('rejects an interface item without url/protocol', () => {
    const result = validateAgentCard({ name: 'X', supportedInterfaces: [{ url: 'https://x' }] });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.startsWith('supportedInterfaces.0.protocol'))).toBe(true);
    }
  });

  it('rejects non-object cards and malformed JSON with clear errors', () => {
    const notObject = validateAgentCard('["array"]');
    expect(notObject.valid).toBe(false);
    const malformed = validateAgentCard('{not json');
    expect(malformed.valid).toBe(false);
    if (!malformed.valid) expect(malformed.errors[0]).toContain('JSON parse error');
  });

  it('rejects an oversized card before parsing (256 KB cap)', () => {
    const oversized = `{"name":"X","padding":"${'a'.repeat(AGENT_CARD_MAX_BYTES)}"}`;
    const result = validateAgentCard(oversized);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors[0]).toContain('size limit');
  });

  it('preserves unknown fields on the parsed result (tolerant schema)', () => {
    const result = validateAgentCard({
      name: 'X',
      futureField: { anything: true },
      skills: [{ name: 'S', futureSkillField: 1 }],
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect((result.data as Record<string, unknown>).futureField).toEqual({ anything: true });
      expect((result.data.skills?.[0] as Record<string, unknown>).futureSkillField).toBe(1);
    }
  });
});
