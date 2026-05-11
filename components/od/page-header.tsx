import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type PageHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4 mb-6", className)}>
      <div className="flex flex-col gap-1 min-w-0">
        <h1 className="text-od-h1 font-semibold text-od-ink truncate">{title}</h1>
        {description && (
          <p className="text-od-body text-od-mute max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
