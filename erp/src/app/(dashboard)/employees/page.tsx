"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string | null;
  employmentType: string;
  status: string;
  baseSalary: string;
  startDate: string;
  department: { id: string; name: string } | null;
}

function statusVariant(status: string) {
  if (status === "ACTIVE") return "success";
  if (status === "INACTIVE") return "warning";
  if (status === "TERMINATED") return "danger";
  return "default";
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEmployees(data);
        else setError(data.error ?? "Failed to load");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleTerminate(id: string) {
    if (!confirm("Terminate this employee?")) return;
    const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEmployees((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "TERMINATED" } : e))
      );
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <Link href="/employees/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          ) : error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : employees.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No employees found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Job Title</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Salary</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{emp.employeeCode}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {emp.firstName} {emp.lastName}
                        <p className="text-xs text-gray-400">{emp.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{emp.department?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{emp.jobTitle ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="default">{emp.employmentType.replace("_", " ")}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(emp.status)}>{emp.status}</Badge>
                      </td>
                      <td className="px-4 py-3">{formatCurrency(emp.baseSalary)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {emp.status !== "TERMINATED" && (
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleTerminate(emp.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
