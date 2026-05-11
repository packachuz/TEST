import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.user.tenantId;

    const orders = await prisma.salesOrder.findMany({
      where: { tenantId },
      include: {
        customer: true,
        items: { include: { material: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(orders);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    if (err instanceof Error && err.message.startsWith("CLIENT_ERROR:")) {
      return Response.json({ error: err.message.slice(13) }, { status: 400 });
    }
    console.error("[sd-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const role = session.user.role;
    if (!["ADMIN", "MANAGER"].includes(role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = session.user.tenantId;
    const body = await req.json();
    const { customerId, date, notes, items } = body;

    if (!customerId || !date || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "customerId, date, and items are required" }, { status: 400 });
    }

    const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!customer) return Response.json({ error: "Customer not found" }, { status: 404 });

    const materialIds = Array.from(new Set(items.map((it: any) => it.materialId)));
    if (materialIds.some((mid) => !mid)) {
      return Response.json({ error: "Each item must have a materialId" }, { status: 400 });
    }
    const materials = await prisma.material.findMany({
      where: { id: { in: materialIds as string[] }, tenantId },
    });
    if (materials.length !== materialIds.length) {
      return Response.json({ error: "One or more materials not found" }, { status: 404 });
    }

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
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    if (err instanceof Error && err.message.startsWith("CLIENT_ERROR:")) {
      return Response.json({ error: err.message.slice(13) }, { status: 400 });
    }
    console.error("[sd-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
