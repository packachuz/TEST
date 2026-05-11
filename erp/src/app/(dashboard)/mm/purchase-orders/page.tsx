"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

interface PO {
  id: string;
  number: string;
  date: string;
  status: string;
  totalAmount: string;
  vendor: { id: string; name: string };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PARTIALLY_RECEIVED: "bg-yellow-100 text-yellow-700",
  RECEIVED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function PurchaseOrdersPage() {
  const [pos, setPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mm/purchase-orders")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) ? setPOs(data) : setError(data.error ?? "Failed to load"))
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleConfirm(id: string) {
    setActionLoading(id);
    const res = await fetch(`/api/mm/purchase-orders/${id}/confirm`, { method: "POST" });
    const json = await res.json();
    if (res.ok) {
      setPOs((prev) => prev.map((po) => po.id === id ? { ...po, status: json.status } : po));
    }
    setActionLoading(null);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        <Link href="/mm/purchase-orders/new">
          <Button><Plus className="h-4 w-4" />New PO</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>All Purchase Orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          ) : error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : pos.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No purchase orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pos.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{po.number}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(po.date)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{po.vendor.name}</td>
                      <td className="px-4 py-3">{formatCurrency(po.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[po.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {po.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {po.status === "DRAFT" ? (
                          <Button
                            variant="ghost"
                            className="h-7 px-2 text-xs text-blue-700 hover:bg-blue-50"
                            disabled={actionLoading !== null}
                            onClick={() => handleConfirm(po.id)}
                          >
                            {actionLoading === po.id ? "..." : "Confirm"}
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
