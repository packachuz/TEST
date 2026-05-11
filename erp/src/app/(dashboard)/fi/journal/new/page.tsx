"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

interface GLAccount {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface Line {
  glAccountId: string;
  debit: string;
  credit: string;
  description: string;
}

const emptyLine = (): Line => ({ glAccountId: "", debit: "", credit: "", description: "" });

export default function NewJournalEntryPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetch("/api/fi/accounts")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setAccounts(data));
  }, []);

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  function updateLine(index: number, field: keyof Line, value: string) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!date || !description) {
      setError("Date and description are required");
      return;
    }
    if (!isBalanced) {
      setError("Entry must balance: total debits must equal total credits");
      return;
    }
    const validLines = lines.filter((l) => l.glAccountId);
    if (validLines.length < 2) {
      setError("At least 2 lines with accounts are required");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/fi/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        description,
        lines: validLines.map((l) => ({
          glAccountId: l.glAccountId,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description || null,
        })),
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to create entry");
      setLoading(false);
      return;
    }

    router.push("/fi/journal");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Journal Entry</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Entry Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Input
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Entry description"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <span
                className={`text-sm font-medium ${isBalanced ? "text-green-600" : "text-red-500"}`}
              >
                {isBalanced
                  ? "Balanced"
                  : `Difference: ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-2 py-2">Account</th>
                    <th className="px-2 py-2">Description</th>
                    <th className="px-2 py-2 text-right">Debit</th>
                    <th className="px-2 py-2 text-right">Credit</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((line, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-2">
                        <select
                          value={line.glAccountId}
                          onChange={(e) => updateLine(idx, "glAccountId", e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select account</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} — {a.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => updateLine(idx, "description", e.target.value)}
                          placeholder="Optional"
                          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.debit}
                          onChange={(e) => updateLine(idx, "debit", e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.credit}
                          onChange={(e) => updateLine(idx, "credit", e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          disabled={lines.length <= 2}
                          className="rounded p-1 text-gray-400 hover:text-red-500 disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50 font-medium">
                  <tr>
                    <td colSpan={2} className="px-2 py-2 text-right text-xs text-gray-500">
                      Totals
                    </td>
                    <td className="px-2 py-2 text-right">{formatCurrency(totalDebit)}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(totalCredit)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <button
              type="button"
              onClick={addLine}
              className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <Plus className="h-4 w-4" /> Add Line
            </button>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Entry"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/fi/journal")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
