import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/sd/deliveries/[id]/ship">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

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
    prisma.gLAccount.findFirst({ where: { tenantId, code: "5000" } }),
    prisma.gLAccount.findFirst({ where: { tenantId, code: "1300" } }),
  ]);

  const deliveredItemIds = new Set(delivery.items.map((i) => i.soItemId));
  const allSOItems = delivery.so.items;
  const allDelivered = allSOItems.every((soItem) => deliveredItemIds.has(soItem.id));
  const newSOStatus = allDelivered ? "DELIVERED" : "PARTIALLY_DELIVERED";

  const dateObj = new Date();
  const yyyymmdd = dateObj.toISOString().slice(0, 10).replace(/-/g, "");

  const result = await prisma.$transaction(async (tx) => {
    for (const item of delivery.items) {
      await tx.material.update({
        where: { id: item.materialId },
        data: { stockQty: { decrement: Number(item.quantity) } },
      });
    }

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
}
