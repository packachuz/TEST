import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/sd/customers/[id]">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const { id } = await ctx.params;

  const customer = await prisma.customer.findFirst({ where: { id, tenantId } });
  if (!customer) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(customer);
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/sd/customers/[id]">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const { id } = await ctx.params;

  const customer = await prisma.customer.findFirst({ where: { id, tenantId } });
  if (!customer) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, email, phone, address, creditLimit } = body;

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email: email || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(address !== undefined && { address: address || null }),
      ...(creditLimit !== undefined && { creditLimit }),
    },
  });

  return Response.json(updated);
}
