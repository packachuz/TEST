import "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: string;
      tenantId: string;
      tenantSlug: string;
      tenantName: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
  }
}
