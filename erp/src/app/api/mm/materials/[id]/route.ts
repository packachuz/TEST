import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/mm/materials/[id]">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const { id } = await ctx.params;

  const material = await prisma.material.findFirst({ where: { id, tenantId } });
  if (!material) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(material);
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/mm/materials/[id]">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const { id } = await ctx.params;

  const existing = await prisma.material.findFirst({ where: { id, tenantId } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, description, unit, standardPrice, type } = body;

  const material = await prisma.material.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(unit !== undefined && { unit }),
      ...(standardPrice !== undefined && { standardPrice }),
      ...(type !== undefined && { type }),
    },
  });

  return Response.json(material);
}
