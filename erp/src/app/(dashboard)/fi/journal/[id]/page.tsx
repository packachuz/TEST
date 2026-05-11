import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { PostButton } from "./PostButton";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  POSTED: "bg-green-100 text-green-700",
  REVERSED: "bg-red-100 text-red-700",
};

export default async function JournalEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;
  const { id } = await params;

  const entry = await prisma.journalEntry.findFirst({
    where: { id, tenantId },
    include: {
      lines: {
        include: { glAccount: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!entry) redirect("/fi/journal");

  const totalDebit = entry.lines.reduce((sum, l) => sum + Number(l.debit), 0);
  const totalCredit = entry.lines.reduce((sum, l) => sum + Number(l.credit), 0);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="font-mono text-xl font-bold text-gray-900">{entry.number}</h1>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[entry.status] ?? "bg-gray-100 text-gray-700"}`}
            >
              {entry.status}
            </span>
          </div>
          <p className="text-sm text-gray-500">{entry.description}</p>
        </div>
        <Link href="/fi/journal" className="text-sm text-blue-600 hover:underline">
          ← Back to Journal
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Entry Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(entry.date).toLocaleDateString("en-US", { dateStyle: "medium" })}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Source</dt>
              <dd className="mt-1 text-sm text-gray-900">{entry.source}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900">{entry.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(entry.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Account Code</th>
                  <th className="px-4 py-3">Account Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entry.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {line.glAccount.code}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{line.glAccount.name}</td>
                    <td className="px-4 py-3 text-gray-500">{line.description ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {Number(line.debit) > 0 ? formatCurrency(Number(line.debit)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {Number(line.credit) > 0 ? formatCurrency(Number(line.credit)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-gray-500">
                    Totals
                  </td>
                  <td className="px-4 py-3 text-right">{formatCurrency(totalDebit)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {entry.status === "DRAFT" && (
        <PostButton entryId={entry.id} />
      )}
    </div>
  );
}
