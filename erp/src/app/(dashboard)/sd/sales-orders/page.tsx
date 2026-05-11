"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

interface SalesOrder {
  id: string;
  number: string;
  date: string;
  status: string;
  totalAmount: string;
  customer: { name: string };
}

function statusVariant(status: string) {
  if (status === "DRAFT") return "default";
  if (status === "CONFIRMED") return "default";
  if (status === "PARTIALLY_DELIVERED") return "warning";
  if (status === "DELIVERED") return "success";
  if (status === "BILLED") return "success";
  if (status === "CANCELLED") return "danger";
  return "default";
}

function statusClass(status: string): string {
  if (status === "CONFIRMED") return "bg-blue-100 text-blue-800";
  if (status === "BILLED") return "bg-purple-100 text-purple-800";
  return "";
}

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sd/sales-orders")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setOrders(data);
        else setError(data.error ?? "Failed to load");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleConfirm(id: string) {
    const res = await fetch(`/api/sd/sales-orders/${id}/confirm`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
        <Link href="/sd/sales-orders/new">
          <Button>
            <Plus className="h-4 w-4" />
            New SO
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sales Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          ) : error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : orders.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No sales orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{order.number}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(order.date)}</td>
                      <td className="px-4 py-3 text-gray-900">{order.customer.name}</td>
                      <td className="px-4 py-3">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={statusVariant(order.status)}
                          className={statusClass(order.status)}
                        >
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {order.status === "DRAFT" && (
                          <Button
                            variant="secondary"
                            className="h-7 px-3 text-xs"
                            onClick={() => handleConfirm(order.id)}
                          >
                            Confirm
                          </Button>
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
