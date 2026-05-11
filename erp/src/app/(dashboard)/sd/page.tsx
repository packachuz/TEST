import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingCart, Truck, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function soStatusVariant(status: string) {
  if (status === "CONFIRMED") return "default";
  if (status === "PARTIALLY_DELIVERED") return "warning";
  if (status === "DELIVERED") return "success";
  if (status === "BILLED") return "success";
  if (status === "CANCELLED") return "danger";
  return "default";
}

export default async function SDPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [customerCount, openSOCount, billedThisMonthAgg, pendingDeliveryCount, recentOrders] =
    await Promise.all([
      prisma.customer.count({ where: { tenantId } }),
      prisma.salesOrder.count({
        where: {
          tenantId,
          status: { in: ["DRAFT", "CONFIRMED", "PARTIALLY_DELIVERED", "DELIVERED"] },
        },
      }),
      prisma.customerInvoice.aggregate({
        where: {
          tenantId,
          status: { in: ["POSTED", "PAID"] },
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.delivery.count({
        where: { tenantId, status: { in: ["DRAFT", "PICKED"] } },
      }),
      prisma.salesOrder.findMany({
        where: { tenantId },
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const billedTotal = Number(billedThisMonthAgg._sum.amount ?? 0);

  const stats = [
    {
      label: "Total Customers",
      value: customerCount,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Open Sales Orders",
      value: openSOCount,
      icon: ShoppingCart,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Billed This Month",
      value: formatCurrency(billedTotal),
      icon: FileText,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Pending Deliveries",
      value: pendingDeliveryCount,
      icon: Truck,
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Sales & Distribution</h1>

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
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
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sales Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentOrders.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No sales orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{order.number}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(order.date)}</td>
                      <td className="px-4 py-3 text-gray-900">{order.customer.name}</td>
                      <td className="px-4 py-3">{formatCurrency(Number(order.totalAmount))}</td>
                      <td className="px-4 py-3">
                        <Badge variant={soStatusVariant(order.status)}>{order.status}</Badge>
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
