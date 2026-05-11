import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface TrialBalanceRow {
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
    isActive: boolean;
  };
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

const typeColors: Record<string, string> = {
  ASSET: "bg-blue-100 text-blue-700",
  LIABILITY: "bg-red-100 text-red-700",
  EQUITY: "bg-purple-100 text-purple-700",
  REVENUE: "bg-green-100 text-green-700",
  EXPENSE: "bg-orange-100 text-orange-700",
};

async function fetchTrialBalance(tenantId: string): Promise<TrialBalanceRow[]> {
  const accounts = await prisma.gLAccount.findMany({
    where: { tenantId },
    include: {
      journalLines: {
        where: { journalEntry: { status: "POSTED" } },
        select: { debit: true, credit: true },
      },
    },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });

  return accounts.map((account) => {
    const totalDebit = account.journalLines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = account.journalLines.reduce((sum, l) => sum + Number(l.credit), 0);
    const { journalLines: _, ...accountData } = account;
    return { account: accountData, totalDebit, totalCredit, balance: totalDebit - totalCredit };
  });
}

async function fetchPnL(tenantId: string) {
  const [revenueAccounts, expenseAccounts] = await Promise.all([
    prisma.gLAccount.findMany({
      where: { tenantId, type: "REVENUE" },
      include: {
        journalLines: {
          where: { journalEntry: { status: "POSTED" } },
          select: { debit: true, credit: true },
        },
      },
    }),
    prisma.gLAccount.findMany({
      where: { tenantId, type: "EXPENSE" },
      include: {
        journalLines: {
          where: { journalEntry: { status: "POSTED" } },
          select: { debit: true, credit: true },
        },
      },
    }),
  ]);

  const revenue = revenueAccounts.reduce((sum, a) => {
    return sum + a.journalLines.reduce((s, l) => s + Number(l.credit) - Number(l.debit), 0);
  }, 0);

  const expenses = expenseAccounts.reduce((sum, a) => {
    return sum + a.journalLines.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
  }, 0);

  return { revenue, expenses, netIncome: revenue - expenses };
}

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [trialBalance, pnl] = await Promise.all([
    fetchTrialBalance(tenantId),
    fetchPnL(tenantId),
  ]);

  const grandDebit = trialBalance.reduce((sum, r) => sum + r.totalDebit, 0);
  const grandCredit = trialBalance.reduce((sum, r) => sum + r.totalCredit, 0);

  const pnlStats = [
    {
      label: "Total Revenue",
      value: formatCurrency(pnl.revenue),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Total Expenses",
      value: formatCurrency(pnl.expenses),
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Net Income",
      value: formatCurrency(pnl.netIncome),
      icon: DollarSign,
      color: pnl.netIncome >= 0 ? "text-blue-600" : "text-red-600",
      bg: pnl.netIncome >= 0 ? "bg-blue-50" : "bg-red-50",
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Financial Reports</h1>

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {pnlStats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-500">{label}</CardTitle>
                <div className={`rounded-lg p-2 ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trial Balance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {trialBalance.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No GL accounts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Total Debit</th>
                    <th className="px-4 py-3 text-right">Total Credit</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trialBalance.map(({ account, totalDebit, totalCredit, balance }) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                        {account.code}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{account.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[account.type] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {account.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {totalDebit > 0 ? formatCurrency(totalDebit) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {totalCredit > 0 ? formatCurrency(totalCredit) : "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${balance < 0 ? "text-red-600" : "text-gray-900"}`}
                      >
                        {formatCurrency(balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-gray-500">
                      Grand Totals
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(grandDebit)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(grandCredit)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(grandDebit - grandCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
