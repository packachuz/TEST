import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/fi/journal/[id]/post">) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.user.tenantId;
    const { id } = await ctx.params;

    const updated = await prisma.journalEntry.updateMany({
      where: { id, tenantId, status: "DRAFT" },
      data: { status: "POSTED" },
    });
    if (updated.count === 0) {
      return Response.json({ error: "Entry not found or not in DRAFT status" }, { status: 409 });
    }
    const entry = await prisma.journalEntry.findFirst({ where: { id, tenantId }, include: { lines: true } });
    return Response.json(entry);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    console.error("[fi-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
