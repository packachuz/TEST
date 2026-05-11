import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  POSTED: "bg-green-100 text-green-700",
  REVERSED: "bg-red-100 text-red-700",
};

export default async function JournalPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const entries = await prisma.journalEntry.findMany({
    where: { tenantId },
    include: { lines: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
        <Link
          href="/fi/journal/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Entry
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Entries ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No journal entries found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Lines</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="cursor-pointer hover:bg-gray-50"
                    >
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
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {entry.source}
                        </span>
                      </td>
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
