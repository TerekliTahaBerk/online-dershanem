import Link from "next/link";

/**
 * "BUGÜN" KARTI — onaylı tasarım (Panel.dc.html → scStudentHome).
 *
 * Tasarımın işlev tanımı: bugünün akışı tek kartta, satır satır — saat,
 * başlık, alt bilgi ve o satıra ait tek aksiyon. Satırlar YETKİYE göre gelir:
 * canlı ders OD'den, plan görevi koçluktan, deneme ODK'dan. Hiçbiri yoksa
 * kart boş bırakılmaz; ne yapılabileceğini söyleyen bir durum gösterir.
 */

export type TodayRow = {
  id: string;
  /** Sol sütun: saat ya da gün etiketi. */
  when: string;
  title: string;
  meta: string;
  action?: { label: string; href: string; primary?: boolean };
};

export function TodayCard({ rows, dateLabel }: { rows: TodayRow[]; dateLabel: string }) {
  return (
    <section className="mt-7 rounded-[14px] border border-dc-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-dc-line-soft px-[22px] py-[18px]">
        <h2 className="text-[17px] font-bold text-dc-ink">Bugün</h2>
        <span className="text-[13px] text-dc-ink-faint">{dateLabel}</span>
      </div>

      {rows.length === 0 ? (
        <div className="px-[22px] py-[26px]">
          <p className="text-[15px] font-bold text-dc-ink">Bugün planlanmış bir şey yok.</p>
          <p className="mt-1.5 text-[14px] text-dc-ink-muted">
            Yarının programına bakabilir ya da geçmiş ders notlarını gözden geçirebilirsin.
          </p>
        </div>
      ) : (
        <ul>
          {rows.map((row, i) => (
            <li
              key={row.id}
              className={`flex flex-wrap items-center gap-4 px-[22px] py-4 sm:gap-5 ${
                i < rows.length - 1 ? "border-b border-dc-line-soft" : ""
              }`}
            >
              <span className="w-16 flex-none text-[14px] font-bold text-dc-ink">{row.when}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-dc-ink">{row.title}</span>
                <span className="mt-0.5 block text-[13.5px] text-dc-ink-muted">{row.meta}</span>
              </span>
              {row.action ? (
                <Link
                  href={row.action.href}
                  className={`flex-none rounded-[10px] px-4 py-2.5 text-[13.5px] font-bold transition-colors ${
                    row.action.primary
                      ? "bg-dc-brand-strong text-white hover:bg-dc-brand-hover"
                      : "border border-[#DDE4E0] bg-white text-dc-ink hover:border-dc-brand"
                  }`}
                >
                  {row.action.label}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
