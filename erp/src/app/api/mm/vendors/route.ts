import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = (session.user as any).tenantId as string;

    const vendors = await prisma.vendor.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(vendors);
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

    const role = (session.user as any).role as string;
    if (!["ADMIN", "MANAGER"].includes(role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = (session.user as any).tenantId as string;
    const body = await req.json();
    const { code, name, email, phone, address, paymentTerms } = body;

    if (!code || !name) {
      return Response.json({ error: "code and name are required" }, { status: 400 });
    }

    const existing = await prisma.vendor.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (existing) return Response.json({ error: "Vendor code already exists" }, { status: 409 });

    const vendor = await prisma.vendor.create({
      data: {
        tenantId,
        code,
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        paymentTerms: paymentTerms || null,
      },
    });

    return Response.json(vendor, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    console.error("[mm-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
