import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/mm/purchase-requisitions/[id]/reject">) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const role = session.user.role;
    if (!["ADMIN", "MANAGER"].includes(role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = session.user.tenantId;
    const { id } = await ctx.params;

    const pr = await prisma.purchaseRequisition.findFirst({ where: { id, tenantId } });
    if (!pr) return Response.json({ error: "Not found" }, { status: 404 });

    if (pr.status !== "DRAFT" && pr.status !== "SUBMITTED") {
      return Response.json({ error: "Only DRAFT or SUBMITTED PRs can be rejected" }, { status: 400 });
    }

    const updated = await prisma.purchaseRequisition.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    return Response.json(updated);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    console.error("[mm-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
