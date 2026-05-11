"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Plus, X } from "lucide-react";

interface Material {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  unit: string;
  standardPrice: string;
  stockQty: string;
}

const TYPE_COLORS: Record<string, string> = {
  RAW: "bg-gray-100 text-gray-700",
  FINISHED: "bg-green-100 text-green-700",
  SEMIFINISHED: "bg-yellow-100 text-yellow-700",
  SERVICE: "bg-blue-100 text-blue-700",
  TRADING: "bg-purple-100 text-purple-700",
};

const MATERIAL_TYPES = ["RAW", "FINISHED", "SEMIFINISHED", "SERVICE", "TRADING"];

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mm/materials")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) ? setMaterials(data) : setError(data.error ?? "Failed to load"))
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    const res = await fetch("/api/mm/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setFormError(json.error ?? "Failed to create");
      setSaving(false);
      return;
    }
    setMaterials((prev) => [json, ...prev]);
    setShowForm(false);
    form.reset();
    setSaving(false);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Materials</h1>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Material"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader><CardTitle>New Material</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="grid grid-cols-2 gap-4">
                <Input label="Code" name="code" required />
                <Input label="Name" name="name" required />
              </div>
              <Input label="Description" name="description" />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <select name="type" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <Input label="Unit" name="unit" defaultValue="EA" required />
                <Input label="Standard Price" name="standardPrice" type="number" step="0.01" min="0" required />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create Material"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>All Materials</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          ) : error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : materials.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No materials found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Standard Price</th>
                    <th className="px-4 py-3">Stock Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {materials.map((m) => {
                    const qty = Number(m.stockQty);
                    return (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs">{m.code}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{m.name}</p>
                          {m.description && <p className="text-xs text-gray-400">{m.description}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[m.type] ?? "bg-gray-100 text-gray-700"}`}>
                            {m.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{m.unit}</td>
                        <td className="px-4 py-3">{formatCurrency(m.standardPrice)}</td>
                        <td className="px-4 py-3">
                          <span className={qty <= 0 ? "font-semibold text-red-600" : "font-semibold text-green-600"}>
                            {qty.toFixed(3)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
