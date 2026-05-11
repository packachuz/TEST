import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/sd/billing/[id]">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const { id } = await ctx.params;

  const invoice = await prisma.customerInvoice.findFirst({
    where: { id, tenantId },
    include: {
      customer: true,
      so: true,
      delivery: true,
    },
  });

  if (!invoice) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(invoice);
}
