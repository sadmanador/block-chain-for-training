import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      role: 'user' | 'admin';
    };
  }

  interface User {
    id: string;
    username: string;
    email: string;
    role: 'user' | 'admin';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    email: string;
    role: 'user' | 'admin';
  }
}
