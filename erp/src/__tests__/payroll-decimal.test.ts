import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";

const TAX_RATE = new Prisma.Decimal("0.15");
const ZERO = new Prisma.Decimal(0);

type Employee = { id: string; baseSalary: string };

function computePayrollItems(employees: Employee[]) {
  return employees.map((emp) => {
    const baseSalary = new Prisma.Decimal(emp.baseSalary);
    const tax = baseSalary.times(TAX_RATE).toDecimalPlaces(2);
    const netSalary = baseSalary.minus(tax).toDecimalPlaces(2);
    return { id: emp.id, baseSalary, tax, netSalary };
  });
}

describe("payroll decimal arithmetic — balanced JE invariant", () => {
  const employees: Employee[] = [
    { id: "e1", baseSalary: "3333.33" },
    { id: "e2", baseSalary: "5555.55" },
    { id: "e3", baseSalary: "7777.77" },
  ];

  it("each item: baseSalary === netSalary + tax (to the cent)", () => {
    const items = computePayrollItems(employees);
    for (const item of items) {
      const sum = item.netSalary.plus(item.tax);
      expect(sum.equals(item.baseSalary)).toBe(true);
    }
  });

  it("totals: totalGross (debits) === totalNet + totalTax (credits)", () => {
    const items = computePayrollItems(employees);
    const totalGross = items.reduce((s, i) => s.plus(i.baseSalary), ZERO);
    const totalNet = items.reduce((s, i) => s.plus(i.netSalary), ZERO);
    const totalTax = items.reduce((s, i) => s.plus(i.tax), ZERO);

    const debits = totalGross;
    const credits = totalNet.plus(totalTax);

    expect(debits.equals(credits)).toBe(true);
    // sanity: cents match exactly
    expect(debits.toFixed(2)).toBe(credits.toFixed(2));
  });

  it("tax is correctly rounded to 2dp (no float drift)", () => {
    const items = computePayrollItems(employees);
    // 3333.33 * 0.15 = 499.9995 -> 500.00 (banker's rounding via Decimal default = half-up)
    expect(items[0].tax.toFixed(2)).toBe("500.00");
    // 5555.55 * 0.15 = 833.3325 -> 833.33
    expect(items[1].tax.toFixed(2)).toBe("833.33");
    // 7777.77 * 0.15 = 1166.6655 -> 1166.67
    expect(items[2].tax.toFixed(2)).toBe("1166.67");
  });

  it("invariant holds for a wider awkward set", () => {
    const wide: Employee[] = [
      { id: "a", baseSalary: "0.01" },
      { id: "b", baseSalary: "1234567.89" },
      { id: "c", baseSalary: "9999.99" },
      { id: "d", baseSalary: "100.00" },
    ];
    const items = computePayrollItems(wide);
    const debits = items.reduce((s, i) => s.plus(i.baseSalary), ZERO);
    const credits = items
      .reduce((s, i) => s.plus(i.netSalary), ZERO)
      .plus(items.reduce((s, i) => s.plus(i.tax), ZERO));
    expect(debits.equals(credits)).toBe(true);
  });
});
