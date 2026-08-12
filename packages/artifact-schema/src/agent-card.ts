import { z } from 'zod';

/**
 * A2A (Agent2Agent) v1.0 Agent Card — the optional `agent-card.json` sibling of an agent's
 * manifest (015 contracts/agent-card.md). Deliberately TOLERANT, unlike the strict manifest:
 * only `name` is required, known fields are type-checked when present, and unknown fields pass
 * through untouched (the card is render-only enrichment owned by an evolving external spec —
 * a strict schema would generate false failures on valid real-world cards).
 */

/** Raw card files larger than this are rejected before parsing. */
export const AGENT_CARD_MAX_BYTES = 256 * 1024;

const agentSkillSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    examples: z.array(z.string()).optional(),
  })
  .loose();

const agentInterfaceSchema = z
  .object({
    url: z.string().min(1),
    protocol: z.string().min(1),
    version: z.string().optional(),
  })
  .loose();

export const agentCardSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    version: z.string().optional(),
    provider: z
      .object({
        name: z.string().optional(),
        organization: z.string().optional(),
        url: z.string().optional(),
      })
      .loose()
      .optional(),
    supportedInterfaces: z.array(agentInterfaceSchema).optional(),
    capabilities: z
      .object({
        streaming: z.boolean().optional(),
        pushNotifications: z.boolean().optional(),
        extendedAgentCard: z.boolean().optional(),
      })
      .loose()
      .optional(),
    defaultInputModes: z.array(z.string()).optional(),
    defaultOutputModes: z.array(z.string()).optional(),
    skills: z.array(agentSkillSchema).optional(),
    securitySchemes: z.record(z.string(), z.unknown()).optional(),
    security: z.array(z.unknown()).optional(),
  })
  .loose();

export type AgentCard = z.infer<typeof agentCardSchema>;

export type AgentCardValidationResult =
  | { valid: true; data: AgentCard }
  | { valid: false; errors: string[] };

/**
 * Validate an agent card. Accepts raw JSON text (as read from agent-card.json) or an
 * already-parsed value. Errors use the same `"<path>: <message>"` format as `validateManifest`.
 */
export function validateAgentCard(source: string | unknown): AgentCardValidationResult {
  let raw: unknown = source;

  if (typeof source === 'string') {
    if (Buffer.byteLength(source, 'utf8') > AGENT_CARD_MAX_BYTES) {
      return {
        valid: false,
        errors: [`(root): agent card exceeds the ${AGENT_CARD_MAX_BYTES / 1024} KB size limit`],
      };
    }
    try {
      raw = JSON.parse(source);
    } catch (err) {
      return { valid: false, errors: [`JSON parse error: ${(err as Error).message}`] };
    }
  }

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, errors: ['(root): agent card must be a JSON object'] };
  }

  const result = agentCardSchema.safeParse(raw);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : '(root)';
    return `${path}: ${issue.message}`;
  });
  return { valid: false, errors };
}
