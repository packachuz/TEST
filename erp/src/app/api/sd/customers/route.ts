import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;

  const customers = await prisma.customer.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(customers);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;
  const body = await req.json();
  const { code, name, email, phone, address, creditLimit } = body;

  if (!code || !name) {
    return Response.json({ error: "code and name are required" }, { status: 400 });
  }

  const existing = await prisma.customer.findUnique({
    where: { tenantId_code: { tenantId, code } },
  });
  if (existing) return Response.json({ error: "Customer code already exists" }, { status: 409 });

  const customer = await prisma.customer.create({
    data: {
      tenantId,
      code,
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      creditLimit: creditLimit ?? 0,
    },
  });

  return Response.json(customer, { status: 201 });
}
