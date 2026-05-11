import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { BookOpen, FileText, TrendingUp, DollarSign } from "lucide-react";

export default async function FIPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [glAccountCount, draftCount, postedCount, reversedCount, recentEntries] =
    await Promise.all([
      prisma.gLAccount.count({ where: { tenantId } }),
      prisma.journalEntry.count({ where: { tenantId, status: "DRAFT" } }),
      prisma.journalEntry.count({ where: { tenantId, status: "POSTED" } }),
      prisma.journalEntry.count({ where: { tenantId, status: "REVERSED" } }),
      prisma.journalEntry.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { lines: { select: { id: true } } },
      }),
    ]);

  const assetLines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: { tenantId, status: "POSTED" },
      glAccount: { tenantId, type: "ASSET" },
    },
    select: { debit: true, credit: true },
  });
  const totalAssets = assetLines.reduce((sum, l) => sum + Number(l.debit) - Number(l.credit), 0);

  const revenueLines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: { tenantId, status: "POSTED" },
      glAccount: { tenantId, type: "REVENUE" },
    },
    select: { debit: true, credit: true },
  });
  const totalRevenue = revenueLines.reduce((sum, l) => sum + Number(l.credit) - Number(l.debit), 0);

  const stats = [
    {
      label: "GL Accounts",
      value: glAccountCount,
      icon: BookOpen,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Journal Entries",
      value: draftCount + postedCount + reversedCount,
      sub: `${draftCount} draft · ${postedCount} posted`,
      icon: FileText,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Total Assets",
      value: formatCurrency(totalAssets),
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(totalRevenue),
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    POSTED: "bg-green-100 text-green-700",
    REVERSED: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Financial Accounting</h1>
        <div className="flex gap-3">
          <Link
            href="/fi/accounts"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            GL Accounts
          </Link>
          <Link
            href="/fi/journal"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Journal Entries
          </Link>
          <Link
            href="/fi/reports"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Reports
          </Link>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
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
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Journal Entries</CardTitle>
            <Link href="/fi/journal/new" className="text-sm text-blue-600 hover:underline">
              + New Entry
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentEntries.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No journal entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Lines</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/fi/journal/${entry.id}`}
                          className="font-mono text-xs text-blue-600 hover:underline"
                        >
                          {entry.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(entry.date).toLocaleDateString("en-US", { dateStyle: "medium" })}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{entry.description}</td>
                      <td className="px-4 py-3 text-gray-600">{entry.lines.length}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[entry.status] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
