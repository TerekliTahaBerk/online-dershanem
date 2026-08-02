/**
 * Yalnızca YAPISAL ölçütler — bölümün kendi girişi tablonun piyasa/fiyat
 * karşılaştırması olmadığını söylüyor. Fiyat hero'da ve paket kartlarında
 * duruyor; buraya eklemek rakip sütunları "—" bırakır, hiçbir şey karşılaştırmaz.
 */
const rows = [
  ["Grup düzeni", "Birebir", "Grup dersi", "En fazla 4 öğrenci"],
  ["Canlı etkileşim", "Bire bir", "Programa göre değişir", "Öğrenci çözümünü gösterir"],
  ["Ders sonrası yön", "Öğretmene göre değişir", "Programa göre değişir", "Her ders sonrası çalışma yönü"],
  ["Veli bilgilendirme", "Öğretmene göre değişir", "Programa göre değişir", "Sade gelişim özeti"],
];

export function ResultsSection() {
  return (
    <section className="bg-[var(--brand-olive-tint)]">
      <div className="site-container site-section">
        <div className="max-w-3xl">
          <h2 className="text-[clamp(2.4rem,5.5vw,3.8rem)] font-semibold leading-[1.02] tracking-[-.045em] text-[var(--site-ink)]">İhtiyaca göre doğru matematik desteği.</h2>
          <p className="mt-6 text-[16px] leading-8 text-[var(--site-body)]">Aşağıdaki tablo piyasa sonucu veya başarı vaadi değil; üç ders modelinin yapısal özelliklerini karşılaştırır.</p>
        </div>
        <div
          className="mt-12 overflow-x-auto rounded-[22px] border border-[var(--site-line)] bg-white"
          tabIndex={0}
          role="region"
          aria-label="Ders modelleri karşılaştırma tablosu; yatay kaydırılabilir"
        >
          <table className="w-full min-w-[760px] border-collapse text-left">
            <caption className="sr-only">Birebir ders, grup dersi ve Online Dershanem özellik karşılaştırması</caption>
            <thead><tr className="border-b border-[var(--site-line)] text-[12px] uppercase tracking-[.06em] text-[var(--site-muted)]"><th className="p-5">Ölçüt</th><th className="p-5">Birebir ders</th><th className="p-5">Genel grup modeli</th><th className="bg-[var(--brand-olive-soft)] p-5 text-[var(--brand-olive)]">Online Dershanem</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row[0]} className="border-b border-[var(--site-line)] last:border-0"><th scope="row" className="p-5 text-[14px] font-semibold text-[var(--site-ink)]">{row[0]}</th><td className="p-5 text-[14px] text-[var(--site-body)]">{row[1]}</td><td className="p-5 text-[14px] text-[var(--site-body)]">{row[2]}</td><td className="bg-[var(--brand-olive-soft)] p-5 text-[14px] font-medium text-[var(--site-ink)]">{row[3]}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
