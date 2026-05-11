import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;

  const payrollRuns = await prisma.payrollRun.findMany({
    where: { tenantId },
    include: {
      payrollItems: {
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(payrollRuns);
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
  const { period } = body;

  if (!period) {
    return Response.json({ error: "Period is required (e.g. 2025-01)" }, { status: 400 });
  }

  const existing = await prisma.payrollRun.findUnique({
    where: { tenantId_period: { tenantId, period } },
  });
  if (existing) {
    return Response.json({ error: "Payroll run for this period already exists" }, { status: 409 });
  }

  const payrollRun = await prisma.payrollRun.create({
    data: { tenantId, period, status: "DRAFT" },
  });

  return Response.json(payrollRun, { status: 201 });
}
