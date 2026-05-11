import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/fi/journal/[id]/post">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const { id } = await ctx.params;

  const entry = await prisma.journalEntry.findFirst({ where: { id, tenantId } });
  if (!entry) return Response.json({ error: "Not found" }, { status: 404 });

  if (entry.status !== "DRAFT") {
    return Response.json(
      { error: `Cannot post entry with status ${entry.status}` },
      { status: 400 }
    );
  }

  const posted = await prisma.journalEntry.update({
    where: { id },
    data: { status: "POSTED" },
    include: {
      lines: { include: { glAccount: true } },
    },
  });

  return Response.json(posted);
}
