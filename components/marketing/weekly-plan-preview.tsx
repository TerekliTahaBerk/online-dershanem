import { Check } from "lucide-react";

const items = [
  ["Ders", "Problemler — çözüm stratejileri"],
  ["Tekrar", "Derste zorlanılan iki soru tipi"],
  ["Ödev", "20 soru + iki yeni nesil problem"],
  ["Sıradaki adım", "Oran-orantı ile problem bağlantısı"],
];

export function WeeklyPlanPreview() {
  return (
    <div className="rounded-[22px] border border-[var(--site-line)] bg-white p-5 sm:p-7" aria-label="Haftalık çalışma yönünün örnek görünümü">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--site-line)] pb-5">
        <div>
          <p className="text-[13px] font-semibold text-[var(--site-ink)]">Haftalık çalışma yönü</p>
          <p className="mt-1 text-[12px] text-[var(--site-muted)]">Örnek görünüm</p>
        </div>
        <span className="text-[12px] font-medium text-[var(--brand-olive)]">Hafta 3</span>
      </div>
      <div className="mt-2 divide-y divide-[var(--site-line)]">
        {items.map(([label, value]) => (
          <div key={label} className="grid gap-2 py-4 sm:grid-cols-[120px_1fr] sm:items-center">
            <span className="text-[11px] font-bold uppercase tracking-[.08em] text-[var(--site-muted)]">{label}</span>
            <span className="flex items-start gap-2 text-[14px] leading-6 text-[var(--site-body)]">
              <Check size={16} className="mt-1 shrink-0 text-[var(--brand-olive)]" aria-hidden="true" />
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
