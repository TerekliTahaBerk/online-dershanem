import Link from "next/link";

const steps = [
  ["01", "Ön görüşme", "Öğrencinin sınıfını, hedefini ve matematikte zorlandığı noktayı konuşuruz."],
  ["02", "Seviye ve hedef", "Uygun tempo ve sınav hedefi için kısa bir değerlendirme yaparız."],
  ["03", "Küçük gruba yerleşim", "Benzer seviye ve hedefte, en fazla dört öğrencilik grubu planlarız."],
  ["04", "Canlı ders ve takip", "Ayda dört canlı ders ve ders sonrası çalışma yönü başlar."],
];

export function First30Days() {
  return (
    <section id="nasil-calisir" className="scroll-mt-24 bg-[var(--brand-olive-soft)]">
      <div className="site-container site-section">
        <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
          <div>
            <p className="site-kicker">Nasıl çalışır?</p>
            <h2 className="mt-4 text-[clamp(2.4rem,5vw,3.8rem)] font-semibold leading-[1.02] tracking-[-.045em] text-[var(--site-ink)]">Ödemeden ilk derse dört sade adım.</h2>
            <Link href="/iletisim/" className="site-btn site-btn-primary mt-8">Ücretsiz ön görüşme</Link>
          </div>
          <ol className="divide-y divide-[var(--site-line)] border-y border-[var(--site-line)]">
            {steps.map(([number, title, body]) => (
              <li key={number} className="grid gap-3 py-6 sm:grid-cols-[54px_180px_1fr] sm:items-start sm:py-7">
                <span className="font-mono text-[12px] text-[var(--brand-olive)]">{number}</span>
                <h3 className="text-[16px] font-semibold text-[var(--site-ink)]">{title}</h3>
                <p className="text-[14px] leading-6 text-[var(--site-body)]">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
