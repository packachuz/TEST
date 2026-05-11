import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.user.tenantId;

    const deliveries = await prisma.delivery.findMany({
      where: { tenantId },
      include: {
        so: { include: { customer: true } },
        items: { include: { material: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(deliveries);
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
    const { soId, date, notes, items } = body;

    if (!soId || !date || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "soId, date, and items are required" }, { status: 400 });
    }

    const so = await prisma.salesOrder.findFirst({
      where: { id: soId, tenantId },
      include: { items: true },
    });
    if (!so) return Response.json({ error: "Sales order not found" }, { status: 404 });

    if (!["CONFIRMED", "PARTIALLY_DELIVERED"].includes(so.status)) {
      return Response.json(
        { error: "Sales order must be CONFIRMED or PARTIALLY_DELIVERED" },
        { status: 400 }
      );
    }

    // Validate soItemIds belong to this SO
    const soItemIds = Array.from(new Set(items.map((it: any) => it.soItemId)));
    if (soItemIds.some((sid) => !sid)) {
      return Response.json({ error: "Each item must have a soItemId" }, { status: 400 });
    }
    const validSoItemIds = new Set(so.items.map((i) => i.id));
    for (const sid of soItemIds) {
      if (!validSoItemIds.has(sid as string)) {
        return Response.json(
          { error: "One or more soItemIds do not belong to this sales order" },
          { status: 400 }
        );
      }
    }

    // Validate materialIds belong to tenant
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
