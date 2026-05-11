import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

type ColorScheme = { bg: string; text: string };

const statusColorMap: Record<string, ColorScheme> = {
  // Gray
  DRAFT: { bg: "bg-gray-100", text: "text-gray-700" },

  // Blue
  SUBMITTED: { bg: "bg-blue-100", text: "text-blue-700" },
  CONFIRMED: { bg: "bg-blue-100", text: "text-blue-700" },
  OPEN: { bg: "bg-blue-100", text: "text-blue-700" },

  // Green
  APPROVED: { bg: "bg-emerald-100", text: "text-emerald-700" },
  POSTED: { bg: "bg-emerald-100", text: "text-emerald-700" },
  COMPLETED: { bg: "bg-emerald-100", text: "text-emerald-700" },
  DELIVERED: { bg: "bg-emerald-100", text: "text-emerald-700" },
  RECEIVED: { bg: "bg-emerald-100", text: "text-emerald-700" },
  SHIPPED: { bg: "bg-emerald-100", text: "text-emerald-700" },
  PAID: { bg: "bg-emerald-100", text: "text-emerald-700" },

  // Red
  REJECTED: { bg: "bg-red-100", text: "text-red-700" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-700" },
  REVERSED: { bg: "bg-red-100", text: "text-red-700" },

  // Yellow
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-700" },
  PROCESSING: { bg: "bg-yellow-100", text: "text-yellow-700" },
  PARTIALLY_RECEIVED: { bg: "bg-yellow-100", text: "text-yellow-700" },
  PARTIALLY_DELIVERED: { bg: "bg-yellow-100", text: "text-yellow-700" },
  PICKED: { bg: "bg-yellow-100", text: "text-yellow-700" },

  // Purple
  ORDERED: { bg: "bg-purple-100", text: "text-purple-700" },
  BILLED: { bg: "bg-purple-100", text: "text-purple-700" },
};

const defaultColor: ColorScheme = { bg: "bg-gray-100", text: "text-gray-600" };

function formatLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toUpperCase().replace(/\s+/g, "_");
  const { bg, text } = statusColorMap[normalized] ?? defaultColor;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        bg,
        text,
        className
      )}
    >
      {formatLabel(status)}
    </span>
  );
}
