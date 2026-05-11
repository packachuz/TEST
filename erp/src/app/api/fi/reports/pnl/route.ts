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

    const postedFilter = {
      journalEntry: {
        status: "POSTED" as const,
        ...(dateFilter ? { date: dateFilter } : {}),
      },
    };

    const [revenueAccounts, expenseAccounts] = await Promise.all([
      prisma.gLAccount.findMany({
        where: { tenantId, type: "REVENUE" },
        include: {
          journalLines: { where: postedFilter, select: { debit: true, credit: true } },
        },
        orderBy: { code: "asc" },
      }),
      prisma.gLAccount.findMany({
        where: { tenantId, type: "EXPENSE" },
        include: {
          journalLines: { where: postedFilter, select: { debit: true, credit: true } },
        },
        orderBy: { code: "asc" },
      }),
    ]);

    const toAccountSummary = (accounts: typeof revenueAccounts) =>
      accounts.map((a) => {
        const totalDebit = a.journalLines.reduce((sum, l) => sum + Number(l.debit), 0);
        const totalCredit = a.journalLines.reduce((sum, l) => sum + Number(l.credit), 0);
        const { journalLines: _, ...accountData } = a;
        return { account: accountData, totalDebit, totalCredit };
      });

    const revenueSummary = toAccountSummary(revenueAccounts);
    const expenseSummary = toAccountSummary(expenseAccounts);

    const revenue = revenueSummary.reduce((sum, a) => sum + (a.totalCredit - a.totalDebit), 0);
    const expenses = expenseSummary.reduce((sum, a) => sum + (a.totalDebit - a.totalCredit), 0);
    const netIncome = revenue - expenses;

    return Response.json({
      revenue,
      expenses,
      netIncome,
      revenueAccounts: revenueSummary,
      expenseAccounts: expenseSummary,
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    console.error("[fi-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
