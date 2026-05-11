"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "ON_LEAVE" | "HOLIDAY";

interface AttendanceRecord {
  id: string;
  status: AttendanceStatus;
  date: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    department: { name: string } | null;
  };
}

function statusVariant(s: string) {
  if (s === "PRESENT") return "success";
  if (s === "ABSENT") return "danger";
  if (s === "LATE" || s === "HALF_DAY") return "warning";
  return "default";
}

export default function AttendancePage() {
  const todayStr = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(todayStr);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchRecords = (d: string) => {
    setLoading(true);
    fetch(`/api/attendance?date=${d}`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setRecords(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecords(date);
  }, [date]);

  async function markAttendance(employeeId: string, status: AttendanceStatus) {
    setSaving(employeeId);
    await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, date, status }),
    });
    fetchRecords(date);
    setSaving(null);
  }

  const statuses: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "HALF_DAY"];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Attendance for {new Date(date + "T00:00:00").toLocaleDateString("en-US", { dateStyle: "long" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          ) : records.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No attendance records for this date.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Mark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{rec.employee.employeeCode}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {rec.employee.firstName} {rec.employee.lastName}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{rec.employee.department?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(rec.status)}>{rec.status.replace("_", " ")}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {statuses.map((s) => (
                            <Button
                              key={s}
                              variant={rec.status === s ? "primary" : "secondary"}
                              className="h-7 px-2 text-xs"
                              disabled={saving === rec.employee.id}
                              onClick={() => markAttendance(rec.employee.id, s)}
                            >
                              {s.replace("_", " ")}
                            </Button>
                          ))}
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
