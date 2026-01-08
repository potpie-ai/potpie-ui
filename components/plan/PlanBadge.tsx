import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanBadgeProps {
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export const PlanBadge: React.FC<PlanBadgeProps> = ({
  children,
  icon: Icon,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-0.5 border border-zinc-200 rounded text-xs font-medium text-primary-color",
        className
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </div>
  );
};

