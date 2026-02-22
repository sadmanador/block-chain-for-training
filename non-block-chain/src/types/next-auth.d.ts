import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    balance: number;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      balance: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    balance: number;
  }
}
