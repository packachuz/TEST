import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateGRNumber(date: Date, count: number) {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `GR-${d}-${String(count + 1).padStart(4, "0")}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = (session.user as any).tenantId as string;

    const grs = await prisma.goodsReceipt.findMany({
      where: { tenantId },
      include: {
        po: { include: { vendor: true } },
        items: { include: { material: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(grs);
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
    const { poId, date, notes, items } = body;

    if (!poId || !date || !items || items.length === 0) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const po = await prisma.purchaseOrder.findFirst({
      where: { id: poId, tenantId },
      include: { items: { select: { id: true } } },
    });
    if (!po) return Response.json({ error: "Purchase order not found" }, { status: 404 });

    const validPoItemIds = new Set(po.items.map((it) => it.id));
    const poItemIds: string[] = items.map((it: { poItemId: string }) => it.poItemId);
    for (const piid of poItemIds) {
      if (!validPoItemIds.has(piid)) {
        return Response.json({ error: "Invalid PO item reference" }, { status: 404 });
      }
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

    const grDate = new Date(date);
    const count = await prisma.goodsReceipt.count({ where: { tenantId } });
    const number = generateGRNumber(grDate, count);

    const gr = await prisma.goodsReceipt.create({
      data: {
        tenantId,
        number,
        poId,
        date: grDate,
        notes: notes || null,
        status: "DRAFT",
        items: {
          create: items.map((item: { poItemId: string; materialId: string; quantityReceived: number }) => ({
            poItemId: item.poItemId,
            materialId: item.materialId,
            quantityReceived: item.quantityReceived,
          })),
        },
      },
      include: {
        po: { include: { vendor: true } },
        items: { include: { material: true } },
      },
    });

    return Response.json(gr, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    console.error("[mm-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
