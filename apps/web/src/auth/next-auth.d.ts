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
