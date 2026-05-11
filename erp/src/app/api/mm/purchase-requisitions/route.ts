import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generatePRNumber(date: Date, count: number) {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `PR-${d}-${String(count + 1).padStart(4, "0")}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;

  const prs = await prisma.purchaseRequisition.findMany({
    where: { tenantId },
    include: {
      items: { include: { material: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(prs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const body = await req.json();
  const { requestedBy, date, notes, items } = body;

  if (!requestedBy || !date || !items || items.length === 0) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
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
}
