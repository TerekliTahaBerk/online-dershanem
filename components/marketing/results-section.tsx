import { Check, ShieldCheck, Trophy } from "lucide-react";

const lessonBars = [
  { label: "Soru sorma", value: 92 },
  { label: "Birlikte çözüm", value: 84 },
  { label: "Çalışma yönü", value: 76 },
  { label: "Öğretmen notu", value: 68 },
];

export function ResultsSection() {
  return (
    <section className="bg-white">
      <div className="site-container py-24 sm:py-36">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="flex min-h-[560px] flex-col justify-between rounded-[40px] bg-[#fafafa] p-8 sm:p-14">
            <div className="flex items-center gap-2 text-[var(--brand-orange-ink)]"><Trophy size={22} aria-hidden="true" /><span className="text-[15px] font-semibold">Küçük grubun farkı</span></div>
            <div className="mt-12 flex flex-1 items-end justify-center gap-14 sm:gap-20">
              <div className="text-center">
                <p className="font-display text-[72px] leading-none text-[var(--brand-orange-ink)]">4</p>
                <div className="mx-auto mt-8 h-64 w-28 rounded-t-[26px] bg-[linear-gradient(180deg,var(--brand-orange),#9eaf87)] sm:w-36" />
                <p className="mt-5 text-[15px] font-bold text-[var(--site-ink)]">Online Dershanem</p>
                <p className="mt-1 text-[12px] text-[var(--site-muted)]">En fazla öğrenci</p>
              </div>
              <div className="text-center">
                <p className="font-display text-[42px] leading-none text-[var(--site-muted)]">Kalabalık</p>
                <div className="mx-auto mt-8 h-32 w-28 rounded-t-[26px] bg-[#dededc] sm:w-36" />
                <p className="mt-5 text-[15px] font-bold text-[var(--site-body)]">Kalabalık sınıf</p>
                <p className="mt-1 text-[12px] text-[var(--site-muted)]">Tipik sınıf düzeni</p>
              </div>
            </div>
          </article>

          <article className="flex min-h-[560px] flex-col rounded-[40px] bg-[#fafafa] p-8 sm:p-14">
            <div className="flex items-center gap-2 text-[var(--brand-orange-ink)]"><Trophy size={22} aria-hidden="true" /><span className="text-[15px] font-semibold">Takiple gelen netlik</span></div>
            <h2 className="mt-10 font-display text-[clamp(2.8rem,5.4vw,5.25rem)] leading-[.98] tracking-[-0.04em] text-[var(--site-ink)]">Sonuçlar konuşuyor.</h2>
            <div className="mt-9 h-px bg-[var(--site-line)]" />
            <p className="mt-9 text-[20px] leading-8 text-[var(--site-body)]">Öğrenci derste görünür, ders sonunda ne çalışacağını bilir.</p>
            <p className="mt-auto pt-12 text-[15px] leading-7 text-[var(--site-muted)]">Küçük grup, öğretmen gözlemi ve ders sonrası yönlendirme aynı düzen içinde ilerler.</p>
            <div className="mt-8 inline-flex items-center gap-2 font-semibold text-[var(--brand-orange-ink)]"><Check size={18} aria-hidden="true" />Abartılı başarı vaadi yok; süreç açık ve takip edilebilir.</div>
          </article>

          <article className="min-h-[440px] rounded-[40px] bg-[#fafafa] p-8 sm:p-14">
            <h3 className="text-[18px] font-bold text-[var(--site-ink)]">Ders modelinin dört parçası</h3>
            <div className="mt-16 flex h-56 items-end gap-5">
              {lessonBars.map((bar) => (
                <div key={bar.label} className="flex flex-1 flex-col items-center justify-end">
                  <span className="mb-3 text-[13px] font-semibold text-[var(--brand-orange-ink)]">{bar.value}</span>
                  <div className="w-full rounded-t-[18px] bg-[linear-gradient(180deg,var(--brand-orange),#a9b795)]" style={{ height: `${bar.value}%` }} />
                  <span className="mt-4 text-center text-[11px] leading-4 text-[var(--site-muted)] sm:text-[13px]">{bar.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="grid min-h-[440px] items-center gap-10 rounded-[40px] bg-[#fafafa] p-8 sm:grid-cols-[.8fr_1.2fr] sm:p-14">
            <div className="text-center sm:text-left">
              <p className="font-display text-[clamp(2.8rem,6vw,5.4rem)] leading-none tracking-[-0.04em] text-[var(--brand-orange-ink)]">₺3.000</p>
              <p className="mt-3 text-[14px] text-[var(--site-muted)]">aylık sabit fiyat</p>
              <div className="mt-7 inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--site-ink)]"><ShieldCheck size={18} className="text-[var(--brand-orange)]" aria-hidden="true" />PayTR güvenli ödeme</div>
            </div>
            <div className="space-y-7">
              {["Canlı matematik dersi", "En fazla 4 öğrenci", "Ders sonrası takip", "Seviyeye göre grup"].map((label, index) => (
                <div key={label}>
                  <div className="flex justify-between text-[13px] text-[var(--site-body)]"><span>{label}</span><Check size={15} className="text-[var(--brand-orange)]" aria-hidden="true" /></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e2e2e0]"><div className="h-full rounded-full bg-[var(--brand-orange)]" style={{ width: `${94 - index * 7}%` }} /></div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
