import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/sd/billing/[id]/pay">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
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
}
