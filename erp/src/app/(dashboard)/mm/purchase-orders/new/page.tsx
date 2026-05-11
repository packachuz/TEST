"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

interface Vendor { id: string; code: string; name: string }
interface Material { id: string; code: string; name: string; standardPrice: string }
interface PR { id: string; number: string; requestedBy: string }
interface LineItem { materialId: string; quantity: string; unitPrice: string }

export default function NewPOPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [approvedPRs, setApprovedPRs] = useState<PR[]>([]);
  const [lines, setLines] = useState<LineItem[]>([{ materialId: "", quantity: "1", unitPrice: "0" }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/mm/vendors").then((r) => r.json()),
      fetch("/api/mm/materials").then((r) => r.json()),
      fetch("/api/mm/purchase-requisitions").then((r) => r.json()),
    ]).then(([v, m, prs]) => {
      if (Array.isArray(v)) setVendors(v);
      if (Array.isArray(m)) setMaterials(m);
      if (Array.isArray(prs)) setApprovedPRs(prs.filter((pr: any) => pr.status === "APPROVED"));
    });
  }, []);

  function addLine() {
    setLines((prev) => [...prev, { materialId: "", quantity: "1", unitPrice: "0" }]);
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
        if (mat) updated[i].unitPrice = mat.standardPrice;
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

    if (lines.some((l) => !l.materialId)) {
      setError("Please select a material for all line items");
      setSaving(false);
      return;
    }

    const payload = {
      vendorId: fd.get("vendorId") as string,
      prId: (fd.get("prId") as string) || undefined,
      date: fd.get("date") as string,
      notes: (fd.get("notes") as string) || undefined,
      items: lines.map((l) => ({
        materialId: l.materialId,
        quantity: parseFloat(l.quantity),
        unitPrice: parseFloat(l.unitPrice),
      })),
    };

    const res = await fetch("/api/mm/purchase-orders", {
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
    router.push("/mm/purchase-orders");
  }

  const total = lines.reduce(
    (sum, l) => sum + parseFloat(l.quantity || "0") * parseFloat(l.unitPrice || "0"),
    0
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Purchase Order</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Header</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Vendor *</label>
                <select name="vendorId" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Select vendor</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.code} — {v.name}</option>)}
                </select>
              </div>
              <Input label="Date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Purchase Requisition (optional)</label>
              <select name="prId" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">None</option>
                {approvedPRs.map((pr) => <option key={pr.id} value={pr.id}>{pr.number} — {pr.requestedBy}</option>)}
              </select>
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
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line, i) => {
                  const lineTotal = parseFloat(line.quantity || "0") * parseFloat(line.unitPrice || "0");
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
                          {materials.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min="0.001" step="0.001"
                          value={line.quantity}
                          onChange={(e) => updateLine(i, "quantity", e.target.value)}
                          className="block w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min="0" step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(i, "unitPrice", e.target.value)}
                          className="block w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </td>
                      <td className="px-4 py-2 text-gray-700">{formatCurrency(lineTotal)}</td>
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
          <Button type="button" variant="ghost" onClick={() => router.push("/mm/purchase-orders")}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Purchase Order"}</Button>
        </div>
      </form>
    </div>
  );
}
