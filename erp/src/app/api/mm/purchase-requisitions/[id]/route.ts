import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/mm/purchase-requisitions/[id]">) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.user.tenantId;
    const { id } = await ctx.params;

    const pr = await prisma.purchaseRequisition.findFirst({
      where: { id, tenantId },
      include: { items: { include: { material: true } } },
    });

    if (!pr) return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json(pr);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    console.error("[mm-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
