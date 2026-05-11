"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface SalesOrder {
  id: string;
  number: string;
  totalAmount: string;
  customer: { name: string };
  status: string;
}

const SELECT_CLASS =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function defaultDate() {
  return new Date().toISOString().slice(0, 10);
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/sd/sales-orders")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setOrders(
            data.filter((o: any) =>
              ["DELIVERED", "PARTIALLY_DELIVERED"].includes(o.status)
            )
          );
        }
      });
  }, []);

  function handleSOChange(soId: string) {
    const so = orders.find((o) => o.id === soId) ?? null;
    setSelectedSO(so);
    if (so) setAmount(String(so.totalAmount));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSO) return;
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const date = (form.elements.namedItem("date") as HTMLInputElement).value;
    const dueDate = (form.elements.namedItem("dueDate") as HTMLInputElement).value;
    const notes = (form.elements.namedItem("notes") as HTMLInputElement).value;

    const res = await fetch("/api/sd/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        soId: selectedSO.id,
        date,
        dueDate,
        amount: Number(amount),
        notes,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to create invoice");
      setLoading(false);
      return;
    }

    router.push("/sd/billing");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Customer Invoice</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
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
                <option value="">Select delivered sales order</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.number} — {o.customer.name} ({formatCurrency(o.totalAmount)})
                  </option>
                ))}
              </select>
            </div>

            {selectedSO && (
              <div className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-700">
                Customer: <span className="font-medium">{selectedSO.customer.name}</span>
                &nbsp;&nbsp;|&nbsp;&nbsp;SO Total:{" "}
                <span className="font-medium">{formatCurrency(selectedSO.totalAmount)}</span>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Invoice Date" name="date" type="date" defaultValue={defaultDate()} required />
              <Input label="Due Date" name="dueDate" type="date" defaultValue={defaultDueDate()} required />
            </div>

            <Input label="Notes" name="notes" />
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading || !selectedSO}>
            {loading ? "Creating..." : "Create Invoice"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/sd/billing")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
