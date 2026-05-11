import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.user.tenantId;

    const customers = await prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(customers);
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
