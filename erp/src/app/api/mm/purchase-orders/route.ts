import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generatePONumber(date: Date, count: number) {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `PO-${d}-${String(count + 1).padStart(4, "0")}`;
}

export async function GET() {
  try {
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
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    console.error("[mm-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role as string;
    if (!["ADMIN", "MANAGER"].includes(role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = (session.user as any).tenantId as string;
    const body = await req.json();
    const { vendorId, prId, date, notes, items } = body;

    if (!vendorId || !date || !items || items.length === 0) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, tenantId } });
    if (!vendor) return Response.json({ error: "Vendor not found" }, { status: 404 });

    if (prId) {
      const pr = await prisma.purchaseRequisition.findFirst({ where: { id: prId, tenantId } });
      if (!pr) return Response.json({ error: "Purchase requisition not found" }, { status: 404 });
    }

    const materialIds: string[] = Array.from(
      new Set(items.map((it: { materialId: string }) => it.materialId))
    );
    const materials = await prisma.material.findMany({
      where: { id: { in: materialIds }, tenantId },
      select: { id: true },
    });
    if (materials.length !== materialIds.length) {
      return Response.json({ error: "One or more materials not found" }, { status: 404 });
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
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    console.error("[mm-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
