import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarCheck, FileText, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalEmployees, presentToday, pendingLeaves, lastPayroll] = await Promise.all([
    prisma.employee.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.attendance.count({
      where: {
        employee: { tenantId },
        date: today,
        status: "PRESENT",
      },
    }),
    prisma.leaveRequest.count({
      where: { employee: { tenantId }, status: "PENDING" },
    }),
    prisma.payrollRun.findFirst({
      where: { tenantId, status: "COMPLETED" },
      orderBy: { runAt: "desc" },
      include: { payrollItems: { select: { netSalary: true } } },
    }),
  ]);

  const lastPayrollTotal = lastPayroll
    ? lastPayroll.payrollItems.reduce((sum: number, item: { netSalary: unknown }) => sum + Number(item.netSalary), 0)
    : null;

  const stats = [
    {
      label: "Total Employees",
      value: totalEmployees,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Present Today",
      value: presentToday,
      icon: CalendarCheck,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Pending Leaves",
      value: pendingLeaves,
      icon: FileText,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Last Payroll",
      value: lastPayrollTotal !== null ? formatCurrency(lastPayrollTotal) : "N/A",
      sub: lastPayroll?.period ?? "",
      icon: DollarSign,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-500">{label}</CardTitle>
                <div className={`rounded-lg p-2 ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
