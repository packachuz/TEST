"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileText,
  DollarSign,
  Sparkles,
  Landmark,
  BookOpen,
  ScrollText,
  BarChart3,
  Package,
  Boxes,
  Building2,
  ClipboardList,
  ShoppingCart,
  Truck,
  TrendingUp,
  UserCheck,
  ShoppingBag,
  PackageCheck,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  tenantName?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  id: string;
  label: string;
  accentColor: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: "erp",
    label: "ERP",
    accentColor: "border-gray-400",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    id: "hcm",
    label: "HCM",
    accentColor: "border-blue-500",
    items: [
      { href: "/employees", label: "Employees", icon: Users },
      { href: "/attendance", label: "Attendance", icon: CalendarCheck },
      { href: "/leaves", label: "Leaves", icon: FileText },
      { href: "/payroll", label: "Payroll", icon: DollarSign },
      { href: "/hr-agent", label: "HR AI Agent", icon: Sparkles },
    ],
  },
  {
    id: "fi",
    label: "FI",
    accentColor: "border-emerald-500",
    items: [
      { href: "/fi", label: "Overview", icon: Landmark },
      { href: "/fi/accounts", label: "GL Accounts", icon: BookOpen },
      { href: "/fi/journal", label: "Journal Entries", icon: ScrollText },
      { href: "/fi/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    id: "mm",
    label: "MM",
    accentColor: "border-orange-500",
    items: [
      { href: "/mm", label: "Overview", icon: Package },
      { href: "/mm/materials", label: "Materials", icon: Boxes },
      { href: "/mm/vendors", label: "Vendors", icon: Building2 },
      { href: "/mm/purchase-requisitions", label: "Requisitions", icon: ClipboardList },
      { href: "/mm/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
      { href: "/mm/goods-receipts", label: "Goods Receipts", icon: Truck },
    ],
  },
  {
    id: "sd",
    label: "SD",
    accentColor: "border-purple-500",
    items: [
      { href: "/sd", label: "Overview", icon: TrendingUp },
      { href: "/sd/customers", label: "Customers", icon: UserCheck },
      { href: "/sd/sales-orders", label: "Sales Orders", icon: ShoppingBag },
      { href: "/sd/deliveries", label: "Deliveries", icon: PackageCheck },
      { href: "/sd/billing", label: "Billing", icon: Receipt },
    ],
  },
];

export function Sidebar({ tenantName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Brand / Tenant */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">ERP System</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{tenantName ?? "ERP"}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-4">
          {navGroups.map(({ id, label, accentColor, items }) => (
            <li key={id}>
              {/* Group header */}
              <div className={cn("mb-1 flex items-center gap-2 border-l-2 pl-2", accentColor)}>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {label}
                </span>
              </div>

              {/* Group items */}
              <ul className="space-y-1">
                {items.map(({ href, label: itemLabel, icon: Icon }) => {
                  const isActive =
                    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        {itemLabel}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
