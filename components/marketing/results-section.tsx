/**
 * Yalnızca YAPISAL ölçütler — bölümün kendi girişi tablonun piyasa/fiyat
 * karşılaştırması olmadığını söylüyor. Fiyat hero'da ve paket kartlarında
 * duruyor; buraya eklemek rakip sütunları "—" bırakır, hiçbir şey karşılaştırmaz.
 */
const rows = [
  ["Temel rol", "Canlı öğrenme", "Plan ve takip", "Ölçme ve analiz"],
  ["LGS", "Uygun", "Uygun", "Uygun"],
  ["YKS", "Uygun", "Uygun", "TYT ve AYT odağı"],
  ["Ana çıktı", "Ders geri bildirimi", "Haftalık çalışma yönü", "Kazanım ve gelişim raporu"],
];

export function ResultsSection() {
  return (
    <section className="bg-[var(--brand-olive-tint)]">
      <div className="site-container site-section">
        <div className="max-w-3xl">
          <h2 className="text-[clamp(2.4rem,5.5vw,3.8rem)] font-semibold leading-[1.02] tracking-[-.045em] text-[var(--site-ink)]">Her ürünün yolculuktaki işi belli.</h2>
          <p className="mt-6 text-[16px] leading-8 text-[var(--site-body)]">Ürünler birbirinin yerine geçmez; öğrencinin ihtiyacına göre tek başına veya birlikte kullanılabilir.</p>
        </div>
        <div
          className="mt-12 overflow-x-auto rounded-[22px] border border-[var(--site-line)] bg-white"
          tabIndex={0}
          role="region"
          aria-label="Online Dershanem ürünleri karşılaştırma tablosu; yatay kaydırılabilir"
        >
          <table className="w-full min-w-[760px] border-collapse text-left">
            <caption className="sr-only">Online Dershanem, Online Koçum ve Online Deneme Kulübüm karşılaştırması</caption>
            <thead><tr className="border-b border-[var(--site-line)] text-[12px] uppercase tracking-[.06em] text-[var(--site-muted)]"><th className="p-5">Ölçüt</th><th className="p-5">Online Dershanem</th><th className="p-5">Online Koçum</th><th className="bg-[var(--brand-olive-soft)] p-5 text-[var(--brand-olive)]">Online Deneme Kulübüm</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row[0]} className="border-b border-[var(--site-line)] last:border-0"><th scope="row" className="p-5 text-[14px] font-semibold text-[var(--site-ink)]">{row[0]}</th><td className="p-5 text-[14px] text-[var(--site-body)]">{row[1]}</td><td className="p-5 text-[14px] text-[var(--site-body)]">{row[2]}</td><td className="bg-[var(--brand-olive-soft)] p-5 text-[14px] font-medium text-[var(--site-ink)]">{row[3]}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
