import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getEmployee(id: string, tenantId: string) {
  return prisma.employee.findFirst({
    where: { id, tenantId },
    include: { department: true },
  });
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/employees/[id]">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { id } = await ctx.params;

  const employee = await getEmployee(id, tenantId);
  if (!employee) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(employee);
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/employees/[id]">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { id } = await ctx.params;

  const existing = await getEmployee(id, tenantId);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const {
    firstName,
    lastName,
    email,
    phone,
    jobTitle,
    departmentId,
    employmentType,
    status,
    startDate,
    endDate,
    baseSalary,
  } = body;

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(jobTitle !== undefined && { jobTitle }),
      ...(departmentId !== undefined && { departmentId }),
      ...(employmentType !== undefined && { employmentType }),
      ...(status !== undefined && { status }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(baseSalary !== undefined && { baseSalary }),
    },
    include: { department: true },
  });

  return Response.json(employee);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/employees/[id]">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { id } = await ctx.params;

  const existing = await getEmployee(id, tenantId);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const employee = await prisma.employee.update({
    where: { id },
    data: { status: "TERMINATED", endDate: new Date() },
  });

  return Response.json(employee);
}
