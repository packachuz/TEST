import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;

  const leaves = await prisma.leaveRequest.findMany({
    where: { employee: { tenantId } },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
        },
      },
      leaveType: { select: { id: true, name: true, isPaid: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(leaves);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;

  const body = await req.json();
  const { employeeId, leaveTypeId, startDate, endDate, days, reason } = body;

  if (!employeeId || !leaveTypeId || !startDate || !endDate || !days) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify employee belongs to tenant
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, tenantId } });
  if (!employee) return Response.json({ error: "Employee not found" }, { status: 404 });

  // Verify leave type belongs to tenant
  const leaveType = await prisma.leaveType.findFirst({ where: { id: leaveTypeId, tenantId } });
  if (!leaveType) return Response.json({ error: "Leave type not found" }, { status: 404 });

  const leave = await prisma.leaveRequest.create({
    data: {
      employeeId,
      leaveTypeId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      days: Number(days),
      reason: reason || null,
    },
    include: {
      employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      leaveType: { select: { name: true, isPaid: true } },
    },
  });

  return Response.json(leave, { status: 201 });
}
