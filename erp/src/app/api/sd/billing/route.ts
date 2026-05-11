import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;

  const invoices = await prisma.customerInvoice.findMany({
    where: { tenantId },
    include: {
      customer: true,
      so: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(invoices);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const body = await req.json();
  const { soId, deliveryId, date, dueDate, amount, notes } = body;

  if (!soId || !date || !dueDate || amount === undefined) {
    return Response.json({ error: "soId, date, dueDate, and amount are required" }, { status: 400 });
  }

  const so = await prisma.salesOrder.findFirst({ where: { id: soId, tenantId } });
  if (!so) return Response.json({ error: "Sales order not found" }, { status: 404 });

  const dateObj = new Date(date);
  const yyyymmdd = dateObj.toISOString().slice(0, 10).replace(/-/g, "");
  const count = await prisma.customerInvoice.count({ where: { tenantId } });
  const number = `INV-${yyyymmdd}-${String(count + 1).padStart(4, "0")}`;

  const invoice = await prisma.customerInvoice.create({
    data: {
      tenantId,
      number,
      customerId: so.customerId,
      soId,
      deliveryId: deliveryId || null,
      date: dateObj,
      dueDate: new Date(dueDate),
      amount: Number(amount),
      status: "DRAFT",
      notes: notes || null,
    },
    include: {
      customer: true,
      so: true,
    },
  });

  return Response.json(invoice, { status: 201 });
}
