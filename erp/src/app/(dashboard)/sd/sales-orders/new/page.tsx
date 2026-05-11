"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

interface Customer {
  id: string;
  code: string;
  name: string;
}

interface Material {
  id: string;
  code: string;
  name: string;
  standardPrice: string;
}

interface LineItem {
  materialId: string;
  quantity: string;
  unitPrice: string;
}

const SELECT_CLASS =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [items, setItems] = useState<LineItem[]>([{ materialId: "", quantity: "1", unitPrice: "0" }]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/sd/customers").then((r) => r.json()),
      fetch("/api/mm/materials").then((r) => r.json()),
    ]).then(([c, m]) => {
      if (Array.isArray(c)) setCustomers(c);
      if (Array.isArray(m)) setMaterials(m);
    });
  }, []);

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "materialId") {
        const mat = materials.find((m) => m.id === value);
        if (mat) next[index].unitPrice = String(mat.standardPrice);
      }
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, { materialId: "", quantity: "1", unitPrice: "0" }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const runningTotal = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const customerId = (form.elements.namedItem("customerId") as HTMLSelectElement).value;
    const date = (form.elements.namedItem("date") as HTMLInputElement).value;
    const notes = (form.elements.namedItem("notes") as HTMLInputElement).value;

    const res = await fetch("/api/sd/sales-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, date, notes, items }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to create sales order");
      setLoading(false);
      return;
    }

    router.push("/sd/sales-orders");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Sales Order</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Customer</label>
              <select name="customerId" required className={SELECT_CLASS}>
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Order Date" name="date" type="date" required />
            <Input label="Notes" name="notes" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" variant="secondary" onClick={addItem}>
                <Plus className="h-4 w-4" />
                Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="flex items-end gap-3">
                <div className="flex-1">
                  {i === 0 && (
                    <label className="mb-1 block text-xs font-medium text-gray-500">Material</label>
                  )}
                  <select
                    value={item.materialId}
                    onChange={(e) => updateItem(i, "materialId", e.target.value)}
                    required
                    className={SELECT_CLASS.replace("mt-1 ", "")}
                  >
                    <option value="">Select material</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code} — {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  {i === 0 && (
                    <label className="mb-1 block text-xs font-medium text-gray-500">Qty</label>
                  )}
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", e.target.value)}
                    required
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="w-28">
                  {i === 0 && (
                    <label className="mb-1 block text-xs font-medium text-gray-500">Unit Price</label>
                  )}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                    required
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="w-28 pb-2 text-right text-sm text-gray-600">
                  {formatCurrency(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-9 p-0 text-red-500"
                  onClick={() => removeItem(i)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="border-t border-gray-200 pt-3 text-right">
              <span className="text-sm font-medium text-gray-500">Total: </span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(runningTotal)}</span>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Sales Order"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/sd/sales-orders")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
