"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface POItem {
  id: string;
  materialId: string;
  quantity: string;
  unitPrice: string;
  material: { id: string; code: string; name: string; unit: string };
}

interface PO {
  id: string;
  number: string;
  vendor: { name: string };
  items: POItem[];
}

interface ReceiptLine {
  poItemId: string;
  materialId: string;
  quantityReceived: string;
  ordered: number;
  materialName: string;
  materialCode: string;
  unit: string;
}

export default function NewGRPage() {
  const router = useRouter();
  const [confirmedPOs, setConfirmedPOs] = useState<PO[]>([]);
  const [selectedPO, setSelectedPO] = useState<PO | null>(null);
  const [lines, setLines] = useState<ReceiptLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/mm/purchase-orders")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setConfirmedPOs(data.filter((po: any) => po.status === "CONFIRMED" || po.status === "PARTIALLY_RECEIVED"));
        }
      });
  }, []);

  function handlePOSelect(poId: string) {
    const po = confirmedPOs.find((p) => p.id === poId) ?? null;
    setSelectedPO(po);
    if (po) {
      setLines(
        po.items.map((item) => ({
          poItemId: item.id,
          materialId: item.materialId,
          quantityReceived: item.quantity,
          ordered: parseFloat(item.quantity),
          materialName: item.material.name,
          materialCode: item.material.code,
          unit: item.material.unit,
        }))
      );
    } else {
      setLines([]);
    }
  }

  function updateQty(i: number, value: string) {
    setLines((prev) => {
      const updated = [...prev];
      updated[i] = { ...updated[i], quantityReceived: value };
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPO) return;
    setError(null);
    setSaving(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      poId: selectedPO.id,
      date: fd.get("date") as string,
      notes: (fd.get("notes") as string) || undefined,
      items: lines.map((l) => ({
        poItemId: l.poItemId,
        materialId: l.materialId,
        quantityReceived: parseFloat(l.quantityReceived),
      })),
    };

    const res = await fetch("/api/mm/goods-receipts", {
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
    router.push("/mm/goods-receipts");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Goods Receipt</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Header</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label className="text-sm font-medium text-gray-700">Purchase Order *</label>
              <select
                required
                onChange={(e) => handlePOSelect(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select confirmed PO</option>
                {confirmedPOs.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.number} — {po.vendor.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              <Input label="Notes" name="notes" />
            </div>
          </CardContent>
        </Card>

        {selectedPO && lines.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Items to Receive</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Material</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Ordered</th>
                    <th className="px-4 py-3">Quantity Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((line, i) => (
                    <tr key={line.poItemId}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{line.materialName}</p>
                        <p className="text-xs text-gray-400">{line.materialCode}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{line.unit}</td>
                      <td className="px-4 py-3 text-gray-600">{line.ordered}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          max={line.ordered}
                          value={line.quantityReceived}
                          onChange={(e) => updateQty(i, e.target.value)}
                          className="block w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.push("/mm/goods-receipts")}>Cancel</Button>
          <Button type="submit" disabled={saving || !selectedPO}>
            {saving ? "Creating..." : "Create Goods Receipt"}
          </Button>
        </div>
      </form>
    </div>
  );
}
