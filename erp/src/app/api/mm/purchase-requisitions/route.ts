import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generatePRNumber(date: Date, count: number) {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `PR-${d}-${String(count + 1).padStart(4, "0")}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.user.tenantId;

    const prs = await prisma.purchaseRequisition.findMany({
      where: { tenantId },
      include: {
        items: { include: { material: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(prs);
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

    const role = session.user.role;
    if (!["ADMIN", "MANAGER"].includes(role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = session.user.tenantId;
    const body = await req.json();
    const { requestedBy, date, notes, items } = body;

    if (!requestedBy || !date || !items || items.length === 0) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
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

    const prDate = new Date(date);
    const count = await prisma.purchaseRequisition.count({ where: { tenantId } });
    const number = generatePRNumber(prDate, count);

    const pr = await prisma.purchaseRequisition.create({
      data: {
        tenantId,
        number,
        requestedBy,
        date: prDate,
        notes: notes || null,
        status: "DRAFT",
        items: {
          create: items.map((item: { materialId: string; quantity: number; estimatedPrice: number }) => ({
            materialId: item.materialId,
            quantity: item.quantity,
            estimatedPrice: item.estimatedPrice,
          })),
        },
      },
      include: { items: { include: { material: true } } },
    });

    return Response.json(pr, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    console.error("[mm-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
