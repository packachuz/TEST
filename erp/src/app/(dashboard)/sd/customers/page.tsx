"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Plus, X } from "lucide-react";

interface Customer {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  creditLimit: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/sd/customers")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCustomers(data);
        else setError(data.error ?? "Failed to load");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    const res = await fetch("/api/sd/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      setFormError(json.error ?? "Failed to create customer");
      setSubmitting(false);
      return;
    }

    setCustomers((prev) => [json, ...prev]);
    setShowForm(false);
    form.reset();
    setSubmitting(false);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Customer"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <Input label="Code" name="code" required />
              <Input label="Name" name="name" required />
              <Input label="Email" name="email" type="email" />
              <Input label="Phone" name="phone" type="tel" />
              <Input label="Credit Limit" name="creditLimit" type="number" step="0.01" min="0" />
              <div className="col-span-2">
                <Input label="Address" name="address" />
              </div>
              {formError && <p className="col-span-2 text-sm text-red-600">{formError}</p>}
              <div className="col-span-2 flex gap-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Customer"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          ) : error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : customers.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No customers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Credit Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.email ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{c.phone ?? "—"}</td>
                      <td className="px-4 py-3">{formatCurrency(c.creditLimit)}</td>
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
