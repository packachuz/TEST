# ERP System — SAP-style MM/SD/FI/HCM

A multi-tenant ERP prototype inspired by SAP S/4HANA, built with Next.js 16, TypeScript, Prisma, and PostgreSQL. Implements four core modules with cross-module Universal-Journal-style financial integration.

## Modules

| Module | Description | Key Workflows |
|--------|-------------|---------------|
| **HCM** Human Capital Management | Employees, attendance, leave, payroll, AI HR agent | Hire → Track time → Approve leave → Run payroll |
| **FI** Financial Accounting | Chart of accounts, journal entries, AP/AR, reports | Manual JE → Post → Trial Balance / P&L |
| **MM** Materials Management | Materials, vendors, procurement | PR → PO → Goods Receipt (auto-posts to FI) |
| **SD** Sales & Distribution | Customers, sales orders, deliveries, billing | SO → Delivery → Goods Issue → Invoice (auto-posts to FI) |

## Cross-Module FI Postings (Universal Journal)

Every operational event in MM/SD/HCM automatically generates a balanced journal entry in FI, mirroring SAP's ACDOCA architecture:

| Trigger | Debit | Credit |
|---------|-------|--------|
| MM Goods Receipt confirmed | Inventory (1300) | GR/IR Clearing (2100) |
| SD Delivery shipped | Cost of Goods Sold (5000) | Inventory (1300) |
| SD Customer invoice posted | Accounts Receivable (1200) | Revenue (4000) |
| HCM Payroll completed | Payroll Expense (6000) | Salary Payable (2200) + Payroll Tax (2300) |

## Quick Start — GitHub Codespaces

1. Open the repo in Codespaces (`Code → Codespaces → Create codespace`)
2. The devcontainer auto-installs Node 22 + PostgreSQL 16, runs `npm install`, applies the Prisma schema, and seeds GL accounts
3. Start the dev server:
   ```bash
   cd erp && npm run dev
   ```
4. Open the forwarded port `3000` preview
5. Log in with:
   - **Email**: `admin@demo.com`
   - **Password**: `admin123`

## Quick Start — Local

Requires Node 22+ and PostgreSQL 14+.

```bash
git clone <repo-url>
cd TEST/erp

# Configure DB
cat > .env.local <<EOF
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="local-dev-secret"
EOF

npm install
npx prisma db push
node ../.devcontainer/seed.js   # seeds tenant, admin user, 20 GL accounts, fiscal year

npm run dev
```

App on `http://localhost:3000`.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict)
- **Database**: PostgreSQL 16 with Prisma ORM 7
- **Auth**: NextAuth.js with credentials provider
- **UI**: Tailwind CSS, lucide-react, recharts
- **AI**: Anthropic Claude SDK (HR agent tool calling)

## Architecture Highlights

- **Multi-tenancy**: every model is scoped to a `Tenant`; every query filters by `tenantId`
- **Atomic FI postings**: all cross-module journal entries use `prisma.$transaction` with stock checks, balance verification, and rollback on failure
- **Universal Journal pattern**: `JournalEntry` + `JournalEntryLine` mirror SAP's ACDOCA, with `source` enum (MANUAL/AP/AR/PAYROLL/INVENTORY/GOODS_ISSUE) and `@@unique([tenantId, source, sourceId])` preventing double-posting
- **RBAC**: `ADMIN` / `HR` / `MANAGER` / `EMPLOYEE` roles enforced on mutation endpoints
- **Schema integrity**: 40+ DB indexes on foreign keys, unique constraints on document numbers per tenant

## Repository Layout

```
TEST/
├── .devcontainer/          # Codespaces config + DB seed
│   ├── devcontainer.json
│   ├── setup.sh
│   └── seed.js             # 20 GL accounts, demo tenant, admin user
├── erp/                    # Next.js app
│   ├── prisma/
│   │   └── schema.prisma   # 23 models, 5 enums
│   └── src/
│       ├── app/
│       │   ├── (dashboard)/    # Module landing pages
│       │   │   ├── fi/         # Financial Accounting UI
│       │   │   ├── mm/         # Materials Management UI
│       │   │   ├── sd/         # Sales & Distribution UI
│       │   │   └── employees/, attendance/, leaves/, payroll/, hr-agent/
│       │   └── api/
│       │       ├── fi/, mm/, sd/   # Module REST endpoints
│       │       └── payroll/, employees/, ...
│       ├── components/
│       │   ├── Sidebar.tsx     # Module-grouped navigation
│       │   └── ui/             # Card, StatCard, StatusBadge, DataTable, ModuleHeader
│       └── lib/
└── README.md
```

## End-to-End Demo Flow

1. **Set up materials & vendors** (MM → Materials, MM → Vendors)
2. **Create a Purchase Requisition** with line items → Approve it
3. **Create a Purchase Order** from the approved PR → Confirm it
4. **Create a Goods Receipt** against the PO → Confirm
   - Stock quantities increment automatically
   - A journal entry is auto-posted: Dr Inventory / Cr GR-IR
5. **Create a Customer** (SD → Customers)
6. **Create a Sales Order** with the materials → Confirm
7. **Create a Delivery** from the SO → Ship
   - Stock quantities decrement (with availability check)
   - A journal entry is auto-posted: Dr COGS / Cr Inventory
8. **Create a Customer Invoice** from the SO → Post
   - A journal entry is auto-posted: Dr AR / Cr Revenue
9. **Run Payroll** (HCM → Payroll → New run → Process)
   - Payroll items computed for active employees
   - Balanced journal entry auto-posted: Dr Payroll Expense / Cr Salary Payable + Cr Payroll Tax
10. **View results** in FI → Reports (Trial Balance + P&L)

## Available Scripts

```bash
npm run dev        # Start dev server on :3000
npm run build      # Production build
npm run start      # Run production build
npm run lint       # ESLint
npm run db:push    # Apply schema to DB
npm run db:studio  # Open Prisma Studio
```

## Default Chart of Accounts (seeded)

| Code | Name | Type |
|------|------|------|
| 1000 | Cash & Bank | ASSET |
| 1200 | Accounts Receivable | ASSET |
| 1300 | Inventory | ASSET |
| 1500 | Prepaid Expenses | ASSET |
| 1800 | Fixed Assets | ASSET |
| 2000 | Accounts Payable | LIABILITY |
| 2100 | GR/IR Clearing | LIABILITY |
| 2200 | Salary Payable | LIABILITY |
| 2300 | Payroll Tax Payable | LIABILITY |
| 2500 | Sales Tax Payable | LIABILITY |
| 3000 | Share Capital | EQUITY |
| 3100 | Retained Earnings | EQUITY |
| 4000 | Revenue | REVENUE |
| 4100 | Other Income | REVENUE |
| 5000 | Cost of Goods Sold | EXPENSE |
| 5100 | Freight & Logistics | EXPENSE |
| 6000 | Payroll Expense | EXPENSE |
| 6100 | Rent Expense | EXPENSE |
| 6200 | Utilities Expense | EXPENSE |
| 6300 | Depreciation Expense | EXPENSE |

## Status

Prototype / learning project — not production-hardened. Known limitations:

- Decimal arithmetic uses JS `Number` in places (precision loss at scale)
- HR agent conversation history is client-managed (limited prompt-injection mitigation)
- No automated test suite yet
- Document number sequences use `count + 1` with collision retry (good enough for low concurrency)

## License

MIT
