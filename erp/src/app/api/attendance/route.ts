import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const whereDate = date ? new Date(date) : undefined;

  const records = await prisma.attendance.findMany({
    where: {
      employee: { tenantId },
      ...(whereDate && { date: whereDate }),
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return Response.json(records);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;

  const body = await req.json();
  const { employeeId, date, status, checkIn, checkOut, notes } = body;

  if (!employeeId || !date || !status) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify employee belongs to tenant
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, tenantId } });
  if (!employee) return Response.json({ error: "Employee not found" }, { status: 404 });

  const record = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date: new Date(date) } },
    update: {
      status,
      ...(checkIn !== undefined && { checkIn: checkIn ? new Date(checkIn) : null }),
      ...(checkOut !== undefined && { checkOut: checkOut ? new Date(checkOut) : null }),
      ...(notes !== undefined && { notes }),
    },
    create: {
      employeeId,
      date: new Date(date),
      status,
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      notes: notes || null,
    },
    include: { employee: true },
  });

  return Response.json(record, { status: 201 });
}
