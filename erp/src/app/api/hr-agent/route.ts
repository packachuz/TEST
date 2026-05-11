import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Anthropic from "@anthropic-ai/sdk";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const HR_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_employees",
    description: "List all employees in the company. Can filter by department or status.",
    input_schema: {
      type: "object" as const,
      properties: {
        department: { type: "string", description: "Filter by department name (optional)" },
        status: { type: "string", enum: ["ACTIVE", "INACTIVE", "TERMINATED"], description: "Filter by status (optional)" },
      },
    },
  },
  {
    name: "get_employee",
    description: "Get detailed information about a specific employee by name or employee code.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Employee name (first or last) or employee code" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_leave_requests",
    description: "List leave requests. Can filter by status or employee name.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"], description: "Filter by status (optional)" },
        employee_name: { type: "string", description: "Filter by employee name (optional)" },
      },
    },
  },
  {
    name: "approve_leave",
    description: "Approve a pending leave request by its ID. Only HR or ADMIN can do this.",
    input_schema: {
      type: "object" as const,
      properties: {
        leave_id: { type: "string", description: "The leave request ID to approve" },
      },
      required: ["leave_id"],
    },
  },
  {
    name: "reject_leave",
    description: "Reject a pending leave request by its ID. Only HR or ADMIN can do this.",
    input_schema: {
      type: "object" as const,
      properties: {
        leave_id: { type: "string", description: "The leave request ID to reject" },
      },
      required: ["leave_id"],
    },
  },
  {
    name: "get_attendance_summary",
    description: "Get attendance summary for a date or employee.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format (optional, defaults to today)" },
        employee_name: { type: "string", description: "Filter by employee name (optional)" },
      },
    },
  },
  {
    name: "get_payroll_summary",
    description: "Get payroll run summary including total payroll cost and per-employee breakdown.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: { type: "string", description: "Payroll period in YYYY-MM format (optional, defaults to latest)" },
      },
    },
  },
];

async function executeTool(name: string, input: Record<string, string>, tenantId: string, userRole: string) {
  switch (name) {
    case "list_employees": {
      const employees = await prisma.employee.findMany({
        where: {
          tenantId,
          ...(input.status && { status: input.status as any }),
          ...(input.department && { department: { name: { contains: input.department, mode: "insensitive" } } }),
        },
        include: { department: true },
        orderBy: { firstName: "asc" },
      });
      return employees.map((e) => ({
        id: e.id,
        code: e.employeeCode,
        name: `${e.firstName} ${e.lastName}`,
        email: e.email,
        department: e.department?.name ?? "N/A",
        jobTitle: e.jobTitle,
        status: e.status,
        employmentType: e.employmentType,
        baseSalary: Number(e.baseSalary),
        startDate: e.startDate.toISOString().split("T")[0],
      }));
    }

    case "get_employee": {
      const q = input.query.toLowerCase();
      const employee = await prisma.employee.findFirst({
        where: {
          tenantId,
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { employeeCode: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        include: { department: true },
      });
      if (!employee) return { error: `No employee found matching "${input.query}"` };
      return {
        id: employee.id,
        code: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        phone: employee.phone,
        department: employee.department?.name ?? "N/A",
        jobTitle: employee.jobTitle,
        status: employee.status,
        employmentType: employee.employmentType,
        baseSalary: Number(employee.baseSalary),
        startDate: employee.startDate.toISOString().split("T")[0],
      };
    }

    case "list_leave_requests": {
      const leaves = await prisma.leaveRequest.findMany({
        where: {
          employee: { tenantId },
          ...(input.status && { status: input.status as any }),
          ...(input.employee_name && {
            employee: {
              tenantId,
              OR: [
                { firstName: { contains: input.employee_name, mode: "insensitive" } },
                { lastName: { contains: input.employee_name, mode: "insensitive" } },
              ],
            },
          }),
        },
        include: { employee: true, leaveType: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return leaves.map((l) => ({
        id: l.id,
        employee: `${l.employee.firstName} ${l.employee.lastName}`,
        leaveType: l.leaveType.name,
        startDate: l.startDate.toISOString().split("T")[0],
        endDate: l.endDate.toISOString().split("T")[0],
        days: l.days,
        reason: l.reason,
        status: l.status,
      }));
    }

    case "approve_leave": {
      if (!["HR", "ADMIN"].includes(userRole)) return { error: "Only HR or ADMIN can approve leave requests." };
      const updated = await prisma.leaveRequest.update({
        where: { id: input.leave_id },
        data: { status: "APPROVED", reviewedAt: new Date() },
        include: { employee: true },
      });
      return { success: true, message: `Leave approved for ${updated.employee.firstName} ${updated.employee.lastName}` };
    }

    case "reject_leave": {
      if (!["HR", "ADMIN"].includes(userRole)) return { error: "Only HR or ADMIN can reject leave requests." };
      const updated = await prisma.leaveRequest.update({
        where: { id: input.leave_id },
        data: { status: "REJECTED", reviewedAt: new Date() },
        include: { employee: true },
      });
      return { success: true, message: `Leave rejected for ${updated.employee.firstName} ${updated.employee.lastName}` };
    }

    case "get_attendance_summary": {
      const date = input.date ? new Date(input.date) : new Date();
      date.setHours(0, 0, 0, 0);
      const records = await prisma.attendance.findMany({
        where: {
          date,
          employee: {
            tenantId,
            ...(input.employee_name && {
              OR: [
                { firstName: { contains: input.employee_name, mode: "insensitive" } },
                { lastName: { contains: input.employee_name, mode: "insensitive" } },
              ],
            }),
          },
        },
        include: { employee: true },
      });
      const summary = records.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      return {
        date: date.toISOString().split("T")[0],
        total: records.length,
        summary,
        records: records.map((r) => ({
          employee: `${r.employee.firstName} ${r.employee.lastName}`,
          status: r.status,
          checkIn: r.checkIn?.toTimeString().slice(0, 5) ?? null,
          checkOut: r.checkOut?.toTimeString().slice(0, 5) ?? null,
        })),
      };
    }

    case "get_payroll_summary": {
      const run = await prisma.payrollRun.findFirst({
        where: {
          tenantId,
          ...(input.period && { period: input.period }),
        },
        orderBy: { createdAt: "desc" },
        include: { payrollItems: { include: { employee: true } } },
      });
      if (!run) return { error: "No payroll run found." };
      const total = run.payrollItems.reduce((s, i) => s + Number(i.netSalary), 0);
      return {
        period: run.period,
        status: run.status,
        totalNetPayroll: total,
        employeeCount: run.payrollItems.length,
        breakdown: run.payrollItems.map((i) => ({
          employee: `${i.employee.firstName} ${i.employee.lastName}`,
          baseSalary: Number(i.baseSalary),
          tax: Number(i.tax),
          netSalary: Number(i.netSalary),
        })),
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages } = await req.json();
  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;

  const systemPrompt = `You are an intelligent HR assistant for the company's HR & Payroll ERP system.
You have access to real employee data, leave requests, attendance records, and payroll information.
The user's role is: ${userRole}. Only HR and ADMIN roles can approve/reject leave requests.
Be concise, helpful, and professional. Format data clearly using lists or tables when appropriate.
Always use tools to fetch live data rather than making assumptions.`;

  // Agentic loop with tool use
  let currentMessages: Anthropic.MessageParam[] = messages;

  for (let i = 0; i < 5; i++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      tools: HR_TOOLS,
      messages: currentMessages,
    });

    if (response.stop_reason === "end_turn") {
      const text = response.content.find((b) => b.type === "text")?.text ?? "";
      return NextResponse.json({ reply: text });
    }

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of toolUseBlocks) {
        if (block.type !== "tool_use") continue;
        const result = await executeTool(block.name, block.input as Record<string, string>, tenantId, userRole);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
      }

      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];
      continue;
    }

    break;
  }

  return NextResponse.json({ reply: "I wasn't able to complete that request. Please try again." });
}
