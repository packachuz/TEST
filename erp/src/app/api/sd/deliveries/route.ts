import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;

  const deliveries = await prisma.delivery.findMany({
    where: { tenantId },
    include: {
      so: { include: { customer: true } },
      items: { include: { material: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(deliveries);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const body = await req.json();
  const { soId, date, notes, items } = body;

  if (!soId || !date || !Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "soId, date, and items are required" }, { status: 400 });
  }

  const so = await prisma.salesOrder.findFirst({ where: { id: soId, tenantId } });
  if (!so) return Response.json({ error: "Sales order not found" }, { status: 404 });

  if (!["CONFIRMED", "PARTIALLY_DELIVERED"].includes(so.status)) {
    return Response.json(
      { error: "Sales order must be CONFIRMED or PARTIALLY_DELIVERED" },
      { status: 400 }
    );
  }

  const dateObj = new Date(date);
  const yyyymmdd = dateObj.toISOString().slice(0, 10).replace(/-/g, "");
  const count = await prisma.delivery.count({ where: { tenantId } });
  const number = `DLV-${yyyymmdd}-${String(count + 1).padStart(4, "0")}`;

  const delivery = await prisma.delivery.create({
    data: {
      tenantId,
      number,
      soId,
      date: dateObj,
      status: "DRAFT",
      notes: notes || null,
      items: {
        create: items.map((item: any) => ({
          soItemId: item.soItemId,
          materialId: item.materialId,
          quantity: Number(item.quantity),
        })),
      },
    },
    include: {
      so: { include: { customer: true } },
      items: { include: { material: true } },
    },
  });

  return Response.json(delivery, { status: 201 });
}
