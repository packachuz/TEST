import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("Seeding database...");

  // ── Tenant ──────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Demo Company", slug: "demo" },
  });
  console.log("Tenant:", tenant.slug);

  // ── Admin User ───────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("demo1234", 10);
  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@demo.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Admin User",
      email: "admin@demo.com",
      hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("Admin user:", adminUser.email);

  // HR User
  const hrUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "hr@demo.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "HR Manager",
      email: "hr@demo.com",
      hashedPassword: await bcrypt.hash("demo1234", 10),
      role: "HR",
    },
  });
  console.log("HR user:", hrUser.email);

  // ── Departments ──────────────────────────────────────────────────────────────
  const deptNames = ["Engineering", "Human Resources", "Finance"];
  const departments = await Promise.all(
    deptNames.map((name: string) =>
      prisma.department.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name } },
        update: {},
        create: { tenantId: tenant.id, name },
      })
    )
  );
  console.log("Departments created:", departments.map((d) => d.name).join(", "));

  const [engineering, hr, finance] = departments;

  // ── Leave Types ──────────────────────────────────────────────────────────────
  await prisma.leaveType.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Annual Leave" } },
    update: {},
    create: { tenantId: tenant.id, name: "Annual Leave", daysPerYear: 21, isPaid: true },
  });
  await prisma.leaveType.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Sick Leave" } },
    update: {},
    create: { tenantId: tenant.id, name: "Sick Leave", daysPerYear: 10, isPaid: true },
  });
  console.log("Leave types created");

  // ── Employees ────────────────────────────────────────────────────────────────
  const employeeSeed = [
    {
      code: "EMP0001",
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice@demo.com",
      jobTitle: "Senior Engineer",
      departmentId: engineering.id,
      baseSalary: "8000",
    },
    {
      code: "EMP0002",
      firstName: "Bob",
      lastName: "Smith",
      email: "bob@demo.com",
      jobTitle: "Backend Developer",
      departmentId: engineering.id,
      baseSalary: "6500",
    },
    {
      code: "EMP0003",
      firstName: "Carol",
      lastName: "Williams",
      email: "carol@demo.com",
      jobTitle: "HR Specialist",
      departmentId: hr.id,
      baseSalary: "5500",
    },
    {
      code: "EMP0004",
      firstName: "David",
      lastName: "Brown",
      email: "david@demo.com",
      jobTitle: "Financial Analyst",
      departmentId: finance.id,
      baseSalary: "7000",
    },
    {
      code: "EMP0005",
      firstName: "Eve",
      lastName: "Davis",
      email: "eve@demo.com",
      jobTitle: "Frontend Developer",
      departmentId: engineering.id,
      baseSalary: "6000",
    },
  ];

  for (const emp of employeeSeed) {
    await prisma.employee.upsert({
      where: { tenantId_employeeCode: { tenantId: tenant.id, employeeCode: emp.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        employeeCode: emp.code,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        jobTitle: emp.jobTitle,
        departmentId: emp.departmentId,
        baseSalary: emp.baseSalary,
        startDate: new Date("2024-01-01"),
        employmentType: "FULL_TIME",
        status: "ACTIVE",
      },
    });
  }
  console.log("Employees created:", employeeSeed.length);

  console.log("\nSeed completed!");
  console.log("Login at: http://localhost:3000/login");
  console.log("  Slug: demo | Email: admin@demo.com | Password: demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
