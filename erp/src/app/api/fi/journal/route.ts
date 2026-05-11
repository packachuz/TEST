import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = (session.user as any).tenantId as string;

    const entries = await prisma.journalEntry.findMany({
      where: { tenantId },
      include: {
        lines: {
          include: { glAccount: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(entries);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    console.error("[fi-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = (session.user as any).tenantId as string;

    const body = await req.json();
    const { date, description, lines } = body;

    if (!date || !description || !Array.isArray(lines) || lines.length === 0) {
      return Response.json({ error: "date, description, and lines are required" }, { status: 400 });
    }

    const totalDebit = lines.reduce((sum: number, l: any) => sum + Number(l.debit ?? 0), 0);
    const totalCredit = lines.reduce((sum: number, l: any) => sum + Number(l.credit ?? 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      return Response.json(
        { error: `Entry does not balance: debits ${totalDebit} ≠ credits ${totalCredit}` },
        { status: 400 }
      );
    }

    const glIds = [...new Set(lines.map((l: any) => l.glAccountId))];
    const valid = await prisma.gLAccount.findMany({
      where: { id: { in: glIds as string[] }, tenantId, isActive: true },
      select: { id: true },
    });
    if (valid.length !== glIds.length) {
      return Response.json({ error: "One or more GL accounts are invalid" }, { status: 400 });
    }

    const dateObj = new Date(date);
    const yyyymmdd = dateObj.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await prisma.journalEntry.count({ where: { tenantId } });
    const number = `JE-${yyyymmdd}-${String(count + 1).padStart(4, "0")}`;

    const entry = await prisma.journalEntry.create({
      data: {
        tenantId,
        number,
        date: dateObj,
        description,
        status: "DRAFT",
        source: "MANUAL",
        lines: {
          create: lines.map((l: any) => ({
            glAccountId: l.glAccountId,
            debit: Number(l.debit ?? 0),
            credit: Number(l.credit ?? 0),
            description: l.description ?? null,
          })),
        },
      },
      include: {
        lines: { include: { glAccount: true } },
      },
    });

    return Response.json(entry, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    console.error("[fi-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
