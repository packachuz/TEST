"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

interface PRItem {
  id: string;
}

interface PR {
  id: string;
  number: string;
  date: string;
  requestedBy: string;
  status: string;
  items: PRItem[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ORDERED: "bg-purple-100 text-purple-700",
};

export default function PurchaseRequisitionsPage() {
  const [prs, setPRs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mm/purchase-requisitions")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) ? setPRs(data) : setError(data.error ?? "Failed to load"))
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleAction(id: string, action: "approve" | "reject") {
    setActionLoading(`${action}-${id}`);
    const res = await fetch(`/api/mm/purchase-requisitions/${id}/${action}`, { method: "POST" });
    const json = await res.json();
    if (res.ok) {
      setPRs((prev) => prev.map((pr) => pr.id === id ? { ...pr, status: json.status } : pr));
    }
    setActionLoading(null);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Requisitions</h1>
        <Link href="/mm/purchase-requisitions/new">
          <Button><Plus className="h-4 w-4" />New PR</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>All Requisitions</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          ) : error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : prs.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No purchase requisitions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Requested By</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {prs.map((pr) => (
                    <tr key={pr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{pr.number}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(pr.date)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{pr.requestedBy}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[pr.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {pr.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{pr.items.length}</td>
                      <td className="px-4 py-3">
                        {pr.status === "SUBMITTED" || pr.status === "DRAFT" ? (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              className="h-7 px-2 text-xs text-green-700 hover:bg-green-50"
                              disabled={actionLoading !== null}
                              onClick={() => handleAction(pr.id, "approve")}
                            >
                              {actionLoading === `approve-${pr.id}` ? "..." : "Approve"}
                            </Button>
                            <Button
                              variant="ghost"
                              className="h-7 px-2 text-xs text-red-700 hover:bg-red-50"
                              disabled={actionLoading !== null}
                              onClick={() => handleAction(pr.id, "reject")}
                            >
                              {actionLoading === `reject-${pr.id}` ? "..." : "Reject"}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
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
