import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = (session.user as any).tenantId as string;

    const materials = await prisma.material.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(materials);
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
    const { code, name, description, type, unit, standardPrice } = body;

    if (!code || !name || !type || !unit || standardPrice === undefined) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.material.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (existing) return Response.json({ error: "Material code already exists" }, { status: 409 });

    const material = await prisma.material.create({
      data: { tenantId, code, name, description: description || null, type, unit, standardPrice },
    });

    return Response.json(material, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    console.error("[mm-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
