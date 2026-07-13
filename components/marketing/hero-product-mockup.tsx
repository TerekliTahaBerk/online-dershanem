import { Check, Mic, Video } from "lucide-react";

const participants = ["Öğretmen", "LGS", "YKS", "Soru"];

export function HeroProductMockup() {
  return (
    <div className="relative mx-auto max-w-[1050px]" aria-label="Canlı ders ve takip düzeninin örnek görünümü">
      <div className="overflow-hidden rounded-[24px] border border-[var(--site-line)] bg-white shadow-[0_28px_80px_-58px_rgba(17,19,17,.4)]">
        <div className="flex items-center justify-between border-b border-[var(--site-line)] px-5 py-4">
          <div>
            <p className="text-[13px] font-semibold text-[var(--site-ink)]">Canlı matematik dersi</p>
            <p className="mt-0.5 text-[12px] text-[var(--site-muted)]">Örnek görünüm</p>
          </div>
          <span className="rounded-full bg-[var(--brand-olive-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--brand-olive)]">
            Derste
          </span>
        </div>
        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1.4fr_.6fr]">
          <div className="flex min-h-[310px] flex-col justify-between rounded-[20px] bg-[var(--brand-olive-tint)] p-6 sm:p-8">
            <div>
              <p className="site-kicker">Bugünün konusu</p>
              <p className="mt-3 max-w-xl text-[clamp(1.8rem,4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-.04em] text-[var(--site-ink)]">
                Problemlerde çözüm yolunu birlikte görünür kılmak.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {participants.map((item, index) => (
                <div key={item} className="rounded-[14px] border border-[var(--site-line)] bg-white p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-olive-soft)] text-[11px] font-bold text-[var(--brand-olive)]">
                    {index + 1}
                  </span>
                  <p className="mt-3 text-[12px] font-semibold text-[var(--site-ink)]">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            {["Çözüm adımını göster", "Sorunu aynı derste sor", "Ders sonu yönünü al"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-[16px] border border-[var(--site-line)] p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]">
                  <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                </span>
                <span className="text-[13px] font-medium text-[var(--site-body)]">{item}</span>
              </div>
            ))}
            <div className="mt-auto flex items-center justify-between rounded-[16px] bg-[var(--site-ink)] px-4 py-4 text-white">
              <div>
                <p className="text-[12px] font-semibold">En fazla 4 öğrenci</p>
                <p className="mt-1 text-[11px] text-white/65">60 dakika canlı ders</p>
              </div>
              <div className="flex gap-2" aria-hidden="true">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10"><Mic size={14} /></span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10"><Video size={14} /></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
