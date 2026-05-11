import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/mm/goods-receipts/[id]/confirm">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const { id } = await ctx.params;

  const gr = await prisma.goodsReceipt.findFirst({
    where: { id, tenantId },
    include: {
      items: { include: { material: true } },
      po: { include: { items: true } },
    },
  });

  if (!gr) return Response.json({ error: "Not found" }, { status: 404 });
  if (gr.status !== "DRAFT") {
    return Response.json({ error: "Only DRAFT goods receipts can be confirmed" }, { status: 400 });
  }

  const totalValue = gr.items.reduce((sum, item) => {
    const price = Number(item.material.standardPrice);
    const qty = Number(item.quantityReceived);
    return sum + qty * price;
  }, 0);

  const [inventoryAccount, grirAccount] = await Promise.all([
    prisma.gLAccount.findUnique({ where: { tenantId_code: { tenantId, code: "1300" } } }),
    prisma.gLAccount.findUnique({ where: { tenantId_code: { tenantId, code: "2100" } } }),
  ]);

  const poItems = gr.po.items;
  const allReceived = poItems.every((poItem) => {
    const received = gr.items
      .filter((grItem) => grItem.poItemId === poItem.id)
      .reduce((sum, grItem) => sum + Number(grItem.quantityReceived), 0);
    return received >= Number(poItem.quantity);
  });
  const newPoStatus = allReceived ? "RECEIVED" : "PARTIALLY_RECEIVED";

  const result = await prisma.$transaction(async (tx) => {
    for (const item of gr.items) {
      await tx.material.update({
        where: { id: item.materialId },
        data: { stockQty: { increment: item.quantityReceived } },
      });
    }

    let journalEntryId: string | null = null;

    if (inventoryAccount && grirAccount && totalValue > 0) {
      const jeNumber = `JE-GR-${gr.number}`;
      const je = await tx.journalEntry.create({
        data: {
          tenantId,
          number: jeNumber,
          date: new Date(),
          description: `Goods Receipt: ${gr.number}`,
          status: "POSTED",
          source: "INVENTORY",
          sourceId: id,
          lines: {
            create: [
              {
                glAccountId: inventoryAccount.id,
                debit: totalValue,
                credit: 0,
                description: `Inventory - ${gr.number}`,
              },
              {
                glAccountId: grirAccount.id,
                debit: 0,
                credit: totalValue,
                description: `GR/IR Clearing - ${gr.number}`,
              },
            ],
          },
        },
      });
      journalEntryId = je.id;
    }

    const confirmedGR = await tx.goodsReceipt.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        journalEntryId,
      },
    });

    await tx.purchaseOrder.update({
      where: { id: gr.poId },
      data: { status: newPoStatus },
    });

    return confirmedGR;
  });

  return Response.json(result);
}
