"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

interface Material {
  id: string;
  code: string;
  name: string;
  standardPrice: string;
}

interface LineItem {
  materialId: string;
  quantity: string;
  estimatedPrice: string;
}

export default function NewPRPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lines, setLines] = useState<LineItem[]>([{ materialId: "", quantity: "1", estimatedPrice: "0" }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/mm/materials")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setMaterials(data));
  }, []);

  function addLine() {
    setLines((prev) => [...prev, { materialId: "", quantity: "1", estimatedPrice: "0" }]);
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateLine(i: number, field: keyof LineItem, value: string) {
    setLines((prev) => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      if (field === "materialId") {
        const mat = materials.find((m) => m.id === value);
        if (mat) updated[i].estimatedPrice = mat.standardPrice;
      }
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      requestedBy: fd.get("requestedBy") as string,
      date: fd.get("date") as string,
      notes: fd.get("notes") as string || undefined,
      items: lines.map((l) => ({
        materialId: l.materialId,
        quantity: parseFloat(l.quantity),
        estimatedPrice: parseFloat(l.estimatedPrice),
      })),
    };

    if (lines.some((l) => !l.materialId)) {
      setError("Please select a material for all line items");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/mm/purchase-requisitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to create");
      setSaving(false);
      return;
    }
    router.push("/mm/purchase-requisitions");
  }

  const total = lines.reduce(
    (sum, l) => sum + parseFloat(l.quantity || "0") * parseFloat(l.estimatedPrice || "0"),
    0
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Purchase Requisition</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Header</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Requested By" name="requestedBy" required />
              <Input label="Date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <Input label="Notes" name="notes" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" variant="ghost" onClick={addLine}>
                <Plus className="h-4 w-4" />Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Est. Price</th>
                  <th className="px-4 py-3">Subtotal</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line, i) => {
                  const subtotal = parseFloat(line.quantity || "0") * parseFloat(line.estimatedPrice || "0");
                  return (
                    <tr key={i}>
                      <td className="px-4 py-2">
                        <select
                          value={line.materialId}
                          onChange={(e) => updateLine(i, "materialId", e.target.value)}
                          className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select material</option>
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={line.quantity}
                          onChange={(e) => updateLine(i, "quantity", e.target.value)}
                          className="block w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.estimatedPrice}
                          onChange={(e) => updateLine(i, "estimatedPrice", e.target.value)}
                          className="block w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </td>
                      <td className="px-4 py-2 text-gray-700">{formatCurrency(subtotal)}</td>
                      <td className="px-4 py-2">
                        {lines.length > 1 && (
                          <Button type="button" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => removeLine(i)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.push("/mm/purchase-requisitions")}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Requisition"}</Button>
        </div>
      </form>
    </div>
  );
}
