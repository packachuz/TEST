import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Trust forwarded headers from Codespaces proxy
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
  cookies: {
    sessionToken: {
      name: `${process.env.NEXTAUTH_URL?.startsWith("https://") ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantSlug: { label: "Company", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.tenantSlug) {
          console.error("[auth] Missing credentials fields");
          return null;
        }

        try {
          const tenant = await prisma.tenant.findUnique({
            where: { slug: credentials.tenantSlug },
          });
          if (!tenant) {
            console.error(`[auth] Tenant not found: "${credentials.tenantSlug}"`);
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { tenantId_email: { tenantId: tenant.id, email: credentials.email } },
          });
          if (!user) {
            console.error(`[auth] User not found: "${credentials.email}" in tenant "${credentials.tenantSlug}"`);
            return null;
          }

          const valid = await bcrypt.compare(credentials.password, user.hashedPassword);
          if (!valid) {
            console.error(`[auth] Invalid password for "${credentials.email}"`);
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
            tenantSlug: tenant.slug,
            tenantName: tenant.name,
          };
        } catch (err) {
          console.error("[auth] Database error during authorize:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
        token.tenantSlug = (user as any).tenantSlug;
        token.tenantName = (user as any).tenantName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as any).role = token.role;
        (session.user as any).tenantId = token.tenantId;
        (session.user as any).tenantSlug = token.tenantSlug;
        (session.user as any).tenantName = token.tenantName;
      }
      return session;
    },
  },
};
