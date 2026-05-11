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

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Atomically claim PROCESSING from DRAFT
      const claim = await tx.payrollRun.updateMany({
        where: { id, tenantId, status: "DRAFT" },
        data: { status: "PROCESSING" },
      });
      if (claim.count === 0) {
        throw new Error("CLIENT_ERROR:Payroll run not found or not in DRAFT status");
      }

      const payrollRun = await tx.payrollRun.findFirst({ where: { id, tenantId } });
      if (!payrollRun) {
        throw new Error("CLIENT_ERROR:Payroll run not found");
      }

      // 2. Fetch active employees and sequentially upsert payroll items
      const employees = await tx.employee.findMany({
        where: { tenantId, status: "ACTIVE" },
      });

      const items = [] as Awaited<ReturnType<typeof tx.payrollItem.upsert>>[];
      for (const emp of employees) {
        const baseSalary = Number(emp.baseSalary);
        const allowances = 0;
        const deductions = 0;
        const tax = parseFloat((baseSalary * 0.15).toFixed(2));
        const netSalary = parseFloat((baseSalary * 0.85).toFixed(2));

        const item = await tx.payrollItem.upsert({
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
        items.push(item);
      }

      // 3. Mark COMPLETED
      const completed = await tx.payrollRun.update({
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

      // 4. Post balanced journal entry
      const totalNet = items.reduce((sum, item) => sum + Number(item.netSalary), 0);
      const totalGross = items.reduce((sum, item) => sum + Number(item.baseSalary), 0);
      const totalTax = items.reduce((sum, item) => sum + Number(item.tax), 0);

      if (totalGross > 0) {
        const expenseAccount = await tx.gLAccount.findFirst({
          where: { tenantId, code: "6000", isActive: true },
        });
        const salaryPayable = await tx.gLAccount.findFirst({
          where: { tenantId, code: "2200", isActive: true },
        });
        const taxPayable = await tx.gLAccount.findFirst({
          where: { tenantId, code: "2300", isActive: true },
        });

        if (!expenseAccount || !salaryPayable || !taxPayable) {
          throw new Error(
            "CLIENT_ERROR:Required GL accounts (6000, 2200, 2300) missing — cannot post balanced journal entry"
          );
        }

        const count = await tx.journalEntry.count({ where: { tenantId } });
        const jeNumber = `JE-PAY-${payrollRun.period.replace(/[^0-9]/g, "")}-${String(count + 1).padStart(4, "0")}`;
        await tx.journalEntry.create({
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
                { glAccountId: salaryPayable.id, debit: 0, credit: totalNet, description: "Net salary payable" },
                { glAccountId: taxPayable.id, debit: 0, credit: totalTax, description: "Tax payable" },
              ],
            },
          },
        });
      }

      return completed;
    });

    return Response.json(result);
  } catch (err) {
    console.error("[payroll-process]", err);
    // Revert to DRAFT for prototype simplicity (only if we claimed it)
    await prisma.payrollRun
      .updateMany({
        where: { id, tenantId, status: "PROCESSING" },
        data: { status: "DRAFT" },
      })
      .catch(() => {});

    if (err instanceof Error && err.message.startsWith("CLIENT_ERROR:")) {
      const msg = err.message.slice(13);
      const status = msg.includes("not found") ? 409 : 400;
      return Response.json({ error: msg }, { status });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
