import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/sd/sales-orders/[id]/confirm">
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const { id } = await ctx.params;

  const order = await prisma.salesOrder.findFirst({ where: { id, tenantId } });
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });

  if (order.status !== "DRAFT") {
    return Response.json(
      { error: `Cannot confirm order with status ${order.status}` },
      { status: 400 }
    );
  }

  const updated = await prisma.salesOrder.update({
    where: { id },
    data: { status: "CONFIRMED" },
    include: {
      customer: true,
      items: { include: { material: true } },
    },
  });

  return Response.json(updated);
}
