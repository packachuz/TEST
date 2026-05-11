import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generatePONumber(date: Date, count: number) {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `PO-${d}-${String(count + 1).padStart(4, "0")}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;

  const pos = await prisma.purchaseOrder.findMany({
    where: { tenantId },
    include: {
      vendor: true,
      items: { include: { material: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(pos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const body = await req.json();
  const { vendorId, prId, date, notes, items } = body;

  if (!vendorId || !date || !items || items.length === 0) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const poDate = new Date(date);
  const count = await prisma.purchaseOrder.count({ where: { tenantId } });
  const number = generatePONumber(poDate, count);

  const totalAmount = items.reduce(
    (sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + item.quantity * item.unitPrice,
    0
  );

  const po = await prisma.purchaseOrder.create({
    data: {
      tenantId,
      number,
      vendorId,
      prId: prId || null,
      date: poDate,
      notes: notes || null,
      status: "DRAFT",
      totalAmount,
      items: {
        create: items.map((item: { materialId: string; quantity: number; unitPrice: number }) => ({
          materialId: item.materialId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        })),
      },
    },
    include: { vendor: true, items: { include: { material: true } } },
  });

  return Response.json(po, { status: 201 });
}
