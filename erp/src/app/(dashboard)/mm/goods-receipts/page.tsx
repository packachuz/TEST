"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

interface GR {
  id: string;
  number: string;
  date: string;
  status: string;
  journalEntryId: string | null;
  po: {
    number: string;
    vendor: { name: string };
  };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-green-100 text-green-700",
  REVERSED: "bg-red-100 text-red-700",
};

export default function GoodsReceiptsPage() {
  const [grs, setGRs] = useState<GR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mm/goods-receipts")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) ? setGRs(data) : setError(data.error ?? "Failed to load"))
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleConfirm(id: string) {
    setActionLoading(id);
    const res = await fetch(`/api/mm/goods-receipts/${id}/confirm`, { method: "POST" });
    const json = await res.json();
    if (res.ok) {
      setGRs((prev) => prev.map((gr) =>
        gr.id === id ? { ...gr, status: json.status, journalEntryId: json.journalEntryId } : gr
      ));
    }
    setActionLoading(null);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Goods Receipts</h1>
        <Link href="/mm/goods-receipts/new">
          <Button><Plus className="h-4 w-4" />New GR</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>All Goods Receipts</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          ) : error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : grs.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No goods receipts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">PO Number</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Journal Entry</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {grs.map((gr) => (
                    <tr key={gr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{gr.number}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(gr.date)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{gr.po.number}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{gr.po.vendor.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[gr.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {gr.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {gr.journalEntryId ? (
                          <span className="text-green-700">Posted</span>
                        ) : gr.status === "CONFIRMED" ? (
                          <span className="text-gray-400">No accounts</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {gr.status === "DRAFT" ? (
                          <Button
                            variant="ghost"
                            className="h-7 px-2 text-xs text-green-700 hover:bg-green-50"
                            disabled={actionLoading !== null}
                            onClick={() => handleConfirm(gr.id)}
                          >
                            {actionLoading === gr.id ? "..." : "Confirm"}
                          </Button>
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
