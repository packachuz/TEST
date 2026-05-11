import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.user.tenantId;

    const accounts = await prisma.gLAccount.findMany({
      where: { tenantId },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    });

    return Response.json(accounts);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    console.error("[fi-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.user.tenantId;

    const body = await req.json();
    const { code, name, type, description } = body;

    if (!code || !name || !type) {
      return Response.json({ error: "code, name, and type are required" }, { status: 400 });
    }

    const validTypes = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
    if (!validTypes.includes(type)) {
      return Response.json({ error: "Invalid account type" }, { status: 400 });
    }

    const existing = await prisma.gLAccount.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (existing) {
      return Response.json({ error: "Account code already exists" }, { status: 409 });
    }

    const account = await prisma.gLAccount.create({
      data: { tenantId, code, name, type, description: description ?? null },
    });

    return Response.json(account, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Document number conflict, please retry" }, { status: 409 });
    }
    console.error("[fi-route]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
