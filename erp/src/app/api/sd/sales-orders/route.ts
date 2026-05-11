import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;

  const orders = await prisma.salesOrder.findMany({
    where: { tenantId },
    include: {
      customer: true,
      items: { include: { material: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const body = await req.json();
  const { customerId, date, notes, items } = body;

  if (!customerId || !date || !Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "customerId, date, and items are required" }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId } });
  if (!customer) return Response.json({ error: "Customer not found" }, { status: 404 });

  const totalAmount = items.reduce(
    (sum: number, item: any) => sum + Number(item.quantity) * Number(item.unitPrice),
    0
  );

  const dateObj = new Date(date);
  const yyyymmdd = dateObj.toISOString().slice(0, 10).replace(/-/g, "");
  const count = await prisma.salesOrder.count({ where: { tenantId } });
  const number = `SO-${yyyymmdd}-${String(count + 1).padStart(4, "0")}`;

  const order = await prisma.salesOrder.create({
    data: {
      tenantId,
      number,
      customerId,
      date: dateObj,
      status: "DRAFT",
      totalAmount,
      notes: notes || null,
      items: {
        create: items.map((item: any) => ({
          materialId: item.materialId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.quantity) * Number(item.unitPrice),
        })),
      },
    },
    include: {
      customer: true,
      items: { include: { material: true } },
    },
  });

  return Response.json(order, { status: 201 });
}
