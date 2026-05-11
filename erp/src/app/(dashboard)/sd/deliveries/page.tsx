"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

interface Delivery {
  id: string;
  number: string;
  date: string;
  status: string;
  journalEntryId: string | null;
  so: {
    number: string;
    customer: { name: string };
  };
}

function statusVariant(status: string) {
  if (status === "DRAFT") return "default";
  if (status === "PICKED") return "warning";
  if (status === "SHIPPED") return "default";
  if (status === "DELIVERED") return "success";
  return "default";
}

function statusClass(status: string): string {
  if (status === "SHIPPED") return "bg-blue-100 text-blue-800";
  return "";
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sd/deliveries")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDeliveries(data);
        else setError(data.error ?? "Failed to load");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleShip(id: string) {
    const res = await fetch(`/api/sd/deliveries/${id}/ship`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Deliveries</h1>
        <Link href="/sd/deliveries/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Delivery
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Deliveries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          ) : error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : deliveries.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No deliveries found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Sales Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Journal Entry</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{d.number}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(d.date)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{d.so.number}</td>
                      <td className="px-4 py-3 text-gray-900">{d.so.customer.name}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={statusVariant(d.status)}
                          className={statusClass(d.status)}
                        >
                          {d.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {d.journalEntryId ? (
                          <Badge variant="success">Posted</Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {["DRAFT", "PICKED"].includes(d.status) && (
                          <Button
                            variant="secondary"
                            className="h-7 px-3 text-xs"
                            onClick={() => handleShip(d.id)}
                          >
                            Ship
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
