import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;

  const departments = await prisma.department.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });

  return Response.json(departments);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "ADMIN" && role !== "HR") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = (session.user as any).tenantId as string;

  const body = await req.json();
  const { name } = body;

  if (!name) {
    return Response.json({ error: "Department name is required" }, { status: 400 });
  }

  const existing = await prisma.department.findUnique({
    where: { tenantId_name: { tenantId, name } },
  });
  if (existing) {
    return Response.json({ error: "Department already exists" }, { status: 409 });
  }

  const department = await prisma.department.create({
    data: { tenantId, name },
  });

  return Response.json(department, { status: 201 });
}
