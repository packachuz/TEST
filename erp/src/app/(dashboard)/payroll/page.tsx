"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface PayrollItem {
  id: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  tax: number;
  netSalary: number;
  employee: { firstName: string; lastName: string; employeeCode: string };
}

interface PayrollRun {
  id: string;
  period: string;
  status: string;
  runAt: string | null;
  createdAt: string;
  payrollItems: PayrollItem[];
}

function statusVariant(s: string) {
  if (s === "COMPLETED") return "success";
  if (s === "PROCESSING") return "warning";
  if (s === "CANCELLED") return "danger";
  return "default";
}

export default function PayrollPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchRuns = () => {
    setLoading(true);
    fetch("/api/payroll")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setRuns(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  async function createRun() {
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
    setCreating(true);
    const res = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period: currentPeriod }),
    });
    setCreating(false);
    if (res.ok) fetchRuns();
    else {
      const data = await res.json();
      alert(data.error ?? "Failed to create payroll run");
    }
  }

  async function processRun(id: string) {
    setProcessing(id);
    const res = await fetch(`/api/payroll/${id}/process`, { method: "POST" });
    setProcessing(null);
    if (res.ok) fetchRuns();
    else {
      const data = await res.json();
      alert(data.error ?? "Failed to process payroll");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
        <Button onClick={createRun} disabled={creating}>
          {creating ? "Creating..." : "Run Payroll"}
        </Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : runs.length === 0 ? (
          <p className="text-sm text-gray-500">No payroll runs yet.</p>
        ) : (
          runs.map((run) => {
            const total = run.payrollItems.reduce((s, i) => s + Number(i.netSalary), 0);
            const isExpanded = expanded === run.id;
            return (
              <Card key={run.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle>{run.period}</CardTitle>
                      <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      {run.status !== "COMPLETED" && (
                        <Button
                          variant="secondary"
                          className="h-8 text-sm"
                          disabled={processing === run.id}
                          onClick={() => processRun(run.id)}
                        >
                          {processing === run.id ? "Processing..." : "Process"}
                        </Button>
                      )}
                      {run.payrollItems.length > 0 && (
                        <Button
                          variant="ghost"
                          className="h-8 text-sm"
                          onClick={() => setExpanded(isExpanded ? null : run.id)}
                        >
                          {isExpanded ? "Hide" : "View"} Payslips
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-6 text-sm text-gray-600">
                    <span>
                      Employees: <strong>{run.payrollItems.length}</strong>
                    </span>
                    <span>
                      Total Net: <strong>{formatCurrency(total)}</strong>
                    </span>
                    {run.runAt && (
                      <span>
                        Processed: <strong>{new Date(run.runAt).toLocaleDateString()}</strong>
                      </span>
                    )}
                  </div>

                  {isExpanded && run.payrollItems.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          <tr>
                            <th className="px-3 py-2">Employee</th>
                            <th className="px-3 py-2">Base Salary</th>
                            <th className="px-3 py-2">Allowances</th>
                            <th className="px-3 py-2">Deductions</th>
                            <th className="px-3 py-2">Tax (15%)</th>
                            <th className="px-3 py-2">Net Salary</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {run.payrollItems.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <p className="font-medium">{item.employee.firstName} {item.employee.lastName}</p>
                                <p className="text-xs text-gray-400">{item.employee.employeeCode}</p>
                              </td>
                              <td className="px-3 py-2">{formatCurrency(item.baseSalary)}</td>
                              <td className="px-3 py-2">{formatCurrency(item.allowances)}</td>
                              <td className="px-3 py-2">{formatCurrency(item.deductions)}</td>
                              <td className="px-3 py-2 text-red-600">{formatCurrency(item.tax)}</td>
                              <td className="px-3 py-2 font-semibold text-green-700">
                                {formatCurrency(item.netSalary)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
