import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/payroll/[id]/process">) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "ADMIN" && role !== "HR") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = (session.user as any).tenantId as string;
  const { id } = await ctx.params;

  const payrollRun = await prisma.payrollRun.findFirst({
    where: { id, tenantId },
  });
  if (!payrollRun) return Response.json({ error: "Payroll run not found" }, { status: 404 });
  if (payrollRun.status === "COMPLETED") {
    return Response.json({ error: "Payroll run already completed" }, { status: 409 });
  }

  // Update status to PROCESSING
  await prisma.payrollRun.update({ where: { id }, data: { status: "PROCESSING" } });

  // Fetch all active employees for tenant
  const employees = await prisma.employee.findMany({
    where: { tenantId, status: "ACTIVE" },
  });

  // Compute payroll items
  const payrollItems = await Promise.all(
    employees.map(async (emp) => {
      const baseSalary = Number(emp.baseSalary);
      const allowances = 0;
      const deductions = 0;
      const tax = parseFloat((baseSalary * 0.15).toFixed(2));
      const netSalary = parseFloat((baseSalary * 0.85).toFixed(2));

      return prisma.payrollItem.upsert({
        where: { payrollRunId_employeeId: { payrollRunId: id, employeeId: emp.id } },
        update: { baseSalary, allowances, deductions, tax, netSalary },
        create: {
          payrollRunId: id,
          employeeId: emp.id,
          baseSalary,
          allowances,
          deductions,
          tax,
          netSalary,
        },
      });
    })
  );

  // Mark as COMPLETED
  const completed = await prisma.payrollRun.update({
    where: { id },
    data: { status: "COMPLETED", runAt: new Date() },
    include: {
      payrollItems: {
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        },
      },
    },
  });

  // FI integration: post payroll expense to Universal Journal
  const totalNet = payrollItems.reduce((sum, item) => sum + Number(item.netSalary), 0);
  const totalGross = payrollItems.reduce((sum, item) => sum + Number(item.baseSalary), 0);
  if (totalGross > 0) {
    const [expenseAccount, liabilityAccount] = await Promise.all([
      prisma.gLAccount.findFirst({ where: { tenantId, code: "6000", isActive: true } }),
      prisma.gLAccount.findFirst({ where: { tenantId, code: "2200", isActive: true } }),
    ]);
    if (expenseAccount && liabilityAccount) {
      const count = await prisma.journalEntry.count({ where: { tenantId } });
      const jeNumber = `JE-PAY-${payrollRun.period.replace(/[^0-9]/g, "")}-${String(count + 1).padStart(4, "0")}`;
      await prisma.journalEntry.create({
        data: {
          tenantId,
          number: jeNumber,
          date: new Date(),
          description: `Payroll posting: ${payrollRun.period}`,
          status: "POSTED",
          source: "PAYROLL",
          sourceId: id,
          lines: {
            create: [
              { glAccountId: expenseAccount.id, debit: totalGross, credit: 0, description: "Payroll expense" },
              { glAccountId: liabilityAccount.id, debit: 0, credit: totalNet, description: "Net salary payable" },
            ],
          },
        },
      });
    }
  }

  return Response.json(completed);
}
