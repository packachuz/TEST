import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.user.tenantId;

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");

    let dateFilter: { gte?: Date; lte?: Date } | undefined;
    if (year) {
      const fiscalYear = await prisma.fiscalYear.findFirst({
        where: { tenantId, year: parseInt(year) },
      });
      if (fiscalYear) {
        dateFilter = { gte: fiscalYear.startDate, lte: fiscalYear.endDate };
      } else {
        dateFilter = {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        };
      }
    }

    const accounts = await prisma.gLAccount.findMany({
      where: { tenantId },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              status: "POSTED",
              ...(dateFilter ? { date: dateFilter } : {}),
            },
          },
          select: { debit: true, credit: true },
        },
      },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    });

    const result = accounts.map((account) => {
      const totalDebit = account.journalLines.reduce((sum, l) => sum + Number(l.debit), 0);
      const totalCredit = account.journalLines.reduce((sum, l) => sum + Number(l.credit), 0);
      const balance = totalDebit - totalCredit;
      const { journalLines: _, ...accountData } = account;
      return { account: accountData, totalDebit, totalCredit, balance };
    });

    return Response.json(result);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    console.error("[fi-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
