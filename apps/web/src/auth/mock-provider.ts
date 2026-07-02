import Credentials from 'next-auth/providers/credentials';
import { PERSONA_CLAIMS, type MockPersona } from './claims';

/**
 * Dev-only mock auth provider (AUTH_MODE=mock). Lets a developer "sign in" as a persona
 * emitting the same claim shape Entra would. It does NOT gate here — the central `signIn`
 * callback runs `employeeGate` for all providers so mock and real Entra behave identically.
 *
 * Guarded so it cannot be constructed in a production build (see config.ts).
 */
export const mockProvider = Credentials({
  id: 'mock',
  name: 'Mock Entra ID (dev)',
  credentials: {
    persona: { label: 'Persona', type: 'text' },
  },
  authorize: (credentials) => {
    const persona = credentials?.persona as MockPersona | undefined;
    const claims = persona ? PERSONA_CLAIMS[persona] : undefined;
    if (!claims) return null;
    return {
      id: claims.oid,
      oid: claims.oid,
      email: claims.email,
      name: claims.name,
      tid: claims.tid,
      idtyp: claims.idtyp,
    };
  },
});
