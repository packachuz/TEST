import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;

  const employees = await prisma.employee.findMany({
    where: { tenantId },
    include: { department: true },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(employees);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string;

  const body = await req.json();
  const {
    firstName,
    lastName,
    email,
    phone,
    jobTitle,
    departmentId,
    employmentType,
    startDate,
    baseSalary,
  } = body;

  if (!firstName || !lastName || !email || !startDate || !baseSalary) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Generate employee code
  const count = await prisma.employee.count({ where: { tenantId } });
  const employeeCode = `EMP${String(count + 1).padStart(4, "0")}`;

  const employee = await prisma.employee.create({
    data: {
      tenantId,
      employeeCode,
      firstName,
      lastName,
      email,
      phone: phone || null,
      jobTitle: jobTitle || null,
      departmentId: departmentId || null,
      employmentType: employmentType || "FULL_TIME",
      startDate: new Date(startDate),
      baseSalary,
    },
    include: { department: true },
  });

  return Response.json(employee, { status: 201 });
}
