import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconBg?: string;
  trend?: "up" | "down" | "neutral";
}

const trendStyles: Record<NonNullable<StatCardProps["trend"]>, string> = {
  up: "text-emerald-600",
  down: "text-red-600",
  neutral: "text-gray-500",
};

const trendSymbols: Record<NonNullable<StatCardProps["trend"]>, string> = {
  up: "↑",
  down: "↓",
  neutral: "→",
};

export function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  iconColor = "text-blue-600",
  iconBg = "bg-blue-50",
  trend,
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
          {subValue && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                trend ? trendStyles[trend] : "text-gray-500"
              )}
            >
              {trend && <span className="mr-0.5">{trendSymbols[trend]}</span>}
              {subValue}
            </p>
          )}
        </div>
        <div className={cn("ml-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}
