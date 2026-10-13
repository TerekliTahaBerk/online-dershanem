import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Compact metrics share the panel's neutral surfaces and typography. */
export function BusinessMetric({ label, value, icon: Icon }: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <article className="min-w-0 rounded-[10px] border border-pn-border bg-white p-4">
      <div className="flex items-start justify-between gap-2 text-pn-text-muted">
        <p className="text-[12.5px] font-medium leading-5">{label}</p>
        {Icon ? <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> : null}
      </div>
      <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-pn-text tabular-nums">{value}</p>
    </article>
  );
}
