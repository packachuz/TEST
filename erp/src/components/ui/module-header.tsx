import { cn } from "@/lib/utils";

interface ModuleHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function ModuleHeader({ title, subtitle, action, className }: ModuleHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex items-center justify-between border-b border-gray-200 pb-4",
        className
      )}
    >
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
}
