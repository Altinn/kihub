import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      role?: string;
      oid?: string;
    } & DefaultSession['user'];
  }

  interface User {
    oid?: string;
    tid?: string;
    idtyp?: 'member' | 'guest';
    /** Dev-only role seed from a mock persona (Phase 3) — never present on a real Entra profile. */
    roleHint?: 'reader' | 'contributor' | 'reviewer' | 'approver' | 'admin';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    oid?: string;
    email?: string;
    name?: string;
    tid?: string;
    role?: string;
  }
}
