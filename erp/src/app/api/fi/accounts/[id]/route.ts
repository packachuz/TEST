import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/fi/accounts/[id]">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const { id } = await ctx.params;

  const account = await prisma.gLAccount.findFirst({ where: { id, tenantId } });
  if (!account) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(account);
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/fi/accounts/[id]">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const { id } = await ctx.params;

  const existing = await prisma.gLAccount.findFirst({ where: { id, tenantId } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, description, isActive } = body;

  const account = await prisma.gLAccount.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return Response.json(account);
}
