/**
 * Phase 2 / Session 14 — Finance date range filter.
 *
 * Pure server component. Renders four `<Link>` chips that swap the `range`
 * search param. No client JS needed.
 */
import Link from "next/link";
import {
  FINANCE_RANGE_PRESETS,
  type FinanceRangePreset,
} from "@/lib/panel/admin-finance-reports-display";

export function FinanceRangeFilter({
  basePath,
  current,
}: {
  basePath: string;
  current: FinanceRangePreset;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-slate-500">Aralık:</span>
      {FINANCE_RANGE_PRESETS.map((p) => {
        const active = p.value === current;
        const cls = active
          ? "bg-slate-900 text-white"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50";
        return (
          <Link
            key={p.value}
            href={`${basePath}?range=${p.value}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}
            aria-current={active ? "page" : undefined}
          >
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
