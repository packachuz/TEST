"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface LeaveRequest {
  id: string;
  days: number;
  reason: string | null;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  employee: { firstName: string; lastName: string; employeeCode: string };
  leaveType: { name: string; isPaid: boolean };
}

function statusVariant(s: string) {
  if (s === "APPROVED") return "success";
  if (s === "REJECTED") return "danger";
  if (s === "PENDING") return "warning";
  return "default";
}

export default function LeavesPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canReview = role === "ADMIN" || role === "HR";

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = () => {
    setLoading(true);
    fetch("/api/leaves")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setLeaves(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  async function updateStatus(id: string, status: "APPROVED" | "REJECTED") {
    const res = await fetch(`/api/leaves/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchLeaves();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Leave Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          ) : leaves.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No leave requests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Days</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Status</th>
                    {canReview && <th className="px-4 py-3">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leaves.map((lv) => (
                    <tr key={lv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {lv.employee.firstName} {lv.employee.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{lv.employee.employeeCode}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{lv.leaveType.name}</p>
                        <p className="text-xs text-gray-400">{lv.leaveType.isPaid ? "Paid" : "Unpaid"}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(lv.startDate)} — {formatDate(lv.endDate)}
                      </td>
                      <td className="px-4 py-3">{lv.days}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{lv.reason ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(lv.status)}>{lv.status}</Badge>
                      </td>
                      {canReview && (
                        <td className="px-4 py-3">
                          {lv.status === "PENDING" && (
                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                className="h-7 px-2 text-xs"
                                onClick={() => updateStatus(lv.id, "APPROVED")}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                className="h-7 px-2 text-xs"
                                onClick={() => updateStatus(lv.id, "REJECTED")}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
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
