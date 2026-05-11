import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/sd/billing/[id]/pay">) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const role = session.user.role;
    if (!["ADMIN", "MANAGER"].includes(role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = session.user.tenantId;
    const { id } = await ctx.params;

    const invoice = await prisma.customerInvoice.findFirst({ where: { id, tenantId } });
    if (!invoice) return Response.json({ error: "Not found" }, { status: 404 });

    if (invoice.status !== "POSTED") {
      return Response.json(
        { error: `Cannot mark as paid invoice with status ${invoice.status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.customerInvoice.update({
      where: { id },
      data: { status: "PAID" },
      include: { customer: true, so: true, delivery: true },
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
