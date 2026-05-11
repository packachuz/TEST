import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function MMPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const tenantId = session.user.tenantId;

  const [materials, openPRCount, openPOCount, recentPOs] = await Promise.all([
    prisma.material.findMany({ where: { tenantId } }),
    prisma.purchaseRequisition.count({
      where: { tenantId, status: { in: ["DRAFT", "SUBMITTED", "APPROVED"] } },
    }),
    prisma.purchaseOrder.count({
      where: { tenantId, status: { in: ["DRAFT", "CONFIRMED"] } },
    }),
    prisma.purchaseOrder.findMany({
      where: { tenantId },
      include: { vendor: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const totalStockValue = materials.reduce(
    (sum, m) => sum + Number(m.stockQty) * Number(m.standardPrice),
    0
  );

  const stats = [
    { label: "Total Materials", value: materials.length.toString() },
    { label: "Stock Value", value: formatCurrency(totalStockValue) },
    { label: "Open Requisitions", value: openPRCount.toString() },
    { label: "Open Purchase Orders", value: openPOCount.toString() },
  ];

  const poStatusColor: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    CONFIRMED: "bg-blue-100 text-blue-700",
    PARTIALLY_RECEIVED: "bg-yellow-100 text-yellow-700",
    RECEIVED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Materials Management</h1>
        <p className="mt-1 text-sm text-gray-500">Procurement and inventory overview</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-gray-500">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { href: "/mm/materials", label: "Materials" },
          { href: "/mm/vendors", label: "Vendors" },
          { href: "/mm/purchase-requisitions", label: "Requisitions" },
          { href: "/mm/purchase-orders", label: "Purchase Orders" },
          { href: "/mm/goods-receipts", label: "Goods Receipts" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentPOs.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No purchase orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{po.number}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(po.date)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{po.vendor.name}</td>
                      <td className="px-4 py-3">{formatCurrency(po.totalAmount.toString())}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${poStatusColor[po.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {po.status.replace(/_/g, " ")}
                        </span>
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
