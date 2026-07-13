const rows = [
  ["İşlenen konu", "Üslü sayılarda çarpma ve bölme"],
  ["Zorlanılan nokta", "Negatif üslerde işaret kontrolü"],
  ["Bu haftanın çalışması", "Karışık 20 soru ve iki yeni nesil problem"],
  ["Sonraki hedef", "Köklü sayılara geçiş"],
];

export function ParentSummaryPreview() {
  return (
    <div className="mx-auto max-w-[430px] rounded-[22px] border border-[var(--site-line)] bg-white p-5 sm:p-7" aria-label="Veli gelişim özetinin örnek görünümü">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-[var(--site-ink)]">Ders sonrası veli özeti</p>
          <p className="mt-1 text-[12px] text-[var(--site-muted)]">8. sınıf · Matematik</p>
        </div>
        <span className="rounded-full bg-[var(--brand-olive-soft)] px-3 py-1 text-[10px] font-semibold text-[var(--brand-olive)]">Örnek görünüm</span>
      </div>
      <dl className="mt-6 divide-y divide-[var(--site-line)] border-t border-[var(--site-line)]">
        {rows.map(([label, value]) => (
          <div key={label} className="py-4">
            <dt className="text-[10px] font-bold uppercase tracking-[.08em] text-[var(--site-muted)]">{label}</dt>
            <dd className="mt-1.5 text-[13px] leading-6 text-[var(--site-body)]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
