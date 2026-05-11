import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/sd/billing/[id]/post">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const { id } = await ctx.params;

  const invoice = await prisma.customerInvoice.findFirst({ where: { id, tenantId } });
  if (!invoice) return Response.json({ error: "Not found" }, { status: 404 });

  if (invoice.status !== "DRAFT") {
    return Response.json(
      { error: `Cannot post invoice with status ${invoice.status}` },
      { status: 400 }
    );
  }

  const [arAccount, revenueAccount] = await Promise.all([
    prisma.gLAccount.findFirst({ where: { tenantId, code: "1200" } }),
    prisma.gLAccount.findFirst({ where: { tenantId, code: "4000" } }),
  ]);

  const dateObj = new Date();
  const yyyymmdd = dateObj.toISOString().slice(0, 10).replace(/-/g, "");

  const result = await prisma.$transaction(async (tx) => {
    let journalEntryId: string | null = null;

    if (arAccount && revenueAccount) {
      const count = await tx.journalEntry.count({ where: { tenantId } });
      const jeNumber = `JE-${yyyymmdd}-${String(count + 1).padStart(4, "0")}`;

      const je = await tx.journalEntry.create({
        data: {
          tenantId,
          number: jeNumber,
          date: dateObj,
          description: `AR Posting for Invoice ${invoice.number}`,
          status: "POSTED",
          source: "AR",
          sourceId: invoice.id,
          lines: {
            create: [
              { glAccountId: arAccount.id, debit: Number(invoice.amount), credit: 0 },
              { glAccountId: revenueAccount.id, debit: 0, credit: Number(invoice.amount) },
            ],
          },
        },
      });
      journalEntryId = je.id;
    }

    const updatedInvoice = await tx.customerInvoice.update({
      where: { id },
      data: {
        status: "POSTED",
        ...(journalEntryId && { journalEntryId }),
      },
      include: { customer: true, so: true, delivery: true },
    });

    await tx.salesOrder.update({
      where: { id: invoice.soId },
      data: { status: "BILLED" },
    });

    return updatedInvoice;
  });

  return Response.json(result);
}
