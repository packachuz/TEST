import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export type AuthedSession = {
  userId: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
};

export async function getAuthedSession(): Promise<AuthedSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    role: session.user.role,
    tenantId: session.user.tenantId,
    tenantSlug: session.user.tenantSlug,
  };
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

export async function requireAuth(): Promise<AuthedSession | Response> {
  const s = await getAuthedSession();
  if (!s) return unauthorized();
  return s;
}

export async function requireRole(...allowed: string[]): Promise<AuthedSession | Response> {
  const s = await getAuthedSession();
  if (!s) return unauthorized();
  if (!allowed.includes(s.role)) return forbidden();
  return s;
}

export function isResponse(x: unknown): x is Response {
  return x instanceof Response;
}
