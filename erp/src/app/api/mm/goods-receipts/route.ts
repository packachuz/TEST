import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateGRNumber(date: Date, count: number) {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `GR-${d}-${String(count + 1).padStart(4, "0")}`;
}

export async function GET() {
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
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const body = await req.json();
  const { poId, date, notes, items } = body;

  if (!poId || !date || !items || items.length === 0) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
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
}
