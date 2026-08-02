import { BookOpen, CalendarDays, Check, ChevronRight, MessageCircle, Target } from "lucide-react";

const planRows = [
  { label: "Tamamlandı", title: "Problemlerde çözüm stratejileri", detail: "Ders notu ve örnek sorular hazır", done: true },
  { label: "Bu hafta", title: "20 soru + iki yeni nesil problem", detail: "Öğretmenin seçtiği çalışma", active: true },
  { label: "Sıradaki", title: "Oran-orantı bağlantısı", detail: "Bir sonraki dersin başlangıç noktası" },
];

const summaryRows = [
  ["İşlenen konu", "Üslü sayılar"],
  ["Dikkat noktası", "Negatif üslerde işaret"],
  ["Sonraki hedef", "Köklü sayılara geçiş"],
];

export function LearningDashboardShowcase() {
  return (
    <div className="relative mx-auto max-w-[1120px] overflow-hidden rounded-[30px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-3 shadow-[0_35px_90px_-62px_rgba(17,19,17,.42)] sm:p-6 lg:p-9" aria-label="Öğrenci çalışma paneli ve veli mobil özetinin örnek görünümü">
      <div className="absolute right-8 top-8 h-40 w-40 rounded-full bg-[var(--brand-yellow)] opacity-25 blur-3xl" aria-hidden="true" />

      <div className="relative overflow-hidden rounded-[24px] border border-[var(--site-line)] bg-white shadow-[0_24px_60px_-44px_rgba(17,19,17,.38)] lg:mr-[190px]">
        <div className="flex min-h-14 items-center justify-between border-b border-[var(--site-line)] px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e8b6aa]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-yellow)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#b9ceb0]" />
            </span>
            <span className="hidden text-[12px] font-semibold text-[var(--site-ink)] sm:inline">Öğrenci çalışma paneli</span>
          </div>
          <span className="rounded-full bg-[var(--brand-olive-soft)] px-3 py-1 text-[10px] font-bold text-[var(--brand-olive)]">Örnek görünüm</span>
        </div>

        <div className="grid min-h-[500px] md:grid-cols-[190px_1fr]">
          <aside className="hidden border-r border-[var(--site-line)] bg-[var(--brand-olive-tint)] p-5 md:block" aria-label="Panel menüsü">
            <p className="text-[11px] font-bold uppercase tracking-[.1em] text-[var(--site-muted)]">Matematik</p>
            <div className="mt-6 space-y-2" aria-label="Örnek panel bölümleri">
              <span className="flex items-center gap-2 rounded-xl bg-[var(--brand-olive)] px-3 py-3 text-[12px] font-semibold text-white"><Target size={15} aria-hidden="true" /> Çalışma yönüm</span>
              <span className="flex items-center gap-2 px-3 py-3 text-[12px] font-medium text-[var(--site-body)]"><CalendarDays size={15} aria-hidden="true" /> Derslerim</span>
              <span className="flex items-center gap-2 px-3 py-3 text-[12px] font-medium text-[var(--site-body)]"><BookOpen size={15} aria-hidden="true" /> Ödevlerim</span>
            </div>
            <div className="mt-36 rounded-[16px] border border-[var(--site-line)] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]">Sıradaki ders</p>
              <p className="mt-2 text-[13px] font-semibold leading-5 text-[var(--site-ink)]">Cumartesi · 14.00</p>
              <p className="mt-1 text-[11px] text-[var(--site-muted)]">90 dakika canlı ders</p>
            </div>
          </aside>

          <div className="p-5 sm:p-8 lg:pr-12">
            <p className="site-kicker">Bu haftanın çalışma yönü</p>
            <h3 className="mt-3 max-w-xl text-[clamp(1.8rem,4vw,3rem)] font-semibold leading-[1.04] tracking-[-.04em] text-[var(--site-ink)]">Ne çalışacağın, neden çalışacağın ve sıradaki adımın net.</h3>
            <p className="mt-4 max-w-xl text-[14px] leading-6 text-[var(--site-body)]">Ders sonrası plan tek ekranda kalır; öğrenci haftaya nereden devam edeceğini bilir.</p>

            <div className="mt-8 space-y-3">
              {planRows.map((row) => (
                <div key={row.label} className={`grid gap-3 rounded-[17px] border p-4 sm:grid-cols-[105px_1fr_auto] sm:items-center ${row.active ? "border-[var(--brand-olive)] bg-[var(--brand-olive-tint)]" : "border-[var(--site-line)] bg-white"}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-[.08em] ${row.active ? "text-[var(--brand-olive)]" : "text-[var(--site-muted)]"}`}>{row.label}</span>
                  <span>
                    <span className="block text-[13px] font-semibold text-[var(--site-ink)]">{row.title}</span>
                    <span className="mt-1 block text-[11px] leading-5 text-[var(--site-muted)]">{row.detail}</span>
                  </span>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${row.done ? "bg-[var(--brand-olive)] text-white" : "bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"}`} aria-hidden="true">
                    {row.done ? <Check size={15} /> : <ChevronRight size={15} />}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto -mt-28 w-[248px] rounded-[42px] bg-[#10120f] p-[7px] shadow-[0_30px_65px_-24px_rgba(17,19,17,.58)] sm:w-[270px] lg:absolute lg:bottom-5 lg:right-7 lg:mt-0" aria-label="iPhone görünümünde veli özeti">
        <div className="relative min-h-[520px] overflow-hidden rounded-[35px] bg-white px-5 pb-6 pt-14">
          <div className="absolute left-1/2 top-3 h-7 w-[92px] -translate-x-1/2 rounded-full bg-[#10120f]" aria-hidden="true" />
          <div className="absolute inset-x-5 top-4 flex items-center justify-between text-[9px] font-bold text-[var(--site-ink)]" aria-hidden="true">
            <span>09:41</span><span>● ●●</span>
          </div>
          <div className="flex items-center justify-between border-b border-[var(--site-line)] pb-4">
            <div>
              <p className="text-[11px] font-bold text-[var(--site-ink)]">Veli özeti</p>
              <p className="mt-0.5 text-[9px] text-[var(--site-muted)]">8. sınıf · Matematik</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"><MessageCircle size={14} aria-hidden="true" /></span>
          </div>

          <div className="mt-5 rounded-[18px] bg-[var(--brand-olive)] p-4 text-white">
            <p className="text-[9px] font-bold uppercase tracking-[.09em] text-white/65">Ders tamamlandı</p>
            <p className="mt-2 text-[18px] font-semibold leading-[1.1]">Bu haftanın kısa özeti hazır.</p>
            <p className="mt-3 text-[10px] leading-4 text-white/70">İşlenen konu, dikkat noktası ve sıradaki hedef tek bakışta.</p>
          </div>

          <dl className="mt-5 space-y-3">
            {summaryRows.map(([label, value]) => (
              <div key={label} className="rounded-[14px] border border-[var(--site-line)] p-3">
                <dt className="text-[8px] font-bold uppercase tracking-[.08em] text-[var(--site-muted)]">{label}</dt>
                <dd className="mt-1.5 text-[11px] font-semibold leading-4 text-[var(--site-ink)]">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-center text-[9px] font-semibold text-[var(--brand-olive)]">Örnek görünüm</p>
        </div>
      </div>
    </div>
  );
}
