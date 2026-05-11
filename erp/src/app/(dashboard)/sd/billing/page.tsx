"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

interface CustomerInvoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  amount: string;
  status: string;
  customer: { name: string };
  so: { number: string };
}

function statusVariant(status: string) {
  if (status === "DRAFT") return "default";
  if (status === "POSTED") return "default";
  if (status === "PAID") return "success";
  if (status === "CANCELLED") return "danger";
  return "default";
}

function statusClass(status: string): string {
  if (status === "POSTED") return "bg-blue-100 text-blue-800";
  return "";
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sd/billing")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setInvoices(data);
        else setError(data.error ?? "Failed to load");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  async function handlePost(id: string) {
    const res = await fetch(`/api/sd/billing/${id}/post`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...updated } : inv)));
    }
  }

  async function handlePay(id: string) {
    const res = await fetch(`/api/sd/billing/${id}/pay`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...updated } : inv)));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customer Invoices</h1>
        <Link href="/sd/billing/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          ) : error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : invoices.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No invoices found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">SO</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{inv.number}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(inv.date)}</td>
                      <td className="px-4 py-3 text-gray-900">{inv.customer.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{inv.so.number}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(inv.dueDate)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={statusVariant(inv.status)}
                          className={statusClass(inv.status)}
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {inv.status === "DRAFT" && (
                            <Button
                              variant="secondary"
                              className="h-7 px-3 text-xs"
                              onClick={() => handlePost(inv.id)}
                            >
                              Post Invoice
                            </Button>
                          )}
                          {inv.status === "POSTED" && (
                            <Button
                              variant="secondary"
                              className="h-7 px-3 text-xs"
                              onClick={() => handlePay(inv.id)}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
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
