const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Tenant
  let tenant = await prisma.tenant.findUnique({ where: { slug: "demo" } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: "Demo Company", slug: "demo" },
    });
    console.log("Created tenant: Demo Company");
  }

  // Admin user
  const existing = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email: "admin@demo.com" },
  });
  if (!existing) {
    const hashed = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: "Admin",
        email: "admin@demo.com",
        hashedPassword: hashed,
        role: "ADMIN",
      },
    });
    console.log("Created admin user: admin@demo.com / admin123");
  }

  // GL Accounts (standard chart of accounts)
  const accounts = [
    { code: "1000", name: "Cash & Bank",            type: "ASSET" },
    { code: "1200", name: "Accounts Receivable",     type: "ASSET" },
    { code: "1300", name: "Inventory",               type: "ASSET" },
    { code: "1500", name: "Prepaid Expenses",        type: "ASSET" },
    { code: "1800", name: "Fixed Assets",            type: "ASSET" },
    { code: "2000", name: "Accounts Payable",        type: "LIABILITY" },
    { code: "2100", name: "GR/IR Clearing",          type: "LIABILITY" },
    { code: "2200", name: "Salary Payable",          type: "LIABILITY" },
    { code: "2500", name: "Tax Payable",             type: "LIABILITY" },
    { code: "3000", name: "Share Capital",           type: "EQUITY" },
    { code: "3100", name: "Retained Earnings",       type: "EQUITY" },
    { code: "4000", name: "Revenue",                 type: "REVENUE" },
    { code: "4100", name: "Other Income",            type: "REVENUE" },
    { code: "5000", name: "Cost of Goods Sold",      type: "EXPENSE" },
    { code: "5100", name: "Freight & Logistics",     type: "EXPENSE" },
    { code: "6000", name: "Payroll Expense",         type: "EXPENSE" },
    { code: "6100", name: "Rent Expense",            type: "EXPENSE" },
    { code: "6200", name: "Utilities Expense",       type: "EXPENSE" },
    { code: "6300", name: "Depreciation Expense",    type: "EXPENSE" },
  ];

  for (const acc of accounts) {
    await prisma.gLAccount.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: acc.code } },
      update: {},
      create: { tenantId: tenant.id, ...acc },
    });
  }
  console.log(`Seeded ${accounts.length} GL accounts`);

  // Fiscal year
  const year = new Date().getFullYear();
  await prisma.fiscalYear.upsert({
    where: { tenantId_year: { tenantId: tenant.id, year } },
    update: {},
    create: {
      tenantId: tenant.id,
      year,
      startDate: new Date(`${year}-01-01`),
      endDate: new Date(`${year}-12-31`),
      status: "OPEN",
    },
  });
  console.log(`Seeded fiscal year ${year}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
