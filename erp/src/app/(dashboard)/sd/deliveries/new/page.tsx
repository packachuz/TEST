"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface SOItem {
  id: string;
  materialId: string;
  quantity: string;
  unitPrice: string;
  material: { id: string; code: string; name: string };
}

interface SalesOrder {
  id: string;
  number: string;
  customer: { name: string };
  items: SOItem[];
}

interface DeliveryLine {
  soItemId: string;
  materialId: string;
  quantity: string;
  maxQty: number;
  materialName: string;
}

const SELECT_CLASS =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function NewDeliveryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [lines, setLines] = useState<DeliveryLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/sd/sales-orders")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setOrders(
            data.filter((o: any) =>
              ["CONFIRMED", "PARTIALLY_DELIVERED"].includes(o.status)
            )
          );
        }
      });
  }, []);

  function handleSOChange(soId: string) {
    const so = orders.find((o) => o.id === soId) ?? null;
    setSelectedSO(so);
    if (so) {
      setLines(
        so.items.map((item) => ({
          soItemId: item.id,
          materialId: item.materialId,
          quantity: String(item.quantity),
          maxQty: Number(item.quantity),
          materialName: `${item.material.code} — ${item.material.name}`,
        }))
      );
    } else {
      setLines([]);
    }
  }

  function updateQty(index: number, value: string) {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: value };
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSO) return;
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const date = (form.elements.namedItem("date") as HTMLInputElement).value;
    const notes = (form.elements.namedItem("notes") as HTMLInputElement).value;

    const items = lines
      .filter((l) => Number(l.quantity) > 0)
      .map((l) => ({
        soItemId: l.soItemId,
        materialId: l.materialId,
        quantity: Number(l.quantity),
      }));

    if (items.length === 0) {
      setError("At least one line item with quantity > 0 is required");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/sd/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soId: selectedSO.id, date, notes, items }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to create delivery");
      setLoading(false);
      return;
    }

    router.push("/sd/deliveries");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Delivery</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Sales Order</label>
              <select
                name="soId"
                required
                onChange={(e) => handleSOChange(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Select confirmed sales order</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.number} — {o.customer.name}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Delivery Date" name="date" type="date" required />
            <Input label="Notes" name="notes" />
          </CardContent>
        </Card>

        {selectedSO && lines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>SO Items</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Material</th>
                    <th className="px-4 py-2">SO Qty</th>
                    <th className="px-4 py-2">Deliver Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((line, i) => (
                    <tr key={line.soItemId}>
                      <td className="px-4 py-2">{line.materialName}</td>
                      <td className="px-4 py-2 text-gray-600">{line.maxQty}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          max={line.maxQty}
                          step="0.001"
                          value={line.quantity}
                          onChange={(e) => updateQty(i, e.target.value)}
                          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading || !selectedSO}>
            {loading ? "Creating..." : "Create Delivery"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/sd/deliveries")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
