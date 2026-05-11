import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/leaves/[id]">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "ADMIN" && role !== "HR") {
    return Response.json({ error: "Forbidden: only HR or ADMIN can update leave status" }, { status: 403 });
  }

  const tenantId = (session.user as any).tenantId as string;
  const { id } = await ctx.params;

  const body = await req.json();
  const { status } = body;

  if (!["APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  // Verify leave request belongs to tenant
  const existing = await prisma.leaveRequest.findFirst({
    where: { id, employee: { tenantId } },
  });
  if (!existing) return Response.json({ error: "Leave request not found" }, { status: 404 });

  const leave = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status,
      reviewedAt: new Date(),
    },
    include: {
      employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      leaveType: { select: { name: true, isPaid: true } },
    },
  });

  return Response.json(leave);
}
