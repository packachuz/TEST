import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/sd/deliveries/[id]/ship">) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role as string;
    if (!["ADMIN", "MANAGER"].includes(role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = (session.user as any).tenantId as string;
    const { id } = await ctx.params;

    const delivery = await prisma.delivery.findFirst({
      where: { id, tenantId },
      include: { items: { include: { material: true } }, so: { include: { items: true } } },
    });

    if (!delivery) return Response.json({ error: "Not found" }, { status: 404 });

    if (!["DRAFT", "PICKED"].includes(delivery.status)) {
      return Response.json(
        { error: `Cannot ship delivery with status ${delivery.status}` },
        { status: 400 }
      );
    }

    const totalCOGS = delivery.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.material.standardPrice),
      0
    );

    const [cogsAccount, inventoryAccount] = await Promise.all([
      prisma.gLAccount.findFirst({ where: { tenantId, code: "5000", isActive: true } }),
      prisma.gLAccount.findFirst({ where: { tenantId, code: "1300", isActive: true } }),
    ]);

    const deliveredItemIds = new Set(delivery.items.map((i) => i.soItemId));
    const allSOItems = delivery.so.items;
    const allDelivered = allSOItems.every((soItem) => deliveredItemIds.has(soItem.id));
    const newSOStatus = allDelivered ? "DELIVERED" : "PARTIALLY_DELIVERED";

    const dateObj = new Date();
    const yyyymmdd = dateObj.toISOString().slice(0, 10).replace(/-/g, "");

    const result = await prisma.$transaction(async (tx) => {
      // Aggregate required qty per material across delivery items
      const required = new Map<string, number>();
      for (const it of delivery.items) {
        required.set(it.materialId, (required.get(it.materialId) ?? 0) + Number(it.quantity));
      }
      // Fetch current stock for all those materials
      const materials = await tx.material.findMany({
        where: { id: { in: [...required.keys()] }, tenantId },
      });
      for (const m of materials) {
        const need = required.get(m.id) ?? 0;
        if (Number(m.stockQty) < need) {
          throw new Error(`CLIENT_ERROR:Insufficient stock for material ${m.code}`);
        }
      }
      // Then decrement
      await Promise.all(
        delivery.items.map((it) =>
          tx.material.update({
            where: { id: it.materialId },
            data: { stockQty: { decrement: it.quantity } },
          })
        )
      );

      let journalEntryId: string | null = null;

      if (cogsAccount && inventoryAccount && totalCOGS > 0) {
        const count = await tx.journalEntry.count({ where: { tenantId } });
        const jeNumber = `JE-${yyyymmdd}-${String(count + 1).padStart(4, "0")}`;

        const je = await tx.journalEntry.create({
          data: {
            tenantId,
            number: jeNumber,
            date: dateObj,
            description: `Goods Issue for Delivery ${delivery.number}`,
            status: "POSTED",
            source: "GOODS_ISSUE",
            sourceId: delivery.id,
            lines: {
              create: [
                { glAccountId: cogsAccount.id, debit: totalCOGS, credit: 0 },
                { glAccountId: inventoryAccount.id, debit: 0, credit: totalCOGS },
              ],
            },
          },
        });
        journalEntryId = je.id;
      }

      const updatedDelivery = await tx.delivery.update({
        where: { id },
        data: {
          status: "SHIPPED",
          ...(journalEntryId && { journalEntryId }),
        },
        include: {
          so: { include: { customer: true } },
          items: { include: { material: true } },
        },
      });

      await tx.salesOrder.update({
        where: { id: delivery.soId },
        data: { status: newSOStatus },
      });

      return updatedDelivery;
    });

    return Response.json(result);
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
