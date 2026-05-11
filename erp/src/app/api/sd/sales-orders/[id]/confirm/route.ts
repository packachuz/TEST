import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/sd/sales-orders/[id]/confirm">
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role as string;
    if (!["ADMIN", "MANAGER"].includes(role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

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
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    if (err instanceof Error && err.message.startsWith("CLIENT_ERROR:")) {
      return Response.json({ error: err.message.slice(13) }, { status: 400 });
    }
    console.error("[sd-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
