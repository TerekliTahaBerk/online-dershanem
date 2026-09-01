import { formatIstanbulDateInput } from "@/lib/istanbul-time";
import type { AnalyticsCohortFilters } from "@/lib/analytics/filters";

export function AnalyticsFilterForm({
  filters,
  action,
}: {
  filters: AnalyticsCohortFilters;
  action?: string;
}) {
  return (
    <form method="get" action={action} className="panel-surface flex flex-wrap gap-3 p-4">
      <label className="text-xs font-bold text-[var(--site-muted)]">
        Başlangıç
        <input
          name="from"
          type="date"
          defaultValue={formatIstanbulDateInput(filters.from)}
          className="ml-2 rounded-xl border border-[var(--site-line)] bg-white p-2 text-[var(--site-ink)]"
        />
      </label>
      <label className="text-xs font-bold text-[var(--site-muted)]">
        Bitiş
        <input
          name="to"
          type="date"
          defaultValue={formatIstanbulDateInput(filters.to)}
          className="ml-2 rounded-xl border border-[var(--site-line)] bg-white p-2 text-[var(--site-ink)]"
        />
      </label>
      <label className="text-xs font-bold text-[var(--site-muted)]">
        Sınav
        <select
          name="examType"
          defaultValue={filters.examType}
          aria-label="Sınav türü"
          className="ml-2 rounded-xl border border-[var(--site-line)] bg-white px-3 py-2 text-[var(--site-ink)]"
        >
          <option value="ALL">Tümü</option>
          <option value="LGS">LGS</option>
          <option value="TYT">TYT</option>
          <option value="AYT">AYT</option>
          <option value="YDT">YDT</option>
        </select>
      </label>
      <label className="text-xs font-bold text-[var(--site-muted)]">
        Sınıf
        <input
          name="classLevel"
          type="text"
          defaultValue={filters.classLevel ?? ""}
          placeholder="örn. 11"
          className="ml-2 w-24 rounded-xl border border-[var(--site-line)] bg-white p-2 text-[var(--site-ink)]"
        />
      </label>
      <label className="text-xs font-bold text-[var(--site-muted)]">
        Ürün
        <select
          name="product"
          defaultValue={filters.product}
          aria-label="Ürün"
          className="ml-2 rounded-xl border border-[var(--site-line)] bg-white px-3 py-2 text-[var(--site-ink)]"
        >
          <option value="ALL">Tüm ürünler</option>
          <option value="OD">OD</option>
          <option value="OK">OK</option>
          <option value="ODK">ODK</option>
        </select>
      </label>
      <label className="text-xs font-bold text-[var(--site-muted)]">
        Grup ID
        <input
          name="groupId"
          type="text"
          defaultValue={filters.groupId ?? ""}
          className="ml-2 w-36 rounded-xl border border-[var(--site-line)] bg-white p-2 font-mono text-[11px] text-[var(--site-ink)]"
        />
      </label>
      <label className="text-xs font-bold text-[var(--site-muted)]">
        Öğretmen ID
        <input
          name="teacherId"
          type="text"
          defaultValue={filters.teacherId ?? ""}
          className="ml-2 w-36 rounded-xl border border-[var(--site-line)] bg-white p-2 font-mono text-[11px] text-[var(--site-ink)]"
        />
      </label>
      <button
        type="submit"
        className="rounded-xl bg-[var(--brand-olive)] px-4 py-2 text-xs font-bold text-white"
      >
        Uygula
      </button>
    </form>
  );
}

export function filtersToQuery(filters: AnalyticsCohortFilters): string {
  const params = new URLSearchParams();
  params.set("from", formatIstanbulDateInput(filters.from));
  params.set("to", formatIstanbulDateInput(filters.to));
  if (filters.examType !== "ALL") params.set("examType", filters.examType);
  if (filters.classLevel) params.set("classLevel", filters.classLevel);
  if (filters.product !== "ALL") params.set("product", filters.product);
  if (filters.groupId) params.set("groupId", filters.groupId);
  if (filters.teacherId) params.set("teacherId", filters.teacherId);
  return params.toString();
}
