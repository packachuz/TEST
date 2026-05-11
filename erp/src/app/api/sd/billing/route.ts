import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = (session.user as any).tenantId as string;

    const invoices = await prisma.customerInvoice.findMany({
      where: { tenantId },
      include: {
        customer: true,
        so: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(invoices);
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

    const role = (session.user as any).role as string;
    if (!["ADMIN", "MANAGER"].includes(role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = (session.user as any).tenantId as string;
    const body = await req.json();
    const { soId, deliveryId, date, dueDate, amount, notes } = body;

    if (!soId || !date || !dueDate || amount === undefined) {
      return Response.json({ error: "soId, date, dueDate, and amount are required" }, { status: 400 });
    }

    const so = await prisma.salesOrder.findFirst({ where: { id: soId, tenantId } });
    if (!so) return Response.json({ error: "Sales order not found" }, { status: 404 });

    if (deliveryId) {
      const delivery = await prisma.delivery.findFirst({
        where: { id: deliveryId, tenantId, soId },
      });
      if (!delivery) {
        return Response.json(
          { error: "Delivery not found for this sales order" },
          { status: 404 }
        );
      }
    }

    const dateObj = new Date(date);
    const yyyymmdd = dateObj.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await prisma.customerInvoice.count({ where: { tenantId } });
    const number = `INV-${yyyymmdd}-${String(count + 1).padStart(4, "0")}`;

    const invoice = await prisma.customerInvoice.create({
      data: {
        tenantId,
        number,
        customerId: so.customerId,
        soId,
        deliveryId: deliveryId || null,
        date: dateObj,
        dueDate: new Date(dueDate),
        amount: Number(amount),
        status: "DRAFT",
        notes: notes || null,
      },
      include: {
        customer: true,
        so: true,
      },
    });

    return Response.json(invoice, { status: 201 });
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
